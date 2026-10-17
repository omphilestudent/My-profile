// Overworld: tile collision, smooth movement, warps, wild encounters and drawing
(function (R) {
    'use strict';

    const T = R.TILE;
    const MOVE_TIME = 0.16; // seconds to walk one tile
    const SOLID = new Set(['~', '#', 'T', 'H', 'R', 'K', 'C']);
    const TALL = new Set(['T', 'H', 'R', 'K', 'C', '#']);
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

    const world = { map: null, mapId: null, npcs: [], player: null, time: 0 };
    R.world = world;
    R.DIRS = DIRS;

    function entity(x, y, dir) {
        return { x, y, ox: x, oy: y, t: 1, moving: false, dir: dir || 'down', walk: 0 };
    }

    world.tileAt = function (x, y) {
        const m = world.map;
        if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
        return m.rows[y][x];
    };

    world.npcAt = function (x, y, except) {
        return world.npcs.find(n => n !== except && n.x === x && n.y === y) || null;
    };

    function walkable(x, y, mover) {
        const ch = world.tileAt(x, y);
        if (ch === null || SOLID.has(ch)) return false;
        if (world.npcAt(x, y, mover)) return false;
        const p = world.player;
        if (p && p !== mover && p.x === x && p.y === y) return false;
        return true;
    }

    // Start a one-tile step. The tile is claimed straight away; drawing interpolates to it.
    function tryMove(ent, dir) {
        ent.dir = dir;
        if (ent.moving) return false;
        const [dx, dy] = DIRS[dir];
        const nx = ent.x + dx, ny = ent.y + dy;
        if (!walkable(nx, ny, ent)) return false;
        ent.ox = ent.x;
        ent.oy = ent.y;
        ent.x = nx;
        ent.y = ny;
        ent.t = 0;
        ent.moving = true;
        return true;
    }

    function advance(ent, dt) {
        if (!ent.moving) return;
        ent.walk += dt;
        ent.t += dt / MOVE_TIME;
        if (ent.t >= 1) {
            ent.t = 1;
            ent.moving = false;
            if (ent === world.player) world.onPlayerArrive();
        }
    }

    function pos(ent) {
        return {
            x: (ent.ox + (ent.x - ent.ox) * ent.t) * T,
            y: (ent.oy + (ent.y - ent.oy) * ent.t) * T
        };
    }

    world.refreshNpcs = function () {
        world.npcs = world.map.npcs
            .filter(n => !(n.hideIf && R.game.flags[n.hideIf]))
            .map(n => Object.assign(entity(n.x, n.y, n.dir), n, { home: { x: n.x, y: n.y } }));
    };

    world.load = function (mapId, x, y, dir) {
        world.mapId = mapId;
        world.map = R.MAPS[mapId];
        world.player = Object.assign(world.player || {}, entity(x, y, dir));
        world.player.look = R.HERO_LOOK;
        world.refreshNpcs();
    };

    world.onPlayerArrive = function () {
        const p = world.player;

        const warp = world.map.warps.find(w => w.x === p.x && w.y === p.y);
        if (warp) {
            R.game.useWarp(warp, p.ox, p.oy);
            return;
        }

        const dragon = world.npcs.find(n => n.trigger === 'dragon');
        if (dragon && !R.game.flags.dragonDefeated && Math.abs(dragon.x - p.x) + Math.abs(dragon.y - p.y) <= 3) {
            R.game.dragonBattle(dragon);
            return;
        }

        const enc = world.map.encounter;
        if (enc && enc.tiles.includes(world.tileAt(p.x, p.y)) && Math.random() < enc.rate) {
            R.game.wildBattle(enc);
        }
    };

    const pickDir = () => Object.keys(DIRS)[Math.floor(Math.random() * 4)];

    world.update = function (dt) {
        if (!world.map) return;
        world.time += dt;
        const p = world.player;

        advance(p, dt);
        world.npcs.forEach(n => {
            advance(n, dt);
            // Wandering NPCs potter about within two tiles of where they started
            if (n.wander && !n.moving && !R.game.busy && Math.random() < dt * 0.7) {
                const dir = pickDir();
                const [dx, dy] = DIRS[dir];
                if (Math.abs(n.x + dx - n.home.x) <= 2 && Math.abs(n.y + dy - n.home.y) <= 2) tryMove(n, dir);
            }
        });

        if (!p.moving && R.game.canMove() && R.input.dir) tryMove(p, R.input.dir);
    };

    function drawEntity(ctx, ent, q) {
        if (ent.kind === 'sign') return R.Sprites.sign(ctx, q.x, q.y);
        if (ent.emoji) return R.Sprites.emoji(ctx, ent.emoji, q.x, q.y + T - 2, ent.size || 28);
        return R.Sprites.person(ctx, ent.look, q.x, q.y + T - 2, ent.dir, ent.moving, world.time);
    }

    function clampCam(target, worldSize, viewSize) {
        if (worldSize <= viewSize) return (worldSize - viewSize) / 2;
        return Math.max(0, Math.min(worldSize - viewSize, target));
    }

    world.draw = function (ctx) {
        const canvas = ctx.canvas;
        const m = world.map;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#0b0b1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!m) return;

        const p = world.player;
        const viewW = R.VIEW_W * T, viewH = R.VIEW_H * T;
        const pp = pos(p);
        const camX = clampCam(pp.x + T / 2 - viewW / 2, m.w * T, viewW);
        const camY = clampCam(pp.y + T / 2 - viewH / 2, m.h * T, viewH);

        const x0 = Math.max(0, Math.floor(camX / T));
        const x1 = Math.min(m.w - 1, Math.ceil((camX + viewW) / T));
        const y0 = Math.max(0, Math.floor(camY / T));
        const y1 = Math.min(m.h - 1, Math.ceil((camY + viewH) / T));

        ctx.save();
        ctx.translate(-Math.round(camX), -Math.round(camY));

        // Flat ground first
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                R.Sprites.ground(ctx, m.rows[ty][tx], tx, ty, m, world.time);
            }
        }

        // Then everything that stands up, plus the characters, sorted by how far down the screen they stand
        const items = [];
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const ch = m.rows[ty][tx];
                if (TALL.has(ch)) {
                    items.push({ y: (ty + 1) * T, draw: () => R.Sprites.tall(ctx, ch, tx, ty, m) });
                }
            }
        }
        const addEntity = ent => {
            const q = pos(ent);
            items.push({ y: q.y + T, draw: () => drawEntity(ctx, ent, q) });
        };
        world.npcs.forEach(addEntity);
        addEntity(p);
        items.sort((a, b) => a.y - b.y);
        items.forEach(item => item.draw());

        ctx.restore();

        // Soft lighting around the edges gives the scene some depth
        const w = canvas.width, h = canvas.height;
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, m.tint || 'rgba(0, 0, 0, 0.28)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    };
})(window.RPG = window.RPG || {});

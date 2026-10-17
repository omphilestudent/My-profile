// Procedural pixel-style art for the Dragon Repeller world (no image files needed)
(function (R) {
    'use strict';

    const T = R.TILE;

    const C = {
        grass: '#7bd35f', grassDark: '#5fb446', grassLight: '#9be677',
        path: '#e9cc8f', pathDark: '#d2ad65',
        water: '#3d9be9', waterLight: '#9bdcff',
        wood: '#c99a5b', woodDark: '#a0743e', wall: '#6b4a2b',
        carpet: '#b33a4a', gold: '#f5c451',
        cave: '#6b6470', caveDark: '#4e4855',
        rock: '#8b8fa0', rockDark: '#5b5f70', rockLight: '#b4b8c8',
        roof: '#b23b3b', roofDark: '#7f2323',
        brick: '#e0a46c', brickDark: '#b77c4a', glass: '#bfe6ff', frame: '#3b2a1a',
        trunk: '#7a4a24', canopy: '#2f8f3b', canopyDark: '#1d6428', canopyLight: '#5cc66a',
        counter: '#8a5a2b', counterTop: '#c08a4d',
        door: '#7a4a24', doorFrame: '#4a2a12',
        flowers: ['#ff6b9a', '#ffe066', '#ffffff']
    };

    // Deterministic 0..1 value for a tile, so the scenery never flickers
    function hash(a, b, n) {
        let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul((n || 0) + 1, 2246822519);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }

    function rect(ctx, color, x, y, w, h) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    function circle(ctx, color, x, y, r) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function shade(hex, amount) {
        const n = parseInt(hex.slice(1), 16);
        const ch = v => Math.max(0, Math.min(255, v + amount));
        return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
    }

    // ---- Ground ----

    function grass(ctx, x, y, tx, ty) {
        rect(ctx, C.grass, x, y, T, T);
        for (let i = 0; i < 5; i++) {
            rect(ctx, C.grassDark,
                x + Math.floor(hash(tx, ty, i) * (T - 3)),
                y + Math.floor(hash(tx, ty, i + 10) * (T - 3)), 2, 2);
        }
    }

    function path(ctx, x, y, tx, ty) {
        rect(ctx, C.path, x, y, T, T);
        for (let i = 0; i < 4; i++) {
            rect(ctx, C.pathDark,
                x + 2 + Math.floor(hash(tx, ty, i) * 26),
                y + 2 + Math.floor(hash(ty, tx, i + 5) * 26), 3, 2);
        }
    }

    function wood(ctx, x, y) {
        rect(ctx, C.wood, x, y, T, T);
        for (let i = 0; i < 4; i++) rect(ctx, C.woodDark, x, y + i * 8 + 7, T, 1);
    }

    function carpet(ctx, x, y) {
        rect(ctx, C.carpet, x, y, T, T);
        rect(ctx, C.gold, x + 2, y + 2, T - 4, 1);
        rect(ctx, C.gold, x + 2, y + T - 3, T - 4, 1);
        rect(ctx, C.gold, x + 2, y + 2, 1, T - 4);
        rect(ctx, C.gold, x + T - 3, y + 2, 1, T - 4);
    }

    function cave(ctx, x, y, tx, ty) {
        rect(ctx, C.cave, x, y, T, T);
        for (let i = 0; i < 4; i++) {
            rect(ctx, C.caveDark,
                x + 2 + Math.floor(hash(tx, ty, i + 3) * 26),
                y + 2 + Math.floor(hash(tx, ty, i + 7) * 26), 3, 3);
        }
    }

    function floorOf(map) {
        if (map.ground === 'wood') return wood;
        if (map.ground === 'carpet') return carpet;
        if (map.ground === 'cave') return cave;
        return grass;
    }

    function water(ctx, x, y, tx, time) {
        rect(ctx, C.water, x, y, T, T);
        ctx.fillStyle = C.waterLight;
        for (let i = 0; i < 2; i++) {
            const wy = y + 9 + i * 12 + Math.sin(time * 2 + tx + i) * 1.5;
            const wx = x + 4 + ((time * 8 + i * 13 + tx * 5) % 22);
            ctx.fillRect(Math.round(wx), Math.round(wy), 7, 2);
        }
    }

    function tallGrass(ctx, x, y, tx, ty, time) {
        grass(ctx, x, y, tx, ty);
        for (let i = 0; i < 5; i++) {
            const bx = x + 3 + i * 6 + hash(tx, ty, i + 20) * 2;
            const sway = Math.sin(time * 2.5 + i + hash(tx, ty, 30) * 6) * 2;
            ctx.fillStyle = i % 2 ? C.grassLight : C.grassDark;
            ctx.beginPath();
            ctx.moveTo(bx, y + T);
            ctx.lineTo(bx + sway, y + T - 13);
            ctx.lineTo(bx + 3, y + T);
            ctx.fill();
        }
    }

    function flowers(ctx, x, y, tx, ty) {
        grass(ctx, x, y, tx, ty);
        for (let i = 0; i < 3; i++) {
            rect(ctx, C.flowers[i], x + 4 + Math.floor(hash(tx, ty, i + 40) * 22),
                y + 4 + Math.floor(hash(ty, tx, i + 50) * 22), 3, 3);
        }
    }

    function door(ctx, x, y) {
        rect(ctx, C.doorFrame, x + 5, y + 3, 22, 29);
        rect(ctx, C.door, x + 7, y + 5, 18, 27);
        circle(ctx, C.gold, x + 21, y + 19, 2);
    }

    // ---- Tall objects (drawn in the y-sorted pass so the player can walk behind them) ----

    function tree(ctx, x, y) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 29, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        rect(ctx, C.trunk, x + 13, y + 18, 6, 12);
        circle(ctx, C.canopyDark, x + 16, y + 13, 14);
        circle(ctx, C.canopy, x + 14, y + 10, 10);
        circle(ctx, C.canopyLight, x + 10, y + 7, 4);
    }

    function house(ctx, x, y, tx, ty) {
        rect(ctx, C.brick, x, y, T, T);
        for (let i = 0; i < 4; i++) rect(ctx, C.brickDark, x, y + i * 8 + 7, T, 1);
        const offset = ty % 2 ? 0 : 8;
        rect(ctx, C.brickDark, x + offset, y, 1, 8);
        rect(ctx, C.brickDark, x + offset + 16, y + 8, 1, 8);
        rect(ctx, C.brickDark, x + offset + 16, y + 24, 1, 8);
        if (hash(tx, ty, 3) > 0.45) {
            rect(ctx, C.frame, x + 8, y + 10, 16, 14);
            rect(ctx, C.glass, x + 10, y + 12, 12, 10);
            rect(ctx, C.frame, x + 15, y + 12, 2, 10);
        }
    }

    function roof(ctx, x, y) {
        rect(ctx, C.roof, x, y, T, T);
        for (let i = 0; i < 4; i++) rect(ctx, C.roofDark, x, y + i * 8, T, 2);
        rect(ctx, C.roofDark, x, y + T - 3, T, 3);
    }

    function rock(ctx, x, y) {
        rect(ctx, C.rockDark, x, y, T, T);
        circle(ctx, C.rock, x + 16, y + 14, 13);
        circle(ctx, C.rockLight, x + 12, y + 9, 4);
    }

    function wall(ctx, x, y) {
        rect(ctx, C.wall, x, y, T, T);
        rect(ctx, shade(C.wall, 30), x, y, T, 3);
        for (let i = 0; i < 3; i++) rect(ctx, shade(C.wall, -25), x, y + 8 + i * 8, T, 1);
    }

    function counter(ctx, x, y) {
        rect(ctx, C.counter, x, y + 8, T, T - 8);
        rect(ctx, C.counterTop, x, y + 4, T, 6);
        rect(ctx, shade(C.counterTop, -30), x, y + 10, T, 1);
    }

    // ---- Characters and props ----

    function person(ctx, look, x, feetY, dir, moving, time) {
        const cx = x + T / 2;
        const step = moving ? Math.sin(time * 18) : 0;
        const lift = Math.round(Math.abs(step) * 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, feetY, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs swing while walking
        rect(ctx, look.pants, cx - 6, feetY - 8 - (step > 0 ? 0 : lift), 5, 8);
        rect(ctx, look.pants, cx + 1, feetY - 8 - (step > 0 ? lift : 0), 5, 8);

        // Body, with the right side in shadow for depth
        rect(ctx, look.shirt, cx - 7, feetY - 21, 14, 13);
        rect(ctx, shade(look.shirt, -35), cx + 3, feetY - 21, 4, 13);

        // Arms swing opposite to the legs
        rect(ctx, look.shirt, cx - 10, feetY - 20 - Math.round(step * 2), 3, 9);
        rect(ctx, look.shirt, cx + 7, feetY - 20 + Math.round(step * 2), 3, 9);

        // Head and hair
        const hy = feetY - 25;
        circle(ctx, look.skin, cx, hy, 6);
        ctx.fillStyle = look.hair;
        ctx.beginPath();
        if (dir === 'up') ctx.arc(cx, hy, 6.5, 0, Math.PI * 2);
        else ctx.arc(cx, hy, 6.5, Math.PI, 0);
        ctx.fill();

        if (dir !== 'up') {
            const eyes = dir === 'down' ? [-2.5, 2.5] : dir === 'left' ? [-3] : [3];
            eyes.forEach(ox => rect(ctx, '#111827', cx + ox - 1, hy - 1, 2, 2));
        }

        if (look.hat) {
            rect(ctx, look.hat, cx - 7, feetY - 35, 14, 5);
            rect(ctx, shade(look.hat, -40), cx - 9, feetY - 31, 18, 2);
        }
    }

    function emoji(ctx, ch, x, feetY, size) {
        const cx = x + T / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, feetY, size * 0.4, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000';
        ctx.fillText(ch, cx, feetY - 2);
    }

    function sign(ctx, x, y) {
        rect(ctx, '#5a3a1e', x + 15, y + 16, 3, 14);
        rect(ctx, C.wood, x + 6, y + 6, 20, 12);
        rect(ctx, C.woodDark, x + 6, y + 17, 20, 1);
        rect(ctx, '#5a3a1e', x + 9, y + 10, 14, 1);
        rect(ctx, '#5a3a1e', x + 9, y + 13, 10, 1);
    }

    R.Sprites = {
        // Flat ground under each tile
        ground(ctx, ch, tx, ty, map, time) {
            const x = tx * T, y = ty * T;
            switch (ch) {
                case ',': return path(ctx, x, y, tx, ty);
                case '~': return water(ctx, x, y, tx, time);
                case 'G': return tallGrass(ctx, x, y, tx, ty, time);
                case 'f': return flowers(ctx, x, y, tx, ty);
                case 'c': return cave(ctx, x, y, tx, ty);
                case 'L': return carpet(ctx, x, y);
                case 'D':
                    (map.ground === 'grass' ? path : floorOf(map))(ctx, x, y, tx, ty);
                    return door(ctx, x, y);
                case '.':
                case 'C':
                case 'K':
                    return floorOf(map)(ctx, x, y, tx, ty);
                default:
                    return grass(ctx, x, y, tx, ty);
            }
        },

        // Solid objects that stand up from the ground
        tall(ctx, ch, tx, ty) {
            const x = tx * T, y = ty * T;
            switch (ch) {
                case 'T': return tree(ctx, x, y);
                case 'H': return house(ctx, x, y, tx, ty);
                case 'R': return roof(ctx, x, y);
                case 'K': return rock(ctx, x, y);
                case '#': return wall(ctx, x, y);
                case 'C': return counter(ctx, x, y);
            }
        },

        person,
        emoji,
        sign
    };
})(window.RPG = window.RPG || {});

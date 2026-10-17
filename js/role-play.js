// Dragon Repeller: game state, shops, saving, input and the main loop
(function (R) {
    'use strict';

    const $ = id => document.getElementById(id);
    const SAVE_KEY = 'dragonRepeller.save.v2';
    const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const DIR_KEYS = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right'
    };
    const ACTION_KEYS = new Set([' ', 'Enter', 'z', 'Z']);
    const MENU_KEYS = new Set(['x', 'X', 'Escape']);
    const held = [];

    const canvas = $('world');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const game = R.game = { hero: null, party: [], bag: {}, flags: {}, mapId: 'town', busy: false, inBattle: false };
    R.input = { dir: null };

    game.canMove = () => !game.busy && !game.inBattle && R.keyStack.length === 0;

    const weighted = table => {
        const total = table.reduce((s, e) => s + e.w, 0);
        let roll = Math.random() * total;
        for (const entry of table) {
            roll -= entry.w;
            if (roll < 0) return entry;
        }
        return table[0];
    };

    function newHero() {
        return {
            hero: true, name: 'Hero', emoji: '🤺', level: 1, xp: 0,
            hp: 100, maxHp: 100, gold: 50, weapon: 'stick', weapons: ['stick']
        };
    }

    function newBag() {
        return { potion: 2, superPotion: 0, orb: 0 };
    }

    function healAll() {
        game.hero.hp = game.hero.maxHp;
        game.party.forEach(m => { m.hp = m.maxHp; });
    }

    async function changeMap(mapId, x, y, dir = 'down', fade = true) {
        game.busy = true;
        if (fade) await R.ui.fade(true);
        game.mapId = mapId;
        R.world.load(mapId, x, y, dir);
        R.ui.setLocation(R.MAPS[mapId].title);
        R.ui.updateHud();
        if (fade) await R.ui.fade(false);
        game.busy = false;
    }

    // Stepping onto a door or road exit. Refused warps push the hero back to where they came from.
    game.useWarp = async function (warp, fromX, fromY) {
        const p = R.world.player;
        if (warp.need && game.hero.level < warp.need.level) {
            p.x = fromX; p.y = fromY; p.ox = fromX; p.oy = fromY;
            await R.say(warp.need.message);
            return;
        }
        await changeMap(warp.to, warp.tx, warp.ty, 'down');
    };

    async function blackout() {
        const lost = Math.floor(game.hero.gold / 2);
        game.hero.gold -= lost;
        healAll();
        const town = R.MAPS.town.start;
        await R.say([
            'You black out... Monsters drag you back to town.',
            lost ? `You dropped ${lost} gold.` : 'Luckily, you had no gold to lose.'
        ]);
        await changeMap('town', town.x, town.y, 'down');
    }

    game.wildBattle = async function (enc) {
        game.busy = true;
        game.inBattle = true;
        const pick = weighted(enc.table);
        const enemy = R.createMonster(pick.key, R.randInt(pick.lv[0], pick.lv[1]));
        const result = await R.Battle.run(enemy);
        if (result === 'lost') await blackout();
        game.inBattle = false;
        game.busy = false;
    };

    game.dragonBattle = async function (npc) {
        game.busy = true;
        game.inBattle = true;
        const dragon = R.createMonster('dragon', 20);
        const result = await R.Battle.run(dragon, { boss: true, intro: npc.lines, speaker: npc.name });
        if (result === 'won') {
            game.flags.dragonDefeated = true;
            R.world.refreshNpcs();
            await R.say([
                'The dragon roars one last time and crashes to the ground.',
                'Dragonvale is safe at last! You repelled the dragon!'
            ]);
            Fun.launchConfetti(160);
        } else if (result === 'lost') {
            await blackout();
        }
        game.inBattle = false;
        game.busy = false;
    };

    // ---- Shops and people ----

    async function shop() {
        const hero = game.hero;
        await R.say(['Welcome to the shop! What can I get you?'], { speaker: 'Shopkeeper' });
        for (;;) {
            const current = R.WEAPONS[hero.weapon].power;
            const items = R.STORE_STOCK.map(key => {
                const isWeapon = !!R.WEAPONS[key];
                const item = isWeapon ? R.WEAPONS[key] : R.ITEMS[key];
                const owned = isWeapon && hero.weapons.includes(key);
                const weaker = isWeapon && item.power <= current;
                const label = owned || weaker && isWeapon
                    ? `${item.name} — owned`
                    : `${item.name} — ${item.price}g`;
                return { label, key, disabled: (isWeapon && (owned || weaker)) || hero.gold < item.price };
            });
            items.push({ label: 'Leave' });

            const i = await R.choose(items, { title: `Item Shop · ${hero.gold}g` });
            if (i === null || i === items.length - 1) break;

            const key = items[i].key;
            if (R.WEAPONS[key]) {
                hero.gold -= R.WEAPONS[key].price;
                hero.weapons.push(key);
                hero.weapon = key;
                await R.say(`You bought a ${R.WEAPONS[key].name} and equipped it!`);
            } else {
                hero.gold -= R.ITEMS[key].price;
                game.bag[key] = (game.bag[key] || 0) + 1;
                await R.say(`You bought a ${R.ITEMS[key].name}.`);
            }
        }
        await R.say('Come back soon!', { speaker: 'Shopkeeper' });
    }

    async function inn() {
        const hero = game.hero;
        await R.say(['Welcome to the inn! Rest up and your monsters will be fully healed.'], { speaker: 'Innkeeper' });
        const pick = await R.choose([{ label: 'Yes — 5 gold' }, { label: 'No thanks' }], {
            title: 'Rest for the night?'
        });
        if (pick !== 0) return;
        if (hero.gold < 5) {
            await R.say("You don't have enough gold for a room.", { speaker: 'Innkeeper' });
            return;
        }
        hero.gold -= 5;
        healAll();
        await R.say('Sleep well! You and your monsters feel refreshed.', { speaker: 'Innkeeper' });
    }

    async function trader(npc) {
        const hero = game.hero;
        await R.say(['Welcome! Monsters for sale. They fight beside you once they join.'], { speaker: npc.name });
        for (;;) {
            const keys = Object.keys(R.TRADER_STOCK);
            const items = keys.map(key => {
                const m = R.MONSTERS[key], price = R.TRADER_STOCK[key];
                return { label: `${m.emoji} ${m.name} (Lv ${m.level}) — ${price}g`, key, price, disabled: hero.gold < price };
            });
            items.push({ label: 'Leave' });

            const i = await R.choose(items, { title: `Monster Trader · ${hero.gold}g` });
            if (i === null || i === items.length - 1) break;

            if (game.party.length >= R.MAX_PARTY) {
                await R.say(`Your party is full (${R.MAX_PARTY}/${R.MAX_PARTY}). Heal or leave one behind first.`, { speaker: npc.name });
                continue;
            }
            const { key, price } = items[i];
            hero.gold -= price;
            const m = R.createMonster(key, R.MONSTERS[key].level);
            game.party.push(m);
            await R.say(`${m.name} joined your party!`, { speaker: npc.name });
        }
        await R.say('Pleasure doing business!', { speaker: npc.name });
    }

    async function elder(npc) {
        if (game.flags.elderGift) {
            await R.say(npc.repeat, { speaker: npc.name });
            return;
        }
        game.flags.elderGift = true;
        game.bag.orb = (game.bag.orb || 0) + 2;
        await R.say(npc.lines, { speaker: npc.name });
        await R.say('You received 2 Capture Orbs!', { speaker: npc.name });
    }

    async function talk(npc) {
        if (npc.action === 'elder') return elder(npc);
        if (npc.action === 'trader') return trader(npc);
        if (npc.action === 'shopkeeper') return shop();
        if (npc.action === 'innkeeper') return inn();
        return R.say(npc.lines || ['...'], { speaker: npc.name });
    }

    game.interact = async function () {
        if (!game.canMove()) return;
        const p = R.world.player;
        const [dx, dy] = R.DIRS[p.dir];
        const x = p.x + dx, y = p.y + dy;
        const npc = R.world.npcAt(x, y);

        game.busy = true;
        try {
            if (npc) {
                npc.dir = OPPOSITE[p.dir];
                await talk(npc);
            } else if (R.world.tileAt(x, y) === 'C') {
                if (R.world.map.counter === 'inn') await inn();
                else await shop();
            }
        } finally {
            game.busy = false;
        }
    };

    // ---- Menu ----

    async function partyView() {
        if (!game.party.length) {
            await R.say('You have no monsters yet. Buy one from the Monster Trader in town, or tame one in battle with a Capture Orb.');
            return;
        }
        const i = await R.choose(
            game.party.map(m => ({ label: `${m.emoji} ${m.name}  Lv ${m.level}  HP ${m.hp}/${m.maxHp}` })).concat([{ label: 'Back' }]),
            { title: 'Your monsters' }
        );
        if (i === null || i === game.party.length) return;
        const m = game.party[i];
        await R.say([`${m.emoji} ${m.name} — Level ${m.level}`, `ATK ${m.atk}   DEF ${m.def}   XP ${m.xp}`, `Special move: ${m.move}`]);
    }

    async function bagView() {
        const keys = Object.keys(R.ITEMS);
        const i = await R.choose(
            keys.map(k => ({
                label: `${R.ITEMS[k].emoji} ${R.ITEMS[k].name} x${game.bag[k] || 0}${R.ITEMS[k].heal ? '' : ' (battle only)'}`,
                disabled: !R.ITEMS[k].heal || !game.bag[k]
            })).concat([{ label: 'Back' }]),
            { title: 'Bag' }
        );
        if (i === null || i === keys.length) return;
        const key = keys[i], item = R.ITEMS[key], hero = game.hero;
        if (hero.hp >= hero.maxHp) {
            await R.say('You are already at full health.');
            return;
        }
        game.bag[key] -= 1;
        const before = hero.hp;
        hero.hp = Math.min(hero.maxHp, hero.hp + item.heal);
        R.ui.updateHud();
        await R.say(`You used a ${item.name}. Restored ${hero.hp - before} HP.`);
    }

    async function heroView() {
        const hero = game.hero;
        const weapon = R.WEAPONS[hero.weapon];
        await R.say([
            `Hero — Level ${hero.level}`,
            `HP ${hero.hp}/${hero.maxHp}   XP ${hero.xp}/${hero.level * 25}   Gold ${hero.gold}`,
            `Weapon: ${weapon.name} (power ${weapon.power})`,
            `Monsters: ${game.party.length}/${R.MAX_PARTY}`,
            game.flags.dragonDefeated ? 'The dragon has been defeated. Dragonvale is safe!' : 'Quest: defeat the dragon in the lair (level 3 required).'
        ]);
    }

    function writeSave(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    function readSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    async function saveGame() {
        const p = R.world.player;
        const ok = writeSave({
            mapId: game.mapId, x: p.x, y: p.y, dir: p.dir,
            hero: game.hero, party: game.party, bag: game.bag, flags: game.flags
        });
        await R.say(ok ? 'Game saved! Choose Continue next time you visit.' : 'Sorry, this browser would not let me save the game.');
    }

    game.openMenu = async function () {
        if (!game.canMove()) return;
        game.busy = true;
        try {
            for (;;) {
                const i = await R.choose([
                    { label: '👾 Monsters' },
                    { label: '🎒 Bag' },
                    { label: '🤺 Hero' },
                    { label: '💾 Save game' },
                    { label: '✖ Close' }
                ], { title: 'Menu' });
                if (i === null || i === 4) break;
                if (i === 0) await partyView();
                else if (i === 1) await bagView();
                else if (i === 2) await heroView();
                else await saveGame();
            }
        } finally {
            game.busy = false;
        }
    };

    // ---- Input ----

    function refreshDir() {
        R.input.dir = held.length ? held[held.length - 1] : null;
    }

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // A dialog or menu is open: it gets the keys
        if (R.keyStack.length) {
            if (DIR_KEYS[e.key] || ACTION_KEYS.has(e.key) || MENU_KEYS.has(e.key)) e.preventDefault();
            R.keyStack[R.keyStack.length - 1](e);
            return;
        }

        const dir = DIR_KEYS[e.key];
        if (dir) {
            e.preventDefault();
            if (!held.includes(dir)) held.push(dir);
            refreshDir();
        } else if (ACTION_KEYS.has(e.key)) {
            e.preventDefault();
            if (!e.repeat) game.interact();
        } else if (MENU_KEYS.has(e.key)) {
            e.preventDefault();
            if (!e.repeat) game.openMenu();
        }
    });

    window.addEventListener('keyup', (e) => {
        const dir = DIR_KEYS[e.key];
        if (!dir) return;
        const i = held.indexOf(dir);
        if (i >= 0) held.splice(i, 1);
        refreshDir();
    });

    window.addEventListener('blur', () => {
        held.length = 0;
        refreshDir();
    });

    // On-screen buttons for phones and tablets: they send the same keys
    document.querySelectorAll('[data-key]').forEach(btn => {
        const key = btn.dataset.key;
        const release = () => window.dispatchEvent(new KeyboardEvent('keyup', { key }));
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointerleave', release);
        btn.addEventListener('pointercancel', release);
    });

    // ---- Start-up and loop ----

    async function boot() {
        // A default world sits behind the title screen
        game.hero = newHero();
        game.bag = newBag();
        game.party = [];
        game.flags = {};
        const town = R.MAPS.town.start;
        R.world.load('town', town.x, town.y, 'down');
        R.ui.setLocation(R.MAPS.town.title);
        R.ui.updateHud();

        const save = readSave();
        const pick = await R.choose([
            { label: '🗡️ New Adventure' },
            { label: '💾 Continue', disabled: !save }
        ], { title: 'DRAGON REPELLER', cancelable: false });

        if (pick === 1 && save) {
            game.hero = save.hero;
            game.hero.weapons = game.hero.weapons || [game.hero.weapon];
            game.party = save.party || [];
            game.bag = save.bag || newBag();
            game.flags = save.flags || {};
            await changeMap(save.mapId, save.x, save.y, save.dir || 'down', false);
        } else {
            await R.say([
                'Welcome to Dragonvale!',
                'A dragon has settled in the cave beyond the forest. Explore, buy supplies, tame monsters and get strong enough to face it.',
                'Move with the arrow keys or WASD. Press Space to talk and X for the menu.'
            ]);
        }
        R.ui.updateHud();
    }

    let last = performance.now();
    let hudTimer = 0;

    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        R.world.update(dt);
        R.world.draw(ctx);
        hudTimer += dt;
        if (hudTimer > 0.25) {
            hudTimer = 0;
            R.ui.updateHud();
        }
        requestAnimationFrame(frame);
    }

    // Start the loop first so the world is visible behind the title
    R.world.load('town', R.MAPS.town.start.x, R.MAPS.town.start.y, 'down');
    requestAnimationFrame(frame);
    boot();
})(window.RPG = window.RPG || {});

// Dragon Repeller world data: monsters, items, shops and maps
(function (R) {
    'use strict';

    R.TILE = 32;
    R.VIEW_W = 16;
    R.VIEW_H = 12;
    R.MAX_PARTY = 3;

    // Base stats; wild and tamed monsters are scaled from these by level
    R.MONSTERS = {
        slime:  { name: 'Slime',        emoji: '🟢', level: 2,  hp: 15,  atk: 4,  def: 0,  move: 'Goo Splat' },
        bat:    { name: 'Cave Bat',     emoji: '🦇', level: 4,  hp: 20,  atk: 6,  def: 1,  move: 'Screech' },
        pixie:  { name: 'Pixie',        emoji: '🧚', level: 6,  hp: 26,  atk: 7,  def: 2,  move: 'Sparkle' },
        beast:  { name: 'Fanged Beast', emoji: '🐺', level: 8,  hp: 60,  atk: 12, def: 3,  move: 'Bite' },
        golem:  { name: 'Rock Golem',   emoji: '🗿', level: 12, hp: 110, atk: 16, def: 8,  move: 'Stone Slam' },
        dragon: { name: 'Dragon',       emoji: '🐉', level: 20, hp: 240, atk: 20, def: 10, move: 'Fire Breath', boss: true }
    };

    R.WEAPONS = {
        stick:  { name: 'Stick',       power: 4,  price: 0 },
        dagger: { name: 'Dagger',      power: 9,  price: 30 },
        hammer: { name: 'Claw Hammer', power: 14, price: 60 },
        sword:  { name: 'Sword',       power: 20, price: 90 }
    };

    R.ITEMS = {
        potion:      { name: 'Potion',       emoji: '🧪', heal: 20, price: 10 },
        superPotion: { name: 'Super Potion', emoji: '⚗️', heal: 50, price: 25 },
        orb:         { name: 'Capture Orb',  emoji: '🔮', price: 25 }
    };

    R.STORE_STOCK = ['potion', 'superPotion', 'orb', 'dagger', 'hammer', 'sword'];
    // Monsters for sale at the Monster Trader, with prices
    R.TRADER_STOCK = { slime: 40, bat: 60, pixie: 90, beast: 150 };

    R.HERO_LOOK = { skin: '#f1c27d', hair: '#3b2314', shirt: '#2563eb', pants: '#1e293b', hat: '#dc2626' };

    function rng(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function setTile(rows, x, y, ch) {
        const row = rows[y];
        rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
    }

    // Whispering Forest: a seeded layout with a road from town and a cave door in the south
    function buildForest() {
        const W = 28, H = 20;
        const rand = rng(7);
        const road = new Set();
        const key = (x, y) => x + ',' + y;
        for (let y = 1; y <= 9; y++) { road.add(key(11, y)); road.add(key(12, y)); }
        for (let x = 11; x <= 21; x++) { road.add(key(x, 9)); road.add(key(x, 10)); }
        for (let y = 10; y <= 18; y++) road.add(key(21, y));

        const inBox = (x, y, [x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;
        const tallZones = [[2, 11, 6, 14], [15, 3, 20, 5], [14, 13, 19, 16]];
        const lake = [3, 3, 7, 6];
        const mountain = [23, 2, 26, 4];

        const rows = [];
        for (let y = 0; y < H; y++) {
            let row = '';
            for (let x = 0; x < W; x++) {
                let c;
                if (y === 0) c = (x === 11 || x === 12) ? ',' : 'T';
                else if (y === H - 1) c = x === 21 ? 'D' : 'K';
                else if (x === 0 || x === W - 1) c = 'T';
                else if (road.has(key(x, y))) c = ',';
                else if (inBox(x, y, lake)) c = '~';
                else if (inBox(x, y, mountain)) c = 'K';
                else if (tallZones.some(z => inBox(x, y, z))) c = rand() < 0.85 ? 'G' : '.';
                else {
                    const r = rand();
                    c = r < 0.13 ? 'T' : r < 0.19 ? 'f' : '.';
                }
                row += c;
            }
            rows.push(row);
        }
        setTile(rows, 17, 7, '.');
        setTile(rows, 14, 2, '.');
        return rows;
    }

    // Dragon Cave: a hall with a few pillars, a door back out and a door up to the lair
    function buildCave() {
        const W = 20, H = 16;
        const rand = rng(42);
        const rows = [];
        for (let y = 0; y < H; y++) {
            let row = '';
            for (let x = 0; x < W; x++) {
                let c = 'K';
                if (y === 1 || y === H - 1) c = x === 10 ? 'D' : 'K';
                else if (x >= 2 && x <= 17 && y >= 2 && y <= 14) {
                    c = (x !== 10 && y > 3 && rand() < 0.12) ? 'K' : 'c';
                }
                row += c;
            }
            rows.push(row);
        }
        setTile(rows, 4, 6, 'c');
        return rows;
    }

    // Dragon Lair: a carpeted room with pillars and the dragon at the far end
    function buildLair() {
        const W = 14, H = 12;
        const pillars = [[3, 3], [10, 3], [3, 8], [10, 8]];
        const rows = [];
        for (let y = 0; y < H; y++) {
            let row = '';
            for (let x = 0; x < W; x++) {
                let c = 'L';
                if (y === 0 || x === 0 || x === W - 1 || y === H - 1) c = 'K';
                if (y === H - 1 && x === 6) c = 'D';
                if (pillars.some(([px, py]) => px === x && py === y)) c = 'K';
                row += c;
            }
            rows.push(row);
        }
        return rows;
    }

    const forestRows = buildForest();
    const caveRows = buildCave();

    R.MAPS = {
        town: {
            title: 'Dragonvale Town',
            ground: 'grass',
            rows: [
                'TTTTTTTTTTTTTTTTTTTTTTTT',
                'T......................T',
                'T..RRRRR......RRRRRR...T',
                'T..RRRRR......RRRRRR...T',
                'T..HHHHH......HHHHHH...T',
                'T..HHDHH......HHDHHH...T',
                'T....,,,,,,,,,,,,......T',
                'T......................T',
                'T........~~~~..........T',
                'T........~~~~..........T',
                'T........~~~~..........T',
                'T......................T',
                'T.........f....f.......T',
                'T......................T',
                'T..........,,..........T',
                'T..........,,..........T',
                'T..........,,..........T',
                'TTTTTTTTTTT,,TTTTTTTTTTT'
            ],
            npcs: [
                {
                    id: 'elder', name: 'Elder Mara', x: 3, y: 11, dir: 'right', action: 'elder',
                    look: { skin: '#f1c27d', hair: '#e5e7eb', shirt: '#7c3aed', pants: '#4c1d95' },
                    lines: [
                        'Welcome, traveler. A dragon has taken the lair beyond the forest cave.',
                        'Our people cannot leave Dragonvale while it roams. You will need strength, friends and supplies.',
                        'Take these orbs. Tame the monsters you meet and they will fight beside you.'
                    ],
                    repeat: ['Reach level 3 before you face the dragon. Its fire will burn through an unprepared hero.']
                },
                {
                    id: 'trader', name: 'Monster Trader', x: 19, y: 11, dir: 'left', action: 'trader',
                    look: { skin: '#c68642', hair: '#111827', shirt: '#16a34a', pants: '#365314', hat: '#facc15' }
                },
                {
                    id: 'kid', name: 'Pip', x: 8, y: 13, dir: 'down', wander: true,
                    look: { skin: '#f1c27d', hair: '#f59e0b', shirt: '#f472b6', pants: '#1e3a8a' },
                    lines: ['Ooh, a traveler! Be careful in the tall grass. Monsters hide in there!']
                },
                {
                    id: 'sign', name: 'Sign', x: 9, y: 16, kind: 'sign',
                    lines: ['Whispering Forest ↓', 'Watch out for monsters in the tall grass!']
                }
            ],
            warps: [
                { x: 5, y: 5, to: 'shop', tx: 5, ty: 6 },
                { x: 16, y: 5, to: 'inn', tx: 5, ty: 6 },
                { x: 11, y: 17, to: 'forest', tx: 11, ty: 1 },
                { x: 12, y: 17, to: 'forest', tx: 12, ty: 1 }
            ],
            start: { x: 12, y: 12 },
            encounter: null
        },

        shop: {
            title: 'Item Shop',
            ground: 'wood',
            counter: 'shop',
            rows: [
                '###########',
                '#.........#',
                '#.........#',
                '#CCCCCCCCC#',
                '#.........#',
                '#.........#',
                '#.........#',
                '#####D#####'
            ],
            npcs: [
                {
                    id: 'shopkeeper', name: 'Shopkeeper', x: 5, y: 2, dir: 'down', action: 'shopkeeper',
                    look: { skin: '#ffdbac', hair: '#7c2d12', shirt: '#f97316', pants: '#292524' }
                }
            ],
            warps: [{ x: 5, y: 7, to: 'town', tx: 5, ty: 6 }],
            start: { x: 5, y: 6 },
            encounter: null
        },

        inn: {
            title: 'The Sleepy Dragon Inn',
            ground: 'carpet',
            counter: 'inn',
            rows: [
                '###########',
                '#.........#',
                '#.........#',
                '#CCCCCCCCC#',
                '#.........#',
                '#.........#',
                '#.........#',
                '#####D#####'
            ],
            npcs: [
                {
                    id: 'innkeeper', name: 'Innkeeper', x: 5, y: 2, dir: 'down', action: 'innkeeper',
                    look: { skin: '#e0ac69', hair: '#1f2937', shirt: '#be123c', pants: '#1f2937' }
                }
            ],
            warps: [{ x: 5, y: 7, to: 'town', tx: 16, ty: 6 }],
            start: { x: 5, y: 6 },
            encounter: null
        },

        forest: {
            title: 'Whispering Forest',
            ground: 'grass',
            rows: forestRows,
            npcs: [
                {
                    id: 'traveler', name: 'Traveler', x: 17, y: 7, dir: 'left',
                    look: { skin: '#8d5524', hair: '#0f172a', shirt: '#0d9488', pants: '#422006', hat: '#78716c' },
                    lines: [
                        'The forest is full of wild monsters. Walk through the tall grass to find them.',
                        'A cave to the south leads under the mountain, and the dragon\'s lair lies beyond it.'
                    ]
                },
                {
                    id: 'sign', name: 'Sign', x: 14, y: 2, kind: 'sign',
                    lines: ['Dragonvale Road ↑', 'Dragon Cave ↓   (Level 3 recommended)']
                }
            ],
            warps: [
                { x: 11, y: 0, to: 'town', tx: 11, ty: 16 },
                { x: 12, y: 0, to: 'town', tx: 12, ty: 16 },
                { x: 21, y: 19, to: 'cave', tx: 10, ty: 14 }
            ],
            start: { x: 11, y: 1 },
            encounter: {
                rate: 0.12,
                tiles: ['G'],
                table: [
                    { key: 'slime', lv: [2, 4], w: 50 },
                    { key: 'bat', lv: [3, 5], w: 30 },
                    { key: 'beast', lv: [4, 6], w: 20 }
                ]
            }
        },

        cave: {
            title: 'Dragon Cave',
            ground: 'cave',
            tint: 'rgba(10, 6, 25, 0.55)',
            rows: caveRows,
            npcs: [
                {
                    id: 'miner', name: 'Miner Bo', x: 4, y: 6, dir: 'right',
                    look: { skin: '#f1c27d', hair: '#78350f', shirt: '#64748b', pants: '#334155', hat: '#facc15' },
                    lines: [
                        'Careful in here! The bats are sharp and the golems are tough.',
                        'The lair is north of the hall. Only go up there when you are ready.'
                    ]
                }
            ],
            warps: [
                { x: 10, y: 15, to: 'forest', tx: 21, ty: 18 },
                {
                    x: 10, y: 1, to: 'lair', tx: 6, ty: 10,
                    need: {
                        level: 3,
                        message: [
                            'Heat rolls out of the lair. You can feel the dragon\'s fire from here...',
                            'Come back when you are level 3 or stronger.'
                        ]
                    }
                }
            ],
            start: { x: 10, y: 14 },
            encounter: {
                rate: 0.09,
                tiles: ['c'],
                table: [
                    { key: 'bat', lv: [5, 8], w: 45 },
                    { key: 'beast', lv: [7, 9], w: 30 },
                    { key: 'golem', lv: [9, 12], w: 25 }
                ]
            }
        },

        lair: {
            title: 'Dragon Lair',
            ground: 'carpet',
            tint: 'rgba(40, 0, 0, 0.35)',
            rows: buildLair(),
            npcs: [
                {
                    id: 'dragon', name: 'Dragon', x: 6, y: 4, dir: 'down', kind: 'boss', emoji: '🐉', size: 46,
                    trigger: 'dragon', hideIf: 'dragonDefeated',
                    lines: [
                        'You dare enter MY lair?!',
                        'I have burned your villages and I will burn you too!'
                    ]
                }
            ],
            warps: [{ x: 6, y: 11, to: 'cave', tx: 10, ty: 2 }],
            start: { x: 6, y: 10 },
            encounter: null
        }
    };

    // Work out each map's size from its rows
    Object.keys(R.MAPS).forEach(id => {
        const map = R.MAPS[id];
        map.h = map.rows.length;
        map.w = map.rows[0].length;
    });
})(window.RPG = window.RPG || {});

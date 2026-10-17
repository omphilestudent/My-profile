// Turn-based battles: fight, send out a monster, use items, tame with orbs, or run
(function (R) {
    'use strict';

    const $ = id => document.getElementById(id);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const rand = (a, b) => a + Math.random() * (b - a);
    const randInt = (a, b) => Math.floor(rand(a, b + 1));
    R.randInt = randInt;

    // Build a monster at a given level. Stats scale from the base values.
    R.createMonster = function (key, level) {
        const base = R.MONSTERS[key];
        const ratio = level / base.level;
        const maxHp = Math.max(1, Math.round(base.hp * ratio));
        return {
            key, name: base.name, emoji: base.emoji, level, xp: 0,
            hp: maxHp, maxHp,
            atk: Math.max(1, Math.round(base.atk * ratio)),
            def: Math.round(base.def * ratio),
            move: base.move, boss: !!base.boss
        };
    };

    // Add XP and return how many levels were gained
    R.grantXp = function (entity, amount) {
        entity.xp = (entity.xp || 0) + amount;
        let gained = 0;
        while (entity.xp >= entity.level * 25) {
            entity.xp -= entity.level * 25;
            entity.level += 1;
            gained++;
            const boost = entity.hero ? 12 : 4;
            entity.maxHp += boost;
            entity.hp = Math.min(entity.maxHp, entity.hp + boost);
            if (!entity.hero) {
                entity.atk += 1;
                entity.def += 1;
            }
        }
        return gained;
    };

    const damage = (atk, def) => Math.max(1, Math.floor(atk * rand(0.85, 1.15)) - def);
    const hitEffect = el => Fun.replayAnimation(el, 'hit');

    function render(enemy) {
        const hero = R.game.hero;
        const pct = (v, max) => Math.max(0, Math.min(100, (v / max) * 100)) + '%';

        $('foe-name').textContent = enemy.name;
        $('foe-level').textContent = `Lv ${enemy.level}`;
        $('foe-hp').style.width = pct(enemy.hp, enemy.maxHp);
        $('foe-numbers').textContent = `${enemy.hp}/${enemy.maxHp}`;
        $('foe-sprite').textContent = enemy.emoji;
        $('foe-sprite').classList.toggle('faint', enemy.hp <= 0);

        $('you-level').textContent = `Lv ${hero.level}`;
        $('you-hp').style.width = pct(hero.hp, hero.maxHp);
        $('you-numbers').textContent = `${hero.hp}/${hero.maxHp}`;

        const strip = $('companion-strip');
        strip.textContent = '';
        R.game.party.forEach(m => {
            const chip = document.createElement('span');
            chip.className = 'mini' + (m.hp <= 0 ? ' fainted' : '');
            chip.textContent = `${m.emoji} ${m.hp}/${m.maxHp}`;
            strip.appendChild(chip);
        });
    }

    async function fight(enemy, boss) {
        const hero = R.game.hero;
        const weapon = R.WEAPONS[hero.weapon];
        if (Math.random() > (boss ? 0.85 : 0.92)) {
            await R.say(`You swing your ${weapon.name}... and miss!`);
            return true;
        }
        const dmg = damage(weapon.power + hero.level * 2, enemy.def);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        hitEffect($('foe-sprite'));
        render(enemy);
        await R.say([`You strike with your ${weapon.name}!`, `The ${enemy.name} takes ${dmg} damage.`]);
        return true;
    }

    async function sendMonster(enemy, alive) {
        const i = await R.choose(
            alive.map(m => ({ label: `${m.emoji} ${m.name} Lv ${m.level} · ${m.hp}/${m.maxHp}` })),
            { title: 'Send out which monster?' }
        );
        if (i === null) return false;
        const m = alive[i];
        if (Math.random() > 0.9) {
            await R.say(`${m.name} lunges... and misses!`);
            return true;
        }
        const dmg = damage(m.atk, enemy.def);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        hitEffect($('foe-sprite'));
        render(enemy);
        await R.say([`${m.name} uses ${m.move}!`, `The ${enemy.name} takes ${dmg} damage.`]);
        return true;
    }

    async function useItem() {
        const bag = R.game.bag, hero = R.game.hero;
        const keys = ['potion', 'superPotion'].filter(k => bag[k] > 0);
        if (!keys.length) return false;
        const i = await R.choose(
            keys.map(k => ({ label: `${R.ITEMS[k].emoji} ${R.ITEMS[k].name} x${bag[k]}` })),
            { title: 'Use which item?' }
        );
        if (i === null) return false;
        const key = keys[i], item = R.ITEMS[key];
        bag[key] -= 1;
        const before = hero.hp;
        hero.hp = Math.min(hero.maxHp, hero.hp + item.heal);
        render(R.battleEnemy);
        await R.say(`You used a ${item.name}. Restored ${hero.hp - before} HP!`);
        return true;
    }

    async function throwOrb(enemy) {
        const party = R.game.party;
        R.game.bag.orb -= 1;
        await R.say('You throw a Capture Orb!');
        await wait(400);
        const chance = 0.25 + (1 - enemy.hp / enemy.maxHp) * 0.6;
        if (Math.random() >= chance) {
            await R.say('Oh no! It broke free!');
            return 'thrown';
        }
        if (party.length >= R.MAX_PARTY) {
            await R.say(`Your party is full! The ${enemy.name} escaped.`);
            return 'thrown';
        }
        const tamed = R.createMonster(enemy.key, enemy.level);
        tamed.hp = enemy.hp;
        party.push(tamed);
        await R.say(`Gotcha! The ${enemy.name} was tamed and joined your party!`);
        return 'caught';
    }

    async function tryRun() {
        if (Math.random() < 0.5) {
            await R.say('You got away safely!');
            return true;
        }
        await R.say("You couldn't get away!");
        return false;
    }

    async function enemyTurn(enemy) {
        const hero = R.game.hero;
        const healthy = R.game.party.filter(m => m.hp > 0);
        const target = healthy.length && Math.random() < 0.3
            ? healthy[Math.floor(Math.random() * healthy.length)]
            : hero;
        const defence = target.hero ? 2 + hero.level : target.def;
        const dmg = damage(enemy.atk, defence);

        await R.say(`The ${enemy.name} uses ${enemy.move}!`);
        target.hp = Math.max(0, target.hp - dmg);
        if (target.hero) hitEffect($('you-sprite'));
        render(enemy);
        await R.say(`${target.hero ? 'You take' : target.name + ' takes'} ${dmg} damage.`);
        if (!target.hero && target.hp <= 0) await R.say(`${target.name} fainted! Rest at the inn to heal.`);
    }

    async function victory(enemy, boss) {
        const hero = R.game.hero;
        const xp = boss ? 150 : enemy.level * 6;
        const gold = boss ? 200 : enemy.level * 3 + randInt(0, 4);
        hero.gold += gold;

        const lines = [`You defeated the ${enemy.name}!`, `You earned ${gold} gold and ${xp} XP.`];
        if (R.grantXp(hero, xp)) lines.push(`You reached level ${hero.level}!`);
        R.game.party.filter(m => m.hp > 0).forEach(m => {
            if (R.grantXp(m, xp)) lines.push(`${m.name} grew to level ${m.level}!`);
        });

        await R.say(lines);
        return 'won';
    }

    R.Battle = {
        // Resolves with 'won', 'lost', 'ran' or 'caught'
        async run(enemy, opts = {}) {
            const boss = !!opts.boss;
            const hero = R.game.hero;
            R.battleEnemy = enemy;

            $('battle').hidden = false;
            R.ui.flash();
            Fun.replayAnimation($('foe-sprite'), 'enter');
            render(enemy);

            if (opts.intro) await R.say(opts.intro, { speaker: opts.speaker });
            else await R.say(boss ? `The ${enemy.name} blocks the way!` : `A wild ${enemy.name} appeared!`);

            let result = null;
            while (!result) {
                render(enemy);
                const alive = R.game.party.filter(m => m.hp > 0);
                const bag = R.game.bag;
                const choice = await R.choose([
                    { label: '⚔️ Fight' },
                    { label: '👾 Monster', disabled: alive.length === 0 },
                    { label: '🎒 Bag', disabled: !(bag.potion > 0 || bag.superPotion > 0) },
                    { label: '🔮 Capture', disabled: boss || !(bag.orb > 0) },
                    { label: '🏃 Run', disabled: boss }
                ], { title: 'What will you do?', cancelable: false, columns: 2 });

                let acted = false;
                if (choice === 0) acted = await fight(enemy, boss);
                else if (choice === 1) acted = await sendMonster(enemy, alive);
                else if (choice === 2) acted = await useItem();
                else if (choice === 3) {
                    const outcome = await throwOrb(enemy);
                    if (outcome === 'caught') { result = 'caught'; break; }
                    acted = true;
                } else if (choice === 4) {
                    if (await tryRun()) { result = 'ran'; break; }
                    acted = true;
                }
                if (!acted) continue;

                if (enemy.hp <= 0) {
                    result = await victory(enemy, boss);
                    break;
                }

                await enemyTurn(enemy);
                if (hero.hp <= 0) {
                    await R.say('You have been defeated...');
                    result = 'lost';
                }
            }

            $('battle').hidden = true;
            return result;
        }
    };
})(window.RPG = window.RPG || {});

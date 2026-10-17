// Dialog boxes, choice menus, fades and the HUD. Keyboard input goes to the top of R.keyStack.
(function (R) {
    'use strict';

    const $ = id => document.getElementById(id);
    const wait = ms => new Promise(r => setTimeout(r, ms));

    R.keyStack = [];

    function popKey(handler) {
        const i = R.keyStack.indexOf(handler);
        if (i >= 0) R.keyStack.splice(i, 1);
    }

    // Show text one line at a time with a typewriter effect. Space/Enter/Z or a click advances.
    R.say = function (lines, opts = {}) {
        const queue = (Array.isArray(lines) ? lines : [lines]).slice();
        const box = $('dialog'), textEl = $('dialog-text'), speakerEl = $('dialog-speaker');
        speakerEl.textContent = opts.speaker || '';
        speakerEl.hidden = !opts.speaker;

        return new Promise(resolve => {
            if (!queue.length) return resolve();

            let full = '', shown = 0, timer = null;

            const isTyping = () => shown < full.length;

            const typeLine = () => {
                full = queue.shift();
                shown = 0;
                textEl.textContent = '';
                clearInterval(timer);
                timer = setInterval(() => {
                    shown++;
                    textEl.textContent = full.slice(0, shown);
                    if (shown >= full.length) clearInterval(timer);
                }, 18);
            };

            const close = () => {
                clearInterval(timer);
                popKey(onKey);
                box.removeEventListener('click', onClick);
                box.hidden = true;
                resolve();
            };

            const advance = () => {
                if (isTyping()) {
                    clearInterval(timer);
                    shown = full.length;
                    textEl.textContent = full;
                    return;
                }
                if (!queue.length) return close();
                typeLine();
            };

            const onClick = () => advance();
            const onKey = (e) => {
                if (['Enter', ' ', 'z', 'Z'].includes(e.key)) advance();
            };

            box.addEventListener('click', onClick);
            R.keyStack.push(onKey);
            box.hidden = false;
            typeLine();
        });
    };

    // Show a list of options. Resolves with the chosen index, or null if cancelled.
    R.choose = function (items, opts = {}) {
        const { title = '', cancelable = true, columns = 1 } = opts;
        const box = $('choice'), list = $('choice-list');
        $('choice-title').textContent = title;
        list.textContent = '';
        list.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

        return new Promise(resolve => {
            if (!items.length) return resolve(null);

            let index = Math.max(0, items.findIndex(it => !it.disabled));

            const select = (i) => {
                index = i;
                buttons.forEach((b, j) => b.classList.toggle('selected', j === i));
            };

            const finish = (value) => {
                popKey(onKey);
                box.hidden = true;
                list.textContent = '';
                resolve(value);
            };

            const buttons = items.map((item, i) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'choice-item';
                b.textContent = item.label;
                b.disabled = !!item.disabled;
                b.addEventListener('click', () => { if (!b.disabled) finish(i); });
                b.addEventListener('mouseenter', () => { if (!b.disabled) select(i); });
                list.appendChild(b);
                return b;
            });

            const step = (delta) => {
                let i = index + delta;
                while (i >= 0 && i < items.length && items[i].disabled) i += delta;
                if (i >= 0 && i < items.length) select(i);
            };

            const onKey = (e) => {
                const k = e.key;
                if (['ArrowUp', 'w', 'W'].includes(k)) step(-columns);
                else if (['ArrowDown', 's', 'S'].includes(k)) step(columns);
                else if (['ArrowLeft', 'a', 'A'].includes(k)) step(-1);
                else if (['ArrowRight', 'd', 'D'].includes(k)) step(1);
                else if (['Enter', ' ', 'z', 'Z'].includes(k)) {
                    if (!items[index].disabled) finish(index);
                } else if (cancelable && ['x', 'X', 'Escape', 'Backspace'].includes(k)) {
                    finish(null);
                }
            };

            R.keyStack.push(onKey);
            box.hidden = false;
            select(index);
        });
    };

    R.ui = {
        setLocation(title) {
            $('hud-location').textContent = title;
        },

        updateHud() {
            const hero = R.game.hero;
            if (!hero) return;
            $('hud-stats').textContent =
                `Lv ${hero.level}  ·  HP ${hero.hp}/${hero.maxHp}  ·  💰 ${hero.gold}  ·  👾 ${R.game.party.length}/${R.MAX_PARTY}`;
        },

        fade(on) {
            $('fade').classList.toggle('on', on);
            return wait(450);
        },

        flash() {
            Fun.replayAnimation($('flash'), 'flash-on');
        }
    };
})(window.RPG = window.RPG || {});

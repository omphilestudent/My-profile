// Shared effects for the game pages: confetti and replaying CSS animations
(function () {
    const CONFETTI_COLORS = ['#ff3d7f', '#ffd23f', '#2ee6a6', '#6c5ce7', '#ff7a1a', '#4cc9f0'];

    function getConfettiLayer() {
        let layer = document.querySelector('.confetti');
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'confetti';
            layer.setAttribute('aria-hidden', 'true');
            document.body.appendChild(layer);
        }
        return layer;
    }

    function launchConfetti(count = 80) {
        const layer = getConfettiLayer();

        for (let i = 0; i < count; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.width = 8 + Math.random() * 8 + 'px';
            piece.style.height = 10 + Math.random() * 10 + 'px';
            piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            piece.style.animationDuration = 2 + Math.random() * 1.8 + 's';
            piece.style.animationDelay = Math.random() * 0.4 + 's';
            piece.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');

            layer.appendChild(piece);
            piece.addEventListener('animationend', () => piece.remove());
        }
    }

    // Restart a CSS animation by class name. The class is removed once it finishes,
    // so the same animation can be played again later.
    function replayAnimation(el, className) {
        if (!el) return;

        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);

        const onEnd = (event) => {
            if (event.target !== el) return;
            el.classList.remove(className);
            el.removeEventListener('animationend', onEnd);
        };
        el.addEventListener('animationend', onEnd);
    }

    window.Fun = { launchConfetti, replayAnimation };
})();

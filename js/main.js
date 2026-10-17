document.addEventListener('DOMContentLoaded', () => {
    // Current year in the footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Mobile navigation
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarLinks = document.querySelector('.navbar-links');
    const navLinks = document.querySelectorAll('.nav-link');

    navbarToggle.addEventListener('click', () => {
        navbarLinks.classList.toggle('active');
    });

    // Highlight the clicked link and close the mobile menu
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            navbarLinks.classList.remove('active');
        });
    });

    // Theme: saved preference, otherwise the system preference
    const themeToggle = document.getElementById('theme-toggle');
    const toggleIcon = themeToggle.querySelector('.toggle-icon');

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateIcon(currentTheme);

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    // Update the toggle icon based on theme
    function updateIcon(theme) {
        toggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        toggleIcon.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    // Follow system preference changes unless the visitor chose a theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateIcon(newTheme);
        }
    });
});

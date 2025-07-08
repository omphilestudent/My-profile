document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ratingScale = document.getElementById('rating-scale');
    const feedbackSection = document.getElementById('feedback-section');
    const thankYouMessage = document.getElementById('thank-you-message');
    const feedbackText = document.getElementById('feedback-text');
    const userEmail = document.getElementById('user-email');
    const submitBtn = document.getElementById('submit-feedback');
    const displayRating = document.getElementById('display-rating');
    const npsScore = document.getElementById('current-score');
    const npsValue = document.getElementById('nps-value');
    const scoreFill = document.getElementById('score-fill');
    const scoreText = document.getElementById('score-text');
    const respondents = document.getElementById('respondents');

    // Data storage (in a real app, this would be a backend API)
    let feedbackData = JSON.parse(localStorage.getItem('npsFeedback')) || [];
    let selectedRating = null;

    // Initialize rating buttons
    function initRatingButtons() {
        ratingScale.innerHTML = '';

        for (let i = 0; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'rating-btn';
            btn.textContent = i;
            btn.dataset.value = i;

            // Set button colors based on NPS categories
            if (i <= 6) {
                btn.style.backgroundColor = 'var(--error-color)';
            } else if (i <= 8) {
                btn.style.backgroundColor = 'var(--warning-color)';
            } else {
                btn.style.backgroundColor = 'var(--success-color)';
            }

            btn.addEventListener('click', function () {
                selectRating(i);
            });

            ratingScale.appendChild(btn);
        }
    }

    // Handle rating selection
    function selectRating(rating) {
        selectedRating = rating;
        displayRating.textContent = rating;

        // Remove selected class from all buttons
        document.querySelectorAll('.rating-btn').forEach(b => {
            b.classList.remove('selected');
        });

        // Add selected class to clicked button
        const selectedBtn = document.querySelector(`.rating-btn[data-value="${rating}"]`);
        selectedBtn.classList.add('selected');

        // Show feedback section
        setTimeout(() => {
            feedbackSection.classList.remove('hidden');
            feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    // Calculate NPS score
    function calculateNPS() {
        if (feedbackData.length === 0) return 0;

        const detractors = feedbackData.filter(item => item.rating <= 6).length;
        const promoters = feedbackData.filter(item => item.rating >= 9).length;
        const total = feedbackData.length;

        return Math.round(((promoters / total) - (detractors / total)) * 100);
    }

    // Get NPS category
    function getNPSCategory(score) {
        if (score >= 50) return 'Excellent';
        if (score >= 0) return 'Good';
        if (score >= -50) return 'Needs Improvement';
        return 'Poor';
    }

    // Update NPS display
    function updateNPSDisplay() {
        const score = calculateNPS();
        const category = getNPSCategory(score);
        const totalRespondents = feedbackData.length;

        npsValue.textContent = score;
        scoreText.textContent = category;
        respondents.textContent = totalRespondents;

        // Animate score bar
        setTimeout(() => {
            const percentage = (score + 100) / 2; // Convert -100 to 100 scale to 0-100
            scoreFill.style.width = `${percentage}%`;

            // Set color based on score
            if (score >= 50) {
                scoreFill.style.backgroundColor = 'var(--success-color)';
            } else if (score >= 0) {
                scoreFill.style.backgroundColor = 'var(--primary-color)';
            } else if (score >= -50) {
                scoreFill.style.backgroundColor = 'var(--warning-color)';
            } else {
                scoreFill.style.backgroundColor = 'var(--error-color)';
            }
        }, 100);

        npsScore.classList.remove('hidden');
    }

    // Handle feedback submission
    submitBtn.addEventListener('click', function () {
        if (selectedRating === null) {
            alert("Please select a rating.");
            return;
        }

        if (typeof grecaptcha !== 'undefined' && grecaptcha.getResponse().length === 0) {
            alert("Please complete the reCAPTCHA");
            return;
        }

        const feedback = {
            rating: selectedRating,
            comment: feedbackText.value.trim(),
            email: userEmail.value.trim(),
            timestamp: new Date().toISOString()
        };

        // Add to feedback data
        feedbackData.push(feedback);

        // Save to localStorage (replace with API call in production)
        localStorage.setItem('npsFeedback', JSON.stringify(feedbackData));

        // Show thank you message
        feedbackSection.classList.add('hidden');
        thankYouMessage.classList.remove('hidden');
        thankYouMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Update NPS score
        updateNPSDisplay();

        // Reset form after delay (optional)
        setTimeout(() => {
            document.querySelector('.rating-btn.selected')?.classList.remove('selected');
            feedbackText.value = '';
            userEmail.value = '';
            selectedRating = null;

            // Optional: hide thank-you after a delay
            thankYouMessage.classList.add('hidden');
        }, 5000);
    });

    // Initialize the app
    initRatingButtons();

    // If we have existing data, show the NPS score by default
    if (feedbackData.length > 0) {
        updateNPSDisplay();
    }
});
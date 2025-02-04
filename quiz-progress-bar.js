document.addEventListener("DOMContentLoaded", function () {
    const steps = document.querySelectorAll('[data-form="step"]');
    const countableSteps = Array.from(steps).filter(step => step.dataset.countCard !== "false");
    const totalSteps = countableSteps.length;
    let currentStepIndex = 0;
    // Function to initialize the form progress
    function initializeFormProgress() {
        countableSteps.forEach((step, index) => {
            const totalStepsElement = step.querySelector('[custom-data="total-steps"]');
            const progressBarElement = step.querySelector('[custom-data="progress-bar-filled"]');
            const currentStepElement = step.querySelector('[custom-data="current-step"]');
            if (totalStepsElement) totalStepsElement.textContent = totalSteps;
            if (currentStepElement) currentStepElement.textContent = index + 1;
            if (progressBarElement) {
                const progressPercentage = ((index + 1) / totalSteps) * 100;
                progressBarElement.style.width = `${progressPercentage}%`;
            }
        });
    }
    // Function to show a specific step
    function showStep(index) {
        steps.forEach((step, idx) => {
            step.hidden = idx !== index;
        });
    }
    // Initial setup
    initializeFormProgress();
    showStep(currentStepIndex);
    // Event listener for navigation buttons
    document.querySelectorAll('[data-form="back-btn"]').forEach(btn => {
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            if (currentStepIndex > 0) {
                currentStepIndex--;
                showStep(currentStepIndex);
            }
        });
    });
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const nextStep = radio.closest('[data-form="step"]').nextElementSibling;
            if (nextStep && nextStep.dataset.form === "step") {
                currentStepIndex++;
                showStep(currentStepIndex);
            }
        });
    });
});
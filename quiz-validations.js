// Validation configuration for different field types
const validationRules = {
    'height-cm': {
        min: 100,
        max: 250,
        type: 'float',
        errorClass: 'error'
    },
    'weight-kg': {
        min: 30,
        max: 300,
        type: 'float',
        errorClass: 'error'
    },
    'goal-weight-kg': {
        min: 30,
        max: 300,
        type: 'float',
        errorClass: 'error'
    },
    'height-feet': {
        min: 3,
        max: 8,
        type: 'int',
        errorClass: 'error'
    },
    'height-inches': {
        min: 0,
        max: 11,
        type: 'int',
        errorClass: 'error',
        optional: true
    },
    'weight-lbs': {
        min: 66,
        max: 660,
        type: 'float',
        errorClass: 'error'
    },
    'goal-weight-lbs': {
        min: 66,
        max: 660,
        type: 'float',
        errorClass: 'error'
    }
};

class FormValidator {
    constructor() {
        this.fields = new Map();
        this.nextButtons = document.querySelectorAll('[data-form="next-btn"]');
        this.initialize();
    }

    initialize() {
        // Find all input fields with custom-data attributes
        document.querySelectorAll('input[custom-data]').forEach(input => {
            const fieldType = input.getAttribute('custom-data');
            if (validationRules[fieldType]) {
                this.fields.set(input, {
                    touched: false,
                    rules: validationRules[fieldType]
                });
                this.setupEventListeners(input);
            }
        });

        // Initial validation state
        this.validateAll();
    }

    setupEventListeners(input) {
        // Handle input events
        input.addEventListener('input', () => {
            const fieldData = this.fields.get(input);
            if (fieldData) {
                fieldData.touched = true;
                // Always remove error on input
                input.classList.remove(fieldData.rules.errorClass);
                this.validateAll();
            }
        });
    }

    validateField(input, fieldData) {
        // Don't show errors if field hasn't been touched
        if (!fieldData.touched) {
            return true;
        }

        const value = fieldData.rules.type === 'int' ? 
            parseInt(input.value) : 
            parseFloat(input.value);

        // Handle empty optional fields
        if (fieldData.rules.optional && input.value === '') {
            return true;
        }

        // Validate the value
        return !isNaN(value) && 
            value >= fieldData.rules.min && 
            value <= fieldData.rules.max;
    }

    validateAll() {
        let isValid = true;

        this.fields.forEach((fieldData, input) => {
            const fieldIsValid = this.validateField(input, fieldData);
            
            // Only show error if field is touched and invalid
            if (fieldData.touched && !fieldIsValid) {
                input.classList.add(fieldData.rules.errorClass);
                isValid = false;
            }
        });

        // Update button state
        this.nextButtons.forEach(button => {
            if (isValid) {
                button.classList.remove('disabled');
                button.style.opacity = '';
                button.style.pointerEvents = 'auto';
            } else {
                button.classList.add('disabled');
                button.style.opacity = '0.4';
                button.style.pointerEvents = 'none';
            }
        });

        return isValid;
    }
}

// Initialize the validator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FormValidator();
});

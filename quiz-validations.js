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
    },
    'consent-checkbox': {
        type: 'checkbox',
        errorClass: 'error'
    }
};

class FormValidator {
    constructor() {
        this.fields = new Map();
        this.nextButtons = document.querySelectorAll('[data-form="next-btn"]');
        this.isHeightStep = false;
        this.consentCheckbox = null;
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
                
                // Check if we have height inputs - this indicates we're on the height step
                if (fieldType.startsWith('height-')) {
                    this.isHeightStep = true;
                }
                
                // Store reference to consent checkbox
                if (fieldType === 'consent-checkbox') {
                    this.consentCheckbox = input;
                }
            }
        });

        // Initial validation state
        this.validateAll();
    }

    setupEventListeners(input) {
        // Handle input events
        const fieldData = this.fields.get(input);
        
        if (fieldData.rules.type === 'checkbox') {
            input.addEventListener('change', () => {
                fieldData.touched = true;
                // Always remove error on change
                input.classList.remove(fieldData.rules.errorClass);
                this.validateAll();
            });
        } else {
            input.addEventListener('input', () => {
                fieldData.touched = true;
                // Always remove error on input
                input.classList.remove(fieldData.rules.errorClass);
                this.validateAll();
            });
        }
    }

    validateField(input, fieldData) {
        // Don't show errors if field hasn't been touched
        if (!fieldData.touched) {
            return true;
        }

        // Handle checkbox validation
        if (fieldData.rules.type === 'checkbox') {
            return input.checked;
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

        // Check if consent is required and valid for height step
        if (this.isHeightStep && this.consentCheckbox) {
            const consentFieldData = this.fields.get(this.consentCheckbox);
            // If consent checkbox exists but is not checked, the form is invalid
            if (!this.consentCheckbox.checked) {
                isValid = false;
                // Only show error if touched
                if (consentFieldData && consentFieldData.touched && !this.consentCheckbox.checked) {
                    this.consentCheckbox.classList.add(consentFieldData.rules.errorClass);
                }
            }
        }

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

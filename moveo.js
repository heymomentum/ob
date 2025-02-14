// Session storage keys
const ENDPOINT_STORAGE_KEY = 'momentum-api-endpoint';
const FORM_DATA_STORAGE_KEY = 'momentum-form-data-cache';

// Initialize session storage for API reports
let formDataCache = [];
try {
    formDataCache = JSON.parse(sessionStorage.getItem(FORM_DATA_STORAGE_KEY) || '[]');
} catch (e) {
    console.error('Error loading cached form data:', e);
    formDataCache = [];
}

// Function to update form submit button redirects based on domain
function updateSubmitRedirects() {
    const currentDomain = window.location.hostname;
    const baseUrl = (currentDomain === 'try-momentum.com' || currentDomain === 'www.try-momentum.com')
        ? 'https://main.d2bzdkijpstiae.amplifyapp.com/payment-screen'
        : 'https://dev.d2bzdkijpstiae.amplifyapp.com/payment-screen';

    console.log('Current domain:', currentDomain);
    console.log('Selected baseUrl:', baseUrl);

    // Get name and email from form data or cookies
    const formData = trackFormValues();
    const name = formData.name || getCookie('name-input') || null;
    const email = formData.email || getCookie('email-input') || null;

    // Create the query string with null values if empty
    const queryString = `?firstName=${name || 'null'}&lastName=null&fullName=null&email=${email || 'null'}`;
    
    // Combine base URL with query string
    const fullUrl = baseUrl + queryString;

    // Update form handling
    document.querySelectorAll('#wf-form-Pricing-Top, #wf-form-Pricing-Bottom').forEach(form => {
        form.setAttribute('redirect', baseUrl);
        form.setAttribute('data-redirect', baseUrl);
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted:', form.id);
            
            // Collect form data from ONLY this form
            const formFields = {};
            const formElements = form.elements;
            
            // Debug radio buttons state
            console.log('Radio buttons in form:', form.id);
            form.querySelectorAll('input[type="radio"]').forEach(radio => {
                console.log(`Radio ${radio.id}: value=${radio.value}, checked=${radio.checked}`);
            });
            
            // Specifically handle radio button selection
            const selectedRadio = form.querySelector('input[type="radio"]:checked');
            if (selectedRadio) {
                console.log('Selected radio button:', selectedRadio.id, selectedRadio.value);
                formFields[selectedRadio.name] = selectedRadio.value;
            }
            
            // Add other form elements
            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];
                if (element.name && element.value && element.type !== 'radio') {
                    formFields[element.name] = element.value;
                }
            }
            
            console.log('Form fields collected:', formFields);
            
            // Add form identifier
            formFields.formId = form.id;
            
            // Get tracked form data but exclude fields that exist in this form
            const trackedData = trackFormValues();
            console.log('Initial tracked data:', trackedData);
            
            Object.keys(formFields).forEach(key => {
                delete trackedData[key];
            });
            console.log('Tracked data after removal:', trackedData);
            
            // Merge data, prioritizing the submitted form's values
            const allData = {
                ...trackedData,
                ...formFields,
                pricingForm: formFields
            };
            console.log('Final merged data:', allData);
            
            try {
                // Send data to API
                await sendDataToApi(allData);
                console.log('Pricing form data sent successfully');
                console.log('Redirecting to:', fullUrl);
                
                // Redirect after successful submission
                window.location.href = fullUrl;
            } catch (error) {
                console.error('Error sending pricing form data:', error);
                // Still redirect even if API call fails
                window.location.href = fullUrl;
            }
        });
    });

    // Update submit buttons (as backup)
    document.querySelectorAll('[data-form="submit-btn"][data-pricing-form="true"]').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = button.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            } else {
                window.location.href = fullUrl;
            }
        });
    });

    console.log('Updated form redirects with URL:', fullUrl);
}

// Replace periodicLinkUpdate with periodicSubmitUpdate
function periodicSubmitUpdate() {
    updateSubmitRedirects();
    // Remove the setTimeout to prevent continuous updates
}

// Modified trackFormValues function
function trackFormValues() {
    const formData = {};
    
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Process each cookie
    cookies.forEach(cookie => {
        let [name, value] = cookie.split('=').map(part => part.trim());
        
        // Skip empty cookies
        if (!value || value === 'null' || value === '') return;
        
        // Handle universal value cookies (ending with -uni)
        if (name.endsWith('-uni')) {
            // Store the universal value and skip the rest of the loop
            const baseKey = name.replace('-uni', '');
            formData[baseKey] = value;
            return;
        }
        
        // Handle special case for input fields that might have -input suffix
        if (name.endsWith('-input')) {
            name = name.replace('-input', '');
        }
        
        // Skip if we already have a universal value for this field
        if (formData[name]) return;
        
        // Handle array fields (comma-separated values)
        if (value.includes(',')) {
            formData[name] = value.split(',').map(v => v.trim());
        } else {
            // Handle numeric values
            if (!isNaN(value) && value.trim() !== '') {
                formData[name] = parseFloat(value);
            } else {
                formData[name] = value;
            }
        }
    });

    // Map specific fields for backward compatibility
    const fieldMapping = {
        'weight-lbs': 'Weight',
        'height-feet': 'Height-Feet',
        'height-inches': 'Height-Inches',
        'goal-weight-lbs': 'goal-weight'
    };

    // Create mapped fields without removing original ones
    Object.entries(fieldMapping).forEach(([oldKey, newKey]) => {
        if (formData[oldKey] !== undefined) {
            formData[newKey] = formData[oldKey];
        }
    });

    console.log('Final form data:', formData);
    return formData;
}

// Modified sendDataToApi function
async function sendDataToApi(formData) {
    const apiUrl = sessionStorage.getItem(ENDPOINT_STORAGE_KEY) || 
                  document.getElementById('momentum-api-endpoint')?.value;
    
    if (!apiUrl) {
        console.log('No API endpoint found');
        return;
    }
    
    const data = { data: formData };
    
    try {
        console.log('Sending data to API:', data);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log('API Response:', result);
        
        // Always cache the latest form data
        formDataCache = [{
            timestamp: new Date().toISOString(),
            data: formData
        }];
        sessionStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(formDataCache));
        
    } catch (error) {
        console.error('API Error:', error);
    }
}

// Add a debounce mechanism to prevent multiple rapid calls
let isProcessing = false;
const DEBOUNCE_DELAY = 500; // milliseconds

// Function to log form data with debounce
async function logFormData() {
    if (isProcessing) return;
    isProcessing = true;
    
    const formData = trackFormValues();
    console.log('Current Form Data:', JSON.stringify(formData, null, 2));
    await sendDataToApi(formData);
    
    // Reset the processing flag after delay
    setTimeout(() => {
        isProcessing = false;
    }, DEBOUNCE_DELAY);
}

// Add click event listeners to next/submit buttons and radio inputs
document.addEventListener('click', function(event) {
    const target = event.target;
    
    // Check for next/submit buttons
    const nextButton = target.closest('[data-form="next-btn"], [data-form="submit-btn"]');
    if (nextButton) {
        logFormData();
        return;
    }
    
    // Check for radio inputs with skip attribute
    if (target.closest('label[data-radio-skip="true"]')) {
        const radio = target.closest('label').querySelector('input[type="radio"]');
        if (radio && !nextButton) { // Only trigger if not also clicking next button
            setTimeout(logFormData, 50);
        }
    }
});

// Add initial data submission on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Form tracking and API reporting initialized');
    
    // Determine default API endpoint based on domain FIRST
    const currentDomain = window.location.hostname;
    const defaultEndpoint = (currentDomain === 'try-momentum.com' || currentDomain === 'www.try-momentum.com')
        ? 'https://o37rcsefc3.execute-api.us-east-1.amazonaws.com/production/api/onboarding/qst'
        : 'https://4bropw3xnc.execute-api.eu-central-1.amazonaws.com/development/api/onboarding/qst';
    
    console.log(`Form data will be reported to: ${defaultEndpoint}`);
    
    // Set the endpoint in session storage immediately if not already set
    if (!sessionStorage.getItem(ENDPOINT_STORAGE_KEY)) {
        sessionStorage.setItem(ENDPOINT_STORAGE_KEY, defaultEndpoint);
        console.log('API endpoint initialized in session storage');
    }

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.id = 'momentum-api-endpoint-container';
    inputContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99999;
        background: rgba(255,255,255,0.95);
        padding: 10px;
        border-radius: 0 0 5px 0;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        display: none;
    `;

    inputContainer.innerHTML = `
        <input 
            type="text" 
            id="momentum-api-endpoint"
            value="${defaultEndpoint}" 
            style="width: 300px; padding: 5px; border: 1px solid #ccc;"
        >
        <div style="font-size: 12px; margin-top: 5px; color: #666;">
            Press Ctrl/Cmd + U to toggle
        </div>
    `;

    // Add to document
    document.body.appendChild(inputContainer);

    // Add input change handler
    document.getElementById('momentum-api-endpoint')?.addEventListener('change', function(event) {
        sessionStorage.setItem(ENDPOINT_STORAGE_KEY, event.target.value);
    });

    // Initialize endpoint from session storage if available
    const savedEndpoint = sessionStorage.getItem(ENDPOINT_STORAGE_KEY);
    const endpointInput = document.getElementById('momentum-api-endpoint');
    
    if (savedEndpoint && endpointInput) {
        endpointInput.value = savedEndpoint;
    }
    
    // Now that the endpoint is guaranteed to be set up, do the initial form submission
    const initialFormData = trackFormValues();
    try {
        await sendDataToApi(initialFormData);
        console.log('Initial form data sent successfully');
    } catch (error) {
        console.error('Error sending initial form data:', error);
    }
    
    // Set up the form redirects without periodic updates
    updateSubmitRedirects();
    
    // Replay cached submissions last
    replayCachedSubmissions();
    
    console.log('URL input initialized:', inputContainer);
});

// Modified keyboard shortcut handler
document.addEventListener('keydown', function(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        const container = document.getElementById('momentum-api-endpoint-container');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
            console.log('Toggle input visibility:', container.style.display);
        }
    }
});

// Modified replayCachedSubmissions function
async function replayCachedSubmissions() {
    const cachedData = formDataCache;
    if (cachedData.length > 0) {
        console.log('Replaying final form submission...');
        // Get the last submission and add name from cookie if missing
        const lastSubmission = cachedData[cachedData.length - 1];
        
        // Check for name in cookie before sending
        if (!lastSubmission.data['name']) {
            const nameCookie = getCookie('name-input');
            if (nameCookie) {
                lastSubmission.data['name'] = nameCookie;
                console.log('Added name from cookie:', nameCookie);
            }
        }
        
        await sendDataToApi(lastSubmission.data);
    } else {
        console.log('No cached submissions to replay');
    }
}
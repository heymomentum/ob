// Session storage keys
const ENDPOINT_STORAGE_KEY = 'momentum-api-endpoint';
const FORM_DATA_STORAGE_KEY = 'momentum-form-data-cache';

// Utility function to get cookie value
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

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
    const name = document.getElementById('name-input')?.value || getCookie('name-input');
    const email = document.getElementById('email-input')?.value || getCookie('email-input');
    
    const currentDomain = window.location.hostname;
    const baseUrl = (currentDomain === 'try-momentum.com' || currentDomain === 'www.try-momentum.com')
        ? 'https://main.d2bzdkijpstiae.amplifyapp.com/payment-screen'
        : 'https://06ec4bbec5dd.ngrok.app/payment-screen';
    
    console.log("Name from cookie or input:", name);
    console.log("Email from cookie or input:", email);
    
    // Base query string without offer
    const baseQueryString = `?firstName=${name || 'null'}&lastName=null&fullName=null&email=${email || 'null'}`;
    
    // 1. Handle submit buttons with the submit-button class
    const submitButtons = document.querySelectorAll('.submit-button');
    submitButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = baseUrl + baseQueryString;
        });
    });
    
    // 2. Handle the pricing forms specifically
    document.querySelectorAll('#wf-form-Pricing-Top, #wf-form-Pricing-Bottom').forEach(form => {
        // Add submit event listener to the form
        form.addEventListener('submit', function(e) {
            // Prevent the default form submission
            e.preventDefault();
            
            // Get the selected offer from the form
            const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value || '';
            
            // Create the full query string with the offer
            const queryString = baseQueryString + (selectedOffer ? `&offer=${selectedOffer}` : '');
            const fullUrl = baseUrl + queryString;
            
            console.log('Form submitted, redirecting to:', fullUrl);
            
            // Update the form's redirect attributes with the full URL including query parameters
            form.setAttribute('redirect', fullUrl);
            form.setAttribute('data-redirect', fullUrl);
            
            // Force redirect to the full URL with query parameters
            window.location.href = fullUrl;
            return false; // Ensure the form doesn't submit normally
        });
        
        // Also handle the submit button within the form directly
        const formSubmitBtn = form.querySelector('input[type="submit"]');
        if (formSubmitBtn) {
            formSubmitBtn.addEventListener('click', function(e) {
                // Prevent the default button click behavior
                e.preventDefault();
                
                // Get the selected offer from the form
                const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value || '';
                
                // Create the full query string with the offer
                const queryString = baseQueryString + (selectedOffer ? `&offer=${selectedOffer}` : '');
                const fullUrl = baseUrl + queryString;
                
                console.log('Submit button clicked, redirecting to:', fullUrl);
                
                // Force redirect to the full URL with query parameters
                window.location.href = fullUrl;
                return false; // Ensure the form doesn't submit normally
            });
        }
    });
    
    // 3. Also add direct event listeners to all submit buttons with class .base-button.pricing-button
    document.querySelectorAll('.base-button.pricing-button').forEach(button => {
        button.addEventListener('click', function(e) {
            // Prevent the default button click behavior
            e.preventDefault();
            
            // Find the parent form
            const form = button.closest('form');
            if (!form) return;
            
            // Get the selected offer from the form
            const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value || '';
            
            // Create the full query string with the offer
            const queryString = baseQueryString + (selectedOffer ? `&offer=${selectedOffer}` : '');
            const fullUrl = baseUrl + queryString;
            
            console.log('Pricing button clicked, redirecting to:', fullUrl);
            
            // Force redirect to the full URL with query parameters
            window.location.href = fullUrl;
            return false;
        });
    });
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
    
    // Add a debug log to check if forms are found
    const pricingForms = document.querySelectorAll('#wf-form-Pricing-Top, #wf-form-Pricing-Bottom');
    console.log(`Found ${pricingForms.length} pricing forms:`, pricingForms);
    
    // Add a debug log for radio buttons
    pricingForms.forEach(form => {
        const radioButtons = form.querySelectorAll('input[type="radio"]');
        console.log(`Form ${form.id} has ${radioButtons.length} radio buttons:`, radioButtons);
        
        // Log the selected radio button
        const selectedRadio = form.querySelector('input[type="radio"]:checked');
        console.log(`Form ${form.id} selected radio:`, selectedRadio?.value || 'none');
    });
    
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
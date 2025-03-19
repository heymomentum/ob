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

// Conversion utility functions for metric/imperial units
function lbsToKg(lbs) {
  if (!lbs || isNaN(lbs)) return null;
  return Math.round((parseFloat(lbs) * 0.453592) * 10) / 10; // Round to 1 decimal place
}

function feetInchesToCm(feet, inches) {
  if ((feet === null || isNaN(feet)) && (inches === null || isNaN(inches))) return null;
  feet = parseFloat(feet || 0);
  inches = parseFloat(inches || 0);
  const totalInches = (feet * 12) + inches;
  return Math.round(totalInches * 2.54); // Round to whole number
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
        ? 'https://www.app.try-momentum.com/payment-screen'
        : 'https://dev.d2bzdkijpstiae.amplifyapp.com/payment-screen';
        // Switch to: "https://www.app.try-momentum.com/payment-screen" for main site
    
    console.log("Name from cookie or input:", name);
    console.log("Email from cookie or input:", email);
    
    // Detect language from URL path
    const urlPath = window.location.pathname;
    let language = "en"; // Default language
    
    if (urlPath.includes("/es/")) {
        language = "es";
    } else if (urlPath.includes("/en/")) {
        language = "en";
    }
    
    console.log("Detected language from URL path:", language);
    
    // Base query string without offer
    const baseQueryString = `?firstName=${name || 'null'}&lastName=null&fullName=null&email=${email || 'null'}&lang=${language}`;
    
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
        form.addEventListener('submit', async function(e) {
            // Prevent the default form submission
            e.preventDefault();
            
            // Get the selected offer from the form
            const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value || '';
            
            // Create the full query string with the offerId
            const queryString = baseQueryString + (selectedOffer ? `&offerId=${selectedOffer}` : '');
            const fullUrl = baseUrl + queryString;
            
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
            
            // Get tracked form data - with universal metrics only
            const trackedData = trackFormValues();
            console.log('Form tracked data with universal metrics:', trackedData);
            
            // Merge form fields with tracked data, preserving universal metrics
            const allData = {
                ...trackedData,
                ...formFields,
                pricingForm: {
                    ...formFields,
                    // Include universal metrics in the pricing form data if they exist
                    ...(trackedData['uni-weight'] && { 'uni-weight': trackedData['uni-weight'] }),
                    ...(trackedData['uni-height'] && { 'uni-height': trackedData['uni-height'] }),
                    ...(trackedData['uni-goal-weight'] && { 'uni-goal-weight': trackedData['uni-goal-weight'] })
                }
            };
            
            console.log('Final merged data with universal metrics:', allData);
            
            try {
                // Send data to API
                await sendDataToApi(allData);
                console.log('Pricing form data sent successfully');
                console.log('Redirecting to:', fullUrl);
                
                // Update the form's redirect attributes with the full URL including query parameters
                form.setAttribute('redirect', fullUrl);
                form.setAttribute('data-redirect', fullUrl);
                
                // Force redirect to the full URL with query parameters
                window.location.href = fullUrl;
            } catch (error) {
                console.error('Error sending pricing form data:', error);
                // Still redirect even if API call fails
                window.location.href = fullUrl;
            }
            
            return false; // Ensure the form doesn't submit normally
        });
        
        // Also handle the submit button within the form directly
        const formSubmitBtn = form.querySelector('input[type="submit"]');
        if (formSubmitBtn) {
            formSubmitBtn.addEventListener('click', async function(e) {
                // Prevent the default button click behavior
                e.preventDefault();
                
                // Get the selected offer from the form
                const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value || '';
                
                // Create the full query string with the offerId
                const queryString = baseQueryString + (selectedOffer ? `&offerId=${selectedOffer}` : '');
                const fullUrl = baseUrl + queryString;
                
                console.log('Submit button clicked, redirecting to:', fullUrl);
                
                // Collect form data
                const formFields = {
                    formId: form.id
                };
                
                if (selectedOffer) {
                    formFields.offer = selectedOffer;
                }
                
                // Get tracked data with universal metrics only
                const trackedData = trackFormValues();
                const allData = {
                    ...trackedData,
                    ...formFields,
                    pricingForm: {
                        ...formFields,
                        // Include universal metrics in the pricing form data if they exist
                        ...(trackedData['uni-weight'] && { 'uni-weight': trackedData['uni-weight'] }),
                        ...(trackedData['uni-height'] && { 'uni-height': trackedData['uni-height'] }),
                        ...(trackedData['uni-goal-weight'] && { 'uni-goal-weight': trackedData['uni-goal-weight'] })
                    }
                };
                
                try {
                    await sendDataToApi(allData);
                    console.log('Form data sent successfully on button click');
                } catch (error) {
                    console.error('Error sending form data on button click:', error);
                }
                
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
            
            // Create the full query string with the offerId
            const queryString = baseQueryString + (selectedOffer ? `&offerId=${selectedOffer}` : '');
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

// Modified trackFormValues function to extract universal metrics only
function trackFormValues() {
    // First collect all cookies into a temporary object
    const tempData = {};
    
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Process each cookie
    cookies.forEach(cookie => {
        let [name, value] = cookie.split('=').map(part => part.trim());
        
        // Skip empty cookies
        if (!value || value === 'null' || value === '') return;
        
        // Handle input fields that might have -input suffix
        if (name.endsWith('-input')) {
            name = name.replace('-input', '');
        }
        
        // Handle array fields (comma-separated values)
        if (value.includes(',')) {
            tempData[name] = value.split(',').map(v => v.trim());
        } else {
            // Handle numeric values
            if (!isNaN(value) && value.trim() !== '') {
                tempData[name] = parseFloat(value);
            } else {
                tempData[name] = value;
            }
        }
    });

    // Create the final form data object with universal values
    const formData = {};
    
    // Find all universal keys (-uni suffix) for filtering
    const universalKeys = Object.keys(tempData).filter(key => key.endsWith('-uni'));
    const universalPrefixes = universalKeys.map(key => key.replace('-uni', ''));
    
    // Track which fields were filtered out due to having universal versions
    const filteredOutFields = [];
    
    // List of health metric keys that we'll handle separately
    const healthMetricKeys = [
        'weight-lbs', 'Weight', 'weight-kg',
        'goal-weight-lbs', 'goal-weight', 'goal-weight-kg',
        'height-feet', 'Height-Feet', 'height-inches', 'Height-Inches', 'height-cm',
        'weight-unit', 'goal-weight-unit', 'height-unit'
    ];
    
    // Process all keys from tempData
    Object.keys(tempData).forEach(key => {
        // Skip health metrics we're going to handle separately
        if (healthMetricKeys.includes(key)) {
            return;
        }
        
        // If this is a universal key, always include it
        if (key.endsWith('-uni')) {
            formData[key] = tempData[key];
            return;
        }
        
        // If we have a universal version of this key (key + '-uni'), skip the non-universal version
        if (universalPrefixes.includes(key) && tempData[key + '-uni'] !== undefined) {
            // Track which fields we're filtering out
            filteredOutFields.push(key);
            return;
        }
        
        // Include this key since it either doesn't have a universal version
        // or the universal version doesn't exist in the cookies
        formData[key] = tempData[key];
    });
    
    // Extract and normalize weight
    let uniWeight = null;
    if (tempData['weight-kg'] !== undefined) {
        // Use metric weight directly
        uniWeight = tempData['weight-kg'];
    } else if (tempData['weight-lbs'] !== undefined || tempData['Weight'] !== undefined) {
        // Convert imperial weight
        const weightLbs = tempData['weight-lbs'] || tempData['Weight'];
        uniWeight = lbsToKg(weightLbs);
    }
    
    // Extract and normalize goal weight
    let uniGoalWeight = null;
    if (tempData['goal-weight-kg'] !== undefined) {
        // Use metric goal weight directly
        uniGoalWeight = tempData['goal-weight-kg'];
    } else if (tempData['goal-weight-lbs'] !== undefined || tempData['goal-weight'] !== undefined) {
        // Convert imperial goal weight
        const goalWeightLbs = tempData['goal-weight-lbs'] || tempData['goal-weight'];
        uniGoalWeight = lbsToKg(goalWeightLbs);
    }
    
    // Extract and normalize height
    let uniHeight = null;
    if (tempData['height-cm'] !== undefined) {
        // Use metric height directly
        uniHeight = tempData['height-cm'];
    } else if ((tempData['height-feet'] !== undefined || tempData['Height-Feet'] !== undefined) && 
              (tempData['height-inches'] !== undefined || tempData['Height-Inches'] !== undefined)) {
        // Convert imperial height
        const feet = tempData['height-feet'] || tempData['Height-Feet'];
        const inches = tempData['height-inches'] || tempData['Height-Inches'];
        uniHeight = feetInchesToCm(feet, inches);
    }
    
    // Add universal values to final form data if they exist
    if (uniWeight !== null) {
        formData['uni-weight'] = uniWeight;
    }
    
    if (uniGoalWeight !== null) {
        formData['uni-goal-weight'] = uniGoalWeight;
    }
    
    if (uniHeight !== null) {
        formData['uni-height'] = uniHeight;
    }

    // Debug logging to show which fields were filtered out
    if (filteredOutFields.length > 0) {
        console.log('Filtered out non-universal values that have universal counterparts:', filteredOutFields);
    }

    console.log('Final form data with only universal metrics:', formData);
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
    
    // Create a filtered version of the data that only includes universal metrics
    const data = { data: formData };
    
    try {
        console.log('Sending data to API (with universal metrics only):', data);
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
    
    // Set up event listeners for health metric inputs
    setupHealthMetricEventListeners();
    
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

// Function to set universal cookie values
function setUniversalMetrics(metricType, value) {
    if (!value || value === 'null' || isNaN(value)) return;
    
    // Set expiration to 30 days
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + expiryDate.toUTCString();
    
    if (metricType === 'weight') {
        document.cookie = `uni-weight=${value};${expires};path=/`;
        console.log(`Set universal weight to ${value}kg`);
    } else if (metricType === 'height') {
        document.cookie = `uni-height=${value};${expires};path=/`;
        console.log(`Set universal height to ${value}cm`);
    } else if (metricType === 'goal-weight') {
        document.cookie = `uni-goal-weight=${value};${expires};path=/`;
        console.log(`Set universal goal-weight to ${value}kg`);
    }
}

// Function to set up event listeners for health metric inputs
function setupHealthMetricEventListeners() {
    // Check for existing cookies first and set universal metrics
    checkExistingCookiesForMetrics();
    
    // Add event listeners for weight fields
    document.querySelectorAll('input[id*="weight"], input[name*="weight"]').forEach(field => {
        if (field.type === 'number' || field.type === 'text') {
            field.addEventListener('change', function(e) {
                // Check if this is a kg or lbs field
                const isMetric = field.id.includes('-kg') || field.name.includes('-kg');
                const value = parseFloat(e.target.value);
                
                if (!isNaN(value)) {
                    if (isMetric) {
                        // Metric value can be used directly
                        setUniversalMetrics('weight', value);
                    } else {
                        // Imperial value needs conversion
                        const weightKg = lbsToKg(value);
                        if (weightKg) {
                            setUniversalMetrics('weight', weightKg);
                        }
                    }
                }
            });
        }
    });
    
    // Add event listeners for goal weight fields
    document.querySelectorAll('input[id*="goal-weight"], input[name*="goal-weight"]').forEach(field => {
        if (field.type === 'number' || field.type === 'text') {
            field.addEventListener('change', function(e) {
                // Check if this is a kg or lbs field
                const isMetric = field.id.includes('-kg') || field.name.includes('-kg');
                const value = parseFloat(e.target.value);
                
                if (!isNaN(value)) {
                    if (isMetric) {
                        // Metric value can be used directly
                        setUniversalMetrics('goal-weight', value);
                    } else {
                        // Imperial value needs conversion
                        const goalWeightKg = lbsToKg(value);
                        if (goalWeightKg) {
                            setUniversalMetrics('goal-weight', goalWeightKg);
                        }
                    }
                }
            });
        }
    });
    
    // Add event listeners for height fields
    // Handle height-cm fields
    document.querySelectorAll('input[id*="height-cm"], input[name*="height-cm"]').forEach(field => {
        if (field.type === 'number' || field.type === 'text') {
            field.addEventListener('change', function(e) {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    setUniversalMetrics('height', value);
                }
            });
        }
    });
    
    // Handle feet and inches fields
    document.querySelectorAll('input[id*="height-feet"], input[name*="height-feet"]').forEach(field => {
        if (field.type === 'number' || field.type === 'text') {
            field.addEventListener('change', function(e) {
                // Find the related inches field
                const feetFieldId = field.id;
                const relatedInchesFieldSelector = feetFieldId.replace('feet', 'inches');
                const inchesField = document.getElementById(relatedInchesFieldSelector);
                
                if (inchesField) {
                    const feet = parseFloat(e.target.value) || 0;
                    const inches = parseFloat(inchesField.value) || 0;
                    
                    const heightCm = feetInchesToCm(feet, inches);
                    if (heightCm) {
                        setUniversalMetrics('height', heightCm);
                    }
                }
            });
        }
    });
    
    document.querySelectorAll('input[id*="height-inches"], input[name*="height-inches"]').forEach(field => {
        if (field.type === 'number' || field.type === 'text') {
            field.addEventListener('change', function(e) {
                // Find the related feet field
                const inchesFieldId = field.id;
                const relatedFeetFieldSelector = inchesFieldId.replace('inches', 'feet');
                const feetField = document.getElementById(relatedFeetFieldSelector);
                
                if (feetField) {
                    const feet = parseFloat(feetField.value) || 0;
                    const inches = parseFloat(e.target.value) || 0;
                    
                    const heightCm = feetInchesToCm(feet, inches);
                    if (heightCm) {
                        setUniversalMetrics('height', heightCm);
                    }
                }
            });
        }
    });
    
    console.log('Set up event listeners for health metric inputs');
}

// Function to check for existing cookies and set universal metrics
function checkExistingCookiesForMetrics() {
    console.log('Checking for existing health metric cookies...');
    
    // Check for weight cookies
    const weightKg = getCookie('weight-kg');
    const weightLbs = getCookie('weight-lbs') || getCookie('Weight');
    
    if (weightKg) {
        // Use metric weight directly
        setUniversalMetrics('weight', parseFloat(weightKg));
        console.log('Found existing weight-kg cookie:', weightKg);
    } else if (weightLbs) {
        // Convert imperial weight
        const weightKgValue = lbsToKg(parseFloat(weightLbs));
        if (weightKgValue) {
            setUniversalMetrics('weight', weightKgValue);
            console.log('Converted weight-lbs to kg:', weightLbs, 'to', weightKgValue);
        }
    }
    
    // Check for goal weight cookies
    const goalWeightKg = getCookie('goal-weight-kg');
    const goalWeightLbs = getCookie('goal-weight-lbs') || getCookie('goal-weight');
    
    if (goalWeightKg) {
        // Use metric goal weight directly
        setUniversalMetrics('goal-weight', parseFloat(goalWeightKg));
        console.log('Found existing goal-weight-kg cookie:', goalWeightKg);
    } else if (goalWeightLbs) {
        // Convert imperial goal weight
        const goalWeightKgValue = lbsToKg(parseFloat(goalWeightLbs));
        if (goalWeightKgValue) {
            setUniversalMetrics('goal-weight', goalWeightKgValue);
            console.log('Converted goal-weight-lbs to kg:', goalWeightLbs, 'to', goalWeightKgValue);
        }
    }
    
    // Check for height cookies
    const heightCm = getCookie('height-cm');
    const heightFeet = getCookie('height-feet') || getCookie('Height-Feet');
    const heightInches = getCookie('height-inches') || getCookie('Height-Inches');
    
    if (heightCm) {
        // Use metric height directly
        setUniversalMetrics('height', parseFloat(heightCm));
        console.log('Found existing height-cm cookie:', heightCm);
    } else if (heightFeet && heightInches) {
        // Convert imperial height
        const heightCmValue = feetInchesToCm(parseFloat(heightFeet), parseFloat(heightInches));
        if (heightCmValue) {
            setUniversalMetrics('height', heightCmValue);
            console.log('Converted height from feet/inches to cm:', heightFeet, heightInches, 'to', heightCmValue);
        }
    }
}

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
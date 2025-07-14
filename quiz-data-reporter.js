// Quiz Data Reporter - Handles data reporting for quiz forms
// Simplified version that only overrides form submission
// Version: 1.0.0

console.log('🎯 Quiz Data Reporter v1.0.0 loaded');

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
  return Math.round((parseFloat(lbs) * 0.453592) * 10) / 10;
}

function feetInchesToCm(feet, inches) {
  if ((feet === null || isNaN(feet)) && (inches === null || isNaN(inches))) return null;
  feet = parseFloat(feet || 0);
  inches = parseFloat(inches || 0);
  const totalInches = (feet * 12) + inches;
  return Math.round(totalInches * 2.54);
}

// Function to track form values from cookies
function trackQuizFormValues() {
    const tempData = {};
    
    // Define fields that should be arrays
    const arrayFields = [
        'bad-habits-uni',
        'muscle-group-uni',
        'problem-areas-uni',
        'workout-location-uni'
    ];

    // Define fields that should be strings (not arrays)
    const stringFields = [
        'water-intake-uni'
    ];
    
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
        
        // Handle array fields
        if (arrayFields.includes(name)) {
            const values = value.split(/[,&]/)
                .map(v => v.trim())
                .filter(v => v !== '');
            tempData[name] = values;
        } else if (stringFields.includes(name)) {
            tempData[name] = value;
        } else if (value.includes(',')) {
            tempData[name] = value.split(',').map(v => v.trim());
        } else {
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
        if (healthMetricKeys.includes(key)) {
            return;
        }
        
        if (key.endsWith('-uni')) {
            formData[key] = tempData[key];
            return;
        }
        
        if (universalPrefixes.includes(key) && tempData[key + '-uni'] !== undefined) {
            filteredOutFields.push(key);
            return;
        }
        
        formData[key] = tempData[key];
    });
    
    // Extract and normalize weight
    let uniWeight = null;
    if (tempData['weight-kg'] !== undefined) {
        uniWeight = tempData['weight-kg'];
    } else if (tempData['weight-lbs'] !== undefined || tempData['Weight'] !== undefined) {
        const weightLbs = tempData['weight-lbs'] || tempData['Weight'];
        uniWeight = lbsToKg(weightLbs);
    }
    
    // Extract and normalize goal weight
    let uniGoalWeight = null;
    if (tempData['goal-weight-kg'] !== undefined) {
        uniGoalWeight = tempData['goal-weight-kg'];
    } else if (tempData['goal-weight-lbs'] !== undefined || tempData['goal-weight'] !== undefined) {
        const goalWeightLbs = tempData['goal-weight-lbs'] || tempData['goal-weight'];
        uniGoalWeight = lbsToKg(goalWeightLbs);
    }
    
    // Extract and normalize height
    let uniHeight = null;
    if (tempData['height-cm'] !== undefined) {
        uniHeight = tempData['height-cm'];
    } else if ((tempData['height-feet'] !== undefined || tempData['Height-Feet'] !== undefined) && 
              (tempData['height-inches'] !== undefined || tempData['Height-Inches'] !== undefined)) {
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

    if (filteredOutFields.length > 0) {
        console.log('Filtered out non-universal values that have universal counterparts:', filteredOutFields);
    }

    console.log('Final quiz form data with universal metrics:', formData);
    return formData;
}

// Function to send data to API with retry logic
async function sendDataToApi(formData, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    const apiUrl = sessionStorage.getItem(ENDPOINT_STORAGE_KEY);
    
    if (!apiUrl) {
        console.log('No API endpoint found');
        throw new Error('No API endpoint found');
    }
    
    const data = { data: formData };
    
    try {
        console.log(`Sending quiz data to API (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, data);
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer YOUR_STRAPI_TOKEN_HERE', // Replace with your actual token
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        return result;
    } catch (error) {
        console.error(`API Error (attempt ${retryCount + 1}):`, error);
        
        // Try HTTP fallback if HTTPS fails and we're on first attempt
        if (retryCount === 0 && apiUrl.startsWith('https://') && apiUrl.includes('0.0.0.0:1337')) {
            const httpUrl = apiUrl.replace('https://', 'http://');
            console.log(`Trying HTTP fallback: ${httpUrl}`);
            sessionStorage.setItem(ENDPOINT_STORAGE_KEY, httpUrl);
            return sendDataToApi(formData, retryCount + 1);
        }
        
        // Try without authentication if we get 401/403 and we're on first attempt
        if (retryCount === 0 && (error.message.includes('401') || error.message.includes('403'))) {
            console.log('Trying without authentication...');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                credentials: 'omit',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('API Response (no auth):', result);
                return result;
            }
        }
        
        // If we haven't exceeded max retries, try again
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendDataToApi(formData, retryCount + 1);
        } else {
            console.error(`Failed after ${MAX_RETRIES + 1} attempts`);
            throw error; // Re-throw after all retries exhausted
        }
    }
}

// Main initialization function
function initializeQuizDataReporter() {
    console.log('Quiz Data Reporter initialized');
    
    // Determine default API endpoint based on domain
    const currentDomain = window.location.hostname;
    const defaultEndpoint = (currentDomain === 'try-momentum.com' || currentDomain === 'www.try-momentum.com')
        ? 'https://4bropw3xnc.execute-api.eu-central-1.amazonaws.com/development'
        : 'https://4bropw3xnc.execute-api.eu-central-1.amazonaws.com/development/api/onboarding/qst';
    
    console.log(`Quiz form data will be reported to: ${defaultEndpoint}`);
    
    // Set the endpoint in session storage if not already set
    if (!sessionStorage.getItem(ENDPOINT_STORAGE_KEY)) {
        sessionStorage.setItem(ENDPOINT_STORAGE_KEY, defaultEndpoint);
        console.log('API endpoint initialized in session storage');
    }

    // More aggressive form submission override
    function setupFormOverride() {
        const quizForm = document.querySelector('form[data-form="multistep"]');
        if (quizForm) {
            console.log('Found quiz form, setting up override...');
            
            // Remove the redirect attributes to prevent automatic redirect
            quizForm.removeAttribute('redirect');
            quizForm.removeAttribute('data-redirect');
            console.log('Removed redirect attributes from form');
            
            // Override the submit button click
            const submitButton = document.querySelector('[data-form="submit-btn"]');
            if (submitButton) {
                console.log('Found submit button, overriding click handler...');
                
                // Remove existing click handlers
                const newSubmitButton = submitButton.cloneNode(true);
                submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
                
                // Add our click handler
                newSubmitButton.addEventListener('click', async function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    console.log('Submit button clicked - intercepting submission');
                    
                    // Show loading state if available
                    const loader = document.querySelector('.form-loader');
                    if (loader) {
                        loader.style.display = 'flex';
                        loader.style.opacity = '1';
                    }
                    
                    try {
                        // Collect all form data from cookies
                        const formData = trackQuizFormValues();
                        console.log('Collected form data:', formData);
                        
                        // Send data to API and wait for confirmation
                        const result = await sendDataToApi(formData);
                        console.log('Data sent successfully:', result);
                        
                        // Wait a moment to ensure data is processed
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Get email from cookies for redirect URL
                        const email = getCookie('email-input') || getCookie('email') || getCookie('ajs_user_id');
                        const redirectUrl = email ? `https://dev.d2fs7239g9ozrr.amplifyapp.com/es/results?email=${encodeURIComponent(email)}` : 'https://dev.d2fs7239g9ozrr.amplifyapp.com/es/results';
                        
                        // Redirect to next page
                        console.log('Redirecting to next page...', redirectUrl);
                        window.location.href = redirectUrl;
                        
                    } catch (error) {
                        console.error('Error in form submission:', error);
                        
                        // Still redirect even if data sending fails
                        const email = getCookie('email-input') || getCookie('email') || getCookie('ajs_user_id');
                        const fallbackUrl = email ? `https://dev.d2fs7239g9ozrr.amplifyapp.com/es/results?email=${encodeURIComponent(email)}` : 'https://dev.d2fs7239g9ozrr.amplifyapp.com/es/results';
                        
                        setTimeout(() => {
                            window.location.href = fallbackUrl;
                        }, 2000);
                    }
                });
                
                console.log('Submit button override complete');
            }
            
            // Also override form submit event as backup
            quizForm.addEventListener('submit', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log('Form submit event intercepted');
            });
            
            console.log('Form override setup complete');
        } else {
            console.error('Quiz form not found');
        }
    }

    // Try to set up the override immediately
    setupFormOverride();
    
    // Also try again after a delay in case the form loads later
    setTimeout(setupFormOverride, 1000);
    setTimeout(setupFormOverride, 2000);
    setTimeout(setupFormOverride, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeQuizDataReporter);

// Export functions for potential external use
window.QuizDataReporter = {
    trackQuizFormValues,
    sendDataToApi,
    initializeQuizDataReporter
}; 
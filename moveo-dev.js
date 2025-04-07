// Session storage keys
const ENDPOINT_STORAGE_KEY = 'momentum-api-endpoint';
const FORM_DATA_STORAGE_KEY = 'momentum-form-data-cache';
const SELECTED_OFFER_KEY = 'selected-offer'; // New storage key for selected offer

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

// NEW FUNCTION: Add function to extract email from Analytics.js data
function getEmailFromAnalytics() {
    let email = null;
    
    // Try to extract from Segment/Analytics.js if available
    try {
        // Check if analytics object exists (Segment)
        if (window.analytics && window.analytics.user) {
            const userData = window.analytics.user();
            // Try to get email from user data
            if (userData && userData.id) {
                email = userData.id();
            }
            
            // If that didn't work, try traits
            if (!email && userData && userData.traits) {
                const traits = userData.traits();
                if (traits && traits.email) {
                    email = traits.email;
                }
            }
        }
        
        // Check for _analytics which some implementations use
        if (!email && window._analytics && window._analytics.user) {
            const userData = window._analytics.user();
            if (userData && userData.id) {
                email = userData.id();
            }
            
            // Check traits here too
            if (!email && userData && userData.traits) {
                const traits = userData.traits();
                if (traits && traits.email) {
                    email = traits.email;
                }
            }
        }
        
        // As a last resort, look for other common analytics variables
        if (!email) {
            // Check for ajs_user_id which often contains email in Segment
            if (window.ajs_user_id) {
                email = window.ajs_user_id;
            }
            
            // Check for dataLayer (Google Tag Manager)
            if (!email && window.dataLayer) {
                for (let i = 0; i < window.dataLayer.length; i++) {
                    const item = window.dataLayer[i];
                    if (item && (item.email || item.userEmail || item.user_email)) {
                        email = item.email || item.userEmail || item.user_email;
                        break;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error extracting email from analytics:', error);
    }
    
    if (email) {
        console.log('Found email from analytics data:', email);
    }
    
    return email;
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

// Function to synchronize form selections between both pricing forms
function syncFormSelections(selectedValue) {
    console.log('Syncing form selections for value:', selectedValue);
    
    // Get all radio inputs from both forms
    const allRadios = document.querySelectorAll('#wf-form-Pricing-Top input[type="radio"], #wf-form-Pricing-Bottom input[type="radio"]');
    
    // Uncheck all radios first and remove styling
    allRadios.forEach(radio => {
        radio.checked = false;
        
        // Update the custom radio appearance
        const customRadio = radio.closest('label')?.querySelector('.w-radio-input');
        if (customRadio) {
            customRadio.classList.remove('w--redirected-checked');
        }
    });
    
    // If we have a selection to apply, check the matching radios
    if (selectedValue) {
        // Find and check all radio buttons with this value
        const matchingRadios = document.querySelectorAll(`#wf-form-Pricing-Top input[value="${selectedValue}"], #wf-form-Pricing-Bottom input[value="${selectedValue}"]`);
        
        matchingRadios.forEach(radio => {
            // Check the radio button
            radio.checked = true;
            
            // Update the custom radio appearance
            const customRadio = radio.closest('label')?.querySelector('.w-radio-input');
            if (customRadio) {
                customRadio.classList.add('w--redirected-checked');
            }
        });
        
        // Store the selection in sessionStorage
        sessionStorage.setItem(SELECTED_OFFER_KEY, selectedValue);
        console.log('Synchronized forms with offer:', selectedValue);
    }
}

// Function to handle radio button changes
function handleRadioChange(e) {
    const selectedValue = e.target.value;
    
    // First, sync the form selections as before
    syncFormSelections(selectedValue);
    
    // Then, explicitly handle the visual styling for all matching radio buttons
    const matchingRadios = document.querySelectorAll(`#wf-form-Pricing-Top input[value="${selectedValue}"], #wf-form-Pricing-Bottom input[value="${selectedValue}"]`);
    
    matchingRadios.forEach(radio => {
        // Find the custom radio button div within the label
        const customRadio = radio.closest('label')?.querySelector('.w-radio-input');
        if (customRadio) {
            // Add the checked class to the custom radio button
            customRadio.classList.add('w--redirected-checked');
        }
    });
    
    console.log('Radio button change handled for value:', selectedValue);
}

// Function to update form submit button redirects based on domain
function updateSubmitRedirects() {
    // Get user data from multiple sources to ensure cross-browser compatibility
    let name = document.getElementById('name-input')?.value;
    let email = document.getElementById('email-input')?.value;
    
    // Try cookies as fallback
    if (!name) name = getCookie('name-input');
    if (!email) email = getCookie('email-input');
    
    // Try other cookie variations that might be used
    if (!email) {
        email = getCookie('email') || getCookie('ajs_user_id');
    }
    
    // ENHANCEMENT: Try to get email from analytics
    if (!email) {
        email = getEmailFromAnalytics();
    }
    
    // As a last resort, check tracked form data for email
    if (!email) {
        try {
            // Get all cookies to search for any email-like values
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.includes('@')) {
                    // Extract the value portion which might contain an email
                    const emailMatch = cookie.match(/=(.+)$/);
                    if (emailMatch && emailMatch[1] && emailMatch[1].includes('@')) {
                        email = decodeURIComponent(emailMatch[1]);
                        console.log("Found email in cookie:", email);
                        break;
                    }
                }
            }
        } catch (e) {
            console.error("Error parsing cookies for email:", e);
        }
    }
    
    const currentDomain = window.location.hostname;
    const baseUrl = (currentDomain === 'try-momentum.com' || currentDomain === 'www.try-momentum.com')
        ? 'https://www.app.try-momentum.com/payment-screen'
        : 'https://dev.d2bzdkijpstiae.amplifyapp.com/payment-screen';
        // Switch to: "https://www.app.try-momentum.com/payment-screen" for main site
    
    console.log("Name from all sources:", name);
    console.log("Email from all sources:", email);
    
    // Detect language from URL path
    const urlPath = window.location.pathname;
    let language = "en"; // Default language
    
    if (urlPath.includes("/es/")) {
        language = "es";
    } else if (urlPath.includes("/en/")) {
        language = "en";
    }
    
    console.log("Detected language from URL path:", language);
    
    // Base query string without offer - with more robust email handling
    const baseQueryString = `?firstName=${encodeURIComponent(name || 'null')}&lastName=null&fullName=null&email=${encodeURIComponent(email || 'null')}&lang=${language}`;
    
    // 1. Handle submit buttons with the submit-button class
    const submitButtons = document.querySelectorAll('.submit-button');
    submitButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = baseUrl + baseQueryString;
        });
    });
    
    // Handle browser back button - restore form selection instead of resetting
    window.addEventListener('pageshow', function(event) {
        // Check if the page is being loaded from the browser cache (back button navigation)
        if (event.persisted) {
            console.log('Page was loaded from cache (back button). Restoring form state...');
            
            // Get stored selection
            const storedSelection = sessionStorage.getItem(SELECTED_OFFER_KEY);
            
            if (storedSelection) {
                // Apply stored selection to both forms
                console.log('Restoring selected offer:', storedSelection);
                syncFormSelections(storedSelection);
            } else {
                // If no selection stored but forms have default checked items, sync those
                const defaultChecked = document.querySelector('#wf-form-Pricing-Top input[type="radio"]:checked, #wf-form-Pricing-Bottom input[type="radio"]:checked');
                if (defaultChecked) {
                    syncFormSelections(defaultChecked.value);
                }
            }
            
            // Re-initialize the radio button event listeners
            document.querySelectorAll('#wf-form-Pricing-Top input[type="radio"], #wf-form-Pricing-Bottom input[type="radio"]').forEach(radio => {
                // Enable the radio button and remove any lingering event handlers
                radio.disabled = false;
                
                // Clone and replace the radio to ensure clean event handling
                const parent = radio.parentNode;
                const clone = radio.cloneNode(true);
                parent.replaceChild(clone, radio);
                
                // Add the change event listener to the cloned radio
                clone.addEventListener('change', handleRadioChange);
            });
            
            // Re-initialize the submit redirects
            updateSubmitRedirects();
        }
    });
    
    // 2. Handle the pricing forms specifically
    document.querySelectorAll('#wf-form-Pricing-Top, #wf-form-Pricing-Bottom').forEach(form => {
        // Add event listeners to radio buttons in this form
        form.querySelectorAll('input[type="radio"]').forEach(radio => {
            // Remove any existing event listeners first
            const newRadio = radio.cloneNode(true);
            radio.parentNode.replaceChild(newRadio, radio);
            
            // Add change event listener
            newRadio.addEventListener('change', handleRadioChange);
        });
        
        // Add submit event listener to the form
        form.addEventListener('submit', async function(e) {
            // Prevent the default form submission
            e.preventDefault();
            
            // Show the loader immediately
            showFormLoader(form);
            
            // ENHANCEMENT: Get the selected offer from the form with EXTRA validation
            const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value;
            
            // ENHANCEMENT: Validate we have the required data before proceeding
            if (!selectedOffer) {
                console.error('No offer selected! Cannot proceed with form submission.');
                alert('Please select a package option before continuing.');
                hideFormLoader(form);
                return false;
            }
            
            // Store the selection in session storage before redirecting
            sessionStorage.setItem(SELECTED_OFFER_KEY, selectedOffer);
            
            // Create the full query string with the offerId - now guaranteed to exist
            const queryString = baseQueryString + `&offerId=${selectedOffer}`;
            const fullUrl = baseUrl + queryString;
            
            console.log('Form submitted with validated offer:', form.id, selectedOffer);
            
            // Collect form data from ONLY this form
            const formFields = {};
            const formElements = form.elements;
            
            // Debug radio buttons state
            console.log('Radio buttons in form:', form.id);
            form.querySelectorAll('input[type="radio"]').forEach(radio => {
                console.log(`Radio ${radio.id}: value=${radio.value}, checked=${radio.checked}`);
            });
            
            // Specifically handle radio button selection - guaranteed to exist now
            // Find the selected radio to get its name
            const selectedRadio = form.querySelector('input[name="offer"]:checked');
            if (selectedRadio) {
                formFields[selectedRadio.name] = selectedOffer;
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
            formFields.offer = selectedOffer; // ENHANCEMENT: Always include the offer explicitly
            
            // ENHANCEMENT: Ensure email is explicitly included
            // Get email from multiple sources similar to updateSubmitRedirects
            let userEmail = document.getElementById('email-input')?.value;
            if (!userEmail) userEmail = getCookie('email-input');
            if (!userEmail) userEmail = getCookie('email') || getCookie('ajs_user_id');
            
            // ENHANCEMENT: Try to get email from analytics
            if (!userEmail) {
                userEmail = getEmailFromAnalytics();
            }
            
            // As a last resort, search all cookies for email-like values - RESTORED
            if (!userEmail) {
                try {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.includes('@')) {
                            const emailMatch = cookie.match(/=(.+)$/);
                            if (emailMatch && emailMatch[1] && emailMatch[1].includes('@')) {
                                userEmail = decodeURIComponent(emailMatch[1]);
                                console.log("Found email in cookie for API submission:", userEmail);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error parsing cookies for email in API submission:", e);
                }
            }
            
            // Always include email if found
            if (userEmail) {
                formFields.email = userEmail;
                console.log("Explicitly adding email to form data:", userEmail);
            }
            
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
            
            console.log('Final merged data with universal metrics and validated offer:', allData);
            
            try {
                // Send data to API and wait for the complete response
                const apiResponse = await sendDataToApi(allData);
                console.log('Pricing form data sent successfully with response:', apiResponse);
                
                // ENHANCEMENT: Ensure email is in the redirect URL
                let redirectUrl = fullUrl;
                if (userEmail && !redirectUrl.includes(encodeURIComponent(userEmail))) {
                    // Replace any "email=null" with the actual email
                    if (redirectUrl.includes('email=null')) {
                        redirectUrl = redirectUrl.replace('email=null', `email=${encodeURIComponent(userEmail)}`);
                    } else {
                        // Add email parameter if it's missing entirely
                        const separator = redirectUrl.includes('?') ? '&' : '?';
                        redirectUrl += `${separator}email=${encodeURIComponent(userEmail)}`;
                    }
                    console.log('Enhanced redirect URL with email:', redirectUrl);
                }
                
                // Update the form's redirect attributes with the full URL including query parameters
                form.setAttribute('redirect', redirectUrl);
                form.setAttribute('data-redirect', redirectUrl);
                
                // Only redirect after confirming data was sent successfully
                console.log('Data confirmed sent. Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            } catch (error) {
                console.error('Error sending pricing form data:', error);
                
                // Still log the error but don't show to user
                console.log('Continuing with redirect despite error');
                
                // Hide loader
                hideFormLoader(form);
                
                // Automatically redirect without showing error
                window.location.href = redirectUrl;
            }
            
            return false; // Ensure the form doesn't submit normally
        });
        
        // Also handle the submit button within the form directly
        const formSubmitBtn = form.querySelector('input[type="submit"]');
        if (formSubmitBtn) {
            formSubmitBtn.addEventListener('click', async function(e) {
                // Prevent the default button click behavior
                e.preventDefault();
                
                // Show the loader immediately
                showFormLoader(form);
                
                // ENHANCEMENT: Get the selected offer with EXTRA validation
                const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value;
                
                // ENHANCEMENT: Validate we have the required data before proceeding
                if (!selectedOffer) {
                    console.error('No offer selected! Cannot proceed with submit button click.');
                    alert('Please select a package option before continuing.');
                    hideFormLoader(form);
                    return false;
                }
                
                // Store the selection in session storage before redirecting
                sessionStorage.setItem(SELECTED_OFFER_KEY, selectedOffer);
                
                // Create the full query string with the offerId - now guaranteed to exist
                const queryString = baseQueryString + `&offerId=${selectedOffer}`;
                const fullUrl = baseUrl + queryString;
                
                console.log('Submit button clicked with validated offer:', selectedOffer);
                
                // Collect form data
                const formFields = {
                    formId: form.id,
                    offer: selectedOffer // ENHANCEMENT: Always include the offer explicitly
                };
                
                // ENHANCEMENT: Ensure email is explicitly included
                let userEmail = document.getElementById('email-input')?.value;
                if (!userEmail) userEmail = getCookie('email-input');
                if (!userEmail) userEmail = getCookie('email') || getCookie('ajs_user_id');
                
                // ENHANCEMENT: Try to get email from analytics
                if (!userEmail) {
                    userEmail = getEmailFromAnalytics();
                }
                
                // As a last resort, search all cookies for email-like values - RESTORED
                if (!userEmail) {
                    try {
                        const cookies = document.cookie.split(';');
                        for (let i = 0; i < cookies.length; i++) {
                            const cookie = cookies[i].trim();
                            if (cookie.includes('@')) {
                                const emailMatch = cookie.match(/=(.+)$/);
                                if (emailMatch && emailMatch[1] && emailMatch[1].includes('@')) {
                                    userEmail = decodeURIComponent(emailMatch[1]);
                                    console.log("Found email in cookie for submit button:", userEmail);
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing cookies for email in submit button:", e);
                    }
                }
                
                // Always include email if found
                if (userEmail) {
                    formFields.email = userEmail;
                    console.log("Explicitly adding email to submit button data:", userEmail);
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
                    // Send data to API and wait for complete response
                    const apiResponse = await sendDataToApi(allData);
                    console.log('Form data sent successfully on button click with response:', apiResponse);
                    
                    // ENHANCEMENT: Ensure email is in the redirect URL
                    let redirectUrl = fullUrl;
                    if (userEmail && !redirectUrl.includes(encodeURIComponent(userEmail))) {
                        // Replace any "email=null" with the actual email
                        if (redirectUrl.includes('email=null')) {
                            redirectUrl = redirectUrl.replace('email=null', `email=${encodeURIComponent(userEmail)}`);
                        } else {
                            // Add email parameter if it's missing entirely
                            const separator = redirectUrl.includes('?') ? '&' : '?';
                            redirectUrl += `${separator}email=${encodeURIComponent(userEmail)}`;
                        }
                        console.log('Enhanced submit button redirect URL with email:', redirectUrl);
                    }
                    
                    // Only redirect after confirming data was sent successfully
                    console.log('Data confirmed sent. Redirecting to:', redirectUrl);
                    window.location.href = redirectUrl;
                } catch (error) {
                    console.error('Error sending form data on button click:', error);
                    
                    // Still log the error but don't show to user
                    console.log('Continuing with redirect despite error');
                    
                    // Hide loader
                    hideFormLoader(form);
                    
                    // Automatically redirect without showing error
                    window.location.href = redirectUrl;
                }
                
                return false; // Ensure the form doesn't submit normally
            });
        }
    });
    
    // 3. Also add direct event listeners to all submit buttons with class .base-button.pricing-button
    document.querySelectorAll('.base-button.pricing-button').forEach(button => {
        button.addEventListener('click', async function(e) {
            // Prevent the default button click behavior
            e.preventDefault();
            
            // Find the parent form
            const form = button.closest('form');
            if (!form) return;
            
            // Show the loader immediately
            showFormLoader(form);
            
            // ENHANCEMENT: Get the selected offer with EXTRA validation
            const selectedOffer = form.querySelector('input[name="offer"]:checked')?.value;
            
            // ENHANCEMENT: Validate we have the required data before proceeding
            if (!selectedOffer) {
                console.error('No offer selected! Cannot proceed with pricing button click.');
                alert('Please select a package option before continuing.');
                hideFormLoader(form);
                return false;
            }
            
            // Store the selection in session storage before redirecting
            sessionStorage.setItem(SELECTED_OFFER_KEY, selectedOffer);
            
            // Create the full query string with the offerId - now guaranteed to exist
            const queryString = baseQueryString + `&offerId=${selectedOffer}`;
            const fullUrl = baseUrl + queryString;
            
            console.log('Pricing button clicked with validated offer:', selectedOffer);
            
            // Collect form data
            const formFields = {
                formId: form.id,
                offer: selectedOffer // ENHANCEMENT: Always include the offer explicitly
            };
            
            // ENHANCEMENT: Ensure email is explicitly included
            let userEmail = document.getElementById('email-input')?.value;
            if (!userEmail) userEmail = getCookie('email-input');
            if (!userEmail) userEmail = getCookie('email') || getCookie('ajs_user_id');
            
            // ENHANCEMENT: Try to get email from analytics
            if (!userEmail) {
                userEmail = getEmailFromAnalytics();
            }
            
            // As a last resort, search all cookies for email-like values - RESTORED
            if (!userEmail) {
                try {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.includes('@')) {
                            const emailMatch = cookie.match(/=(.+)$/);
                            if (emailMatch && emailMatch[1] && emailMatch[1].includes('@')) {
                                userEmail = decodeURIComponent(emailMatch[1]);
                                console.log("Found email in cookie for pricing button:", userEmail);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error parsing cookies for email in pricing button:", e);
                }
            }
            
            // Always include email if found
            if (userEmail) {
                formFields.email = userEmail;
                console.log("Explicitly adding email to pricing button data:", userEmail);
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
                // Send data to API and wait for complete response
                const apiResponse = await sendDataToApi(allData);
                console.log('Pricing button data sent successfully with response:', apiResponse);
                
                // ENHANCEMENT: Ensure email is in the redirect URL
                let redirectUrl = fullUrl;
                if (userEmail && !redirectUrl.includes(encodeURIComponent(userEmail))) {
                    // Replace any "email=null" with the actual email
                    if (redirectUrl.includes('email=null')) {
                        redirectUrl = redirectUrl.replace('email=null', `email=${encodeURIComponent(userEmail)}`);
                    } else {
                        // Add email parameter if it's missing entirely
                        const separator = redirectUrl.includes('?') ? '&' : '?';
                        redirectUrl += `${separator}email=${encodeURIComponent(userEmail)}`;
                    }
                    console.log('Enhanced pricing button redirect URL with email:', redirectUrl);
                }
                
                // Only redirect after confirming data was sent successfully
                console.log('Data confirmed sent. Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            } catch (error) {
                console.error('Error sending data from pricing button:', error);
                
                // Still log the error but don't show to user
                console.log('Continuing with redirect despite error');
                
                // Hide loader
                hideFormLoader(form);
                
                // Automatically redirect without showing error
                window.location.href = redirectUrl;
            }
            
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
        throw new Error('No API endpoint found');
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
        
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        // Always cache the latest form data
        formDataCache = [{
            timestamp: new Date().toISOString(),
            data: formData
        }];
        sessionStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(formDataCache));
        
        // Return the result to the caller
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error; // Re-throw to let caller handle it
    }
}

// Add a debounce mechanism to prevent multiple rapid calls
let isProcessing = false;
const DEBOUNCE_DELAY = 500; // milliseconds

// Function to log form data with debounce
async function logFormData() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        const formData = trackFormValues();
        console.log('Current Form Data:', JSON.stringify(formData, null, 2));
        await sendDataToApi(formData);
        console.log('Form data logged and sent successfully');
    } catch (error) {
        console.error('Error in logFormData:', error);
    } finally {
        // Reset the processing flag after delay
        setTimeout(() => {
            isProcessing = false;
        }, DEBOUNCE_DELAY);
    }
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

// Function to ensure all radio buttons have the correct event listeners
function setupRadioButtonListeners() {
    // Get all radio inputs from both forms
    const allRadios = document.querySelectorAll('#wf-form-Pricing-Top input[type="radio"], #wf-form-Pricing-Bottom input[type="radio"]');
    
    allRadios.forEach(radio => {
        // Remove any existing event listeners first
        const newRadio = radio.cloneNode(true);
        radio.parentNode.replaceChild(newRadio, radio);
        
        // Add change event listener
        newRadio.addEventListener('change', handleRadioChange);
        
        // If this radio is checked, ensure the visual styling is applied
        if (newRadio.checked) {
            const customRadio = newRadio.closest('label')?.querySelector('.w-radio-input');
            if (customRadio) {
                customRadio.classList.add('w--redirected-checked');
            }
        }
    });
    
    console.log('Radio button listeners set up for all forms');
}

// Function to handle clicks on radio button labels
function setupLabelClickHandlers() {
    // Get all radio button labels from both forms
    const allLabels = document.querySelectorAll('#wf-form-Pricing-Top label.w-radio, #wf-form-Pricing-Bottom label.w-radio');
    
    allLabels.forEach(label => {
        // Find the radio input within this label
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
            // Add click event listener to the label
            label.addEventListener('click', function(e) {
                // Prevent the default behavior
                e.preventDefault();
                
                // Check the radio button
                radio.checked = true;
                
                // Trigger the change event on the radio button
                const event = new Event('change', { bubbles: true });
                radio.dispatchEvent(event);
                
                console.log('Label click handled for radio:', radio.value);
            });
        }
    });
    
    console.log('Label click handlers set up for all forms');
}

// Function to handle clicks on the custom radio button divs
function setupCustomRadioClickHandlers() {
    // Get all custom radio button divs from both forms
    const allCustomRadios = document.querySelectorAll('#wf-form-Pricing-Top .w-radio-input, #wf-form-Pricing-Bottom .w-radio-input');
    
    allCustomRadios.forEach(customRadio => {
        // Find the radio input within the parent label
        const label = customRadio.closest('label');
        const radio = label?.querySelector('input[type="radio"]');
        
        if (radio) {
            // Add click event listener to the custom radio div
            customRadio.addEventListener('click', function(e) {
                // Prevent the default behavior
                e.preventDefault();
                e.stopPropagation();
                
                // Check the radio button
                radio.checked = true;
                
                // Trigger the change event on the radio button
                const event = new Event('change', { bubbles: true });
                radio.dispatchEvent(event);
                
                console.log('Custom radio click handled for radio:', radio.value);
            });
        }
    });
    
    console.log('Custom radio click handlers set up for all forms');
}

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
    
    // Set up radio button listeners for all forms
    setupRadioButtonListeners();
    
    // Set up label click handlers
    setupLabelClickHandlers();
    
    // Set up custom radio click handlers
    setupCustomRadioClickHandlers();
    
    // Check for stored selection on initial page load
    const storedSelection = sessionStorage.getItem(SELECTED_OFFER_KEY);
    if (storedSelection) {
        // Apply stored selection to both forms
        console.log('Applying stored selection on page load:', storedSelection);
        syncFormSelections(storedSelection);
    } else {
        // If no selection stored but forms have default checked items, sync those
        const defaultChecked = document.querySelector('#wf-form-Pricing-Top input[type="radio"]:checked, #wf-form-Pricing-Bottom input[type="radio"]:checked');
        if (defaultChecked) {
            syncFormSelections(defaultChecked.value);
        }
    }
    
    // Now that the endpoint is guaranteed to be set up, do the initial form submission
    const initialFormData = trackFormValues();
    try {
        const initialResponse = await sendDataToApi(initialFormData);
        console.log('Initial form data sent successfully with response:', initialResponse);
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
        
        try {
            const replayResponse = await sendDataToApi(lastSubmission.data);
            console.log('Cached submission replayed successfully with response:', replayResponse);
        } catch (error) {
            console.error('Error replaying cached submission:', error);
        }
    } else {
        console.log('No cached submissions to replay');
    }
}

// Function to show the form loader
function showFormLoader(form) {
    // Find the loader element within the form or in the document
    let loader = form ? form.querySelector('.form-loader') : document.querySelector('.form-question.form-loader.dark-mode');
    
    // If no loader found in the form, try to find it in the document
    if (!loader) {
        loader = document.querySelector('.form-question.form-loader.dark-mode');
    }
    
    if (loader) {
        // Store original display state if needed
        if (!loader.dataset.originalDisplay) {
            loader.dataset.originalDisplay = loader.style.display || 'none';
        }
        
        // Show the loader
        loader.style.display = 'flex';
        console.log('Form loader shown');
    } else {
        console.warn('Form loader element not found');
    }
}

// Function to hide the form loader
function hideFormLoader(form) {
    // Find the loader element within the form or in the document
    let loader = form ? form.querySelector('.form-loader') : document.querySelector('.form-question.form-loader.dark-mode');
    
    // If no loader found in the form, try to find it in the document
    if (!loader) {
        loader = document.querySelector('.form-question.form-loader.dark-mode');
    }
    
    if (loader) {
        // Restore original display or hide
        if (loader.dataset.originalDisplay && loader.dataset.originalDisplay !== 'none') {
            loader.style.display = loader.dataset.originalDisplay;
        } else {
            loader.style.display = 'none';
        }
        console.log('Form loader hidden');
    } else {
        console.warn('Form loader element not found');
    }
}
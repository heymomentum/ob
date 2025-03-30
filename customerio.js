//  Customer.io Script
    !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://cdp.customer.io/v1/analytics-js/snippet/" + key + "/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._writeKey=key;analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.15.3";
      analytics.load("c088ec462abb87c31143");
      analytics.page();
    }}();

// --- Helper Functions ---

  // Get a specific cookie by name
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null; // Return null if not found
  }

  // Get all cookies as an object
  function getAllCookies() {
    return document.cookie.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.split('=').map(c => c.trim());
      // Ensure name is valid before adding
      if (name) {
          cookies[name] = value;
      }
      return cookies;
    }, {});
  }

  // Conversion utility: lbs to kg
  function lbsToKg(lbs) {
    if (!lbs || isNaN(lbs)) return null;
    return Math.round((parseFloat(lbs) * 0.453592) * 10) / 10; // Round to 1 decimal place
  }

  // Conversion utility: feet and inches to cm
  function feetInchesToCm(feet, inches) {
    if ((feet === null || isNaN(feet)) && (inches === null || isNaN(inches))) return null;
    feet = parseFloat(feet || 0);
    inches = parseFloat(inches || 0);
    const totalInches = (feet * 12) + inches;
    return Math.round(totalInches * 2.54); // Round to whole number
  }

// --- Data Cleaning Function ---

  // Get cleaned and universal data from cookies for Customer.io
  function getCleanedCustomerIoData() {
    const tempData = {};
    const cookies = document.cookie.split(';');

    cookies.forEach(cookie => {
      let [name, value] = cookie.split('=').map(part => part.trim());
      if (!name || !value || value === 'null' || value === '') return; // Skip empty/invalid cookies

      // Remove '-input' suffix if present
      if (name.endsWith('-input')) {
          name = name.replace('-input', '');
      }

      // Handle potential comma-separated values (though less common now)
      if (value.includes(',')) {
          tempData[name] = value.split(',').map(v => v.trim());
      } else {
          // Attempt to parse as number if possible, otherwise keep as string
          const numValue = parseFloat(value);
          tempData[name] = (!isNaN(numValue) && value.trim() !== '') ? numValue : value;
      }
    });

    const formData = {};
    const universalKeys = Object.keys(tempData).filter(key => key.endsWith('-uni'));
    const universalPrefixes = universalKeys.map(key => key.replace('-uni', ''));
    const healthMetricKeys = [
        'weight-lbs', 'Weight', 'weight-kg',
        'goal-weight-lbs', 'goal-weight', 'goal-weight-kg',
        'height-feet', 'Height-Feet', 'height-inches', 'Height-Inches', 'height-cm',
        'weight-unit', 'goal-weight-unit', 'height-unit'
    ];

    Object.keys(tempData).forEach(key => {
        if (healthMetricKeys.includes(key)) return; // Skip raw health metrics

        if (key.endsWith('-uni')) {
            formData[key] = tempData[key]; // Always include universal keys
            return;
        }

        // Skip non-universal version if universal exists
        if (universalPrefixes.includes(key) && tempData[key + '-uni'] !== undefined) {
            return;
        }

        formData[key] = tempData[key]; // Include other keys
    });

    // --- Normalize Health Metrics ---
    let uniWeight = null;
    if (tempData['weight-kg'] !== undefined) uniWeight = tempData['weight-kg'];
    else if (tempData['weight-lbs'] !== undefined || tempData['Weight'] !== undefined) {
        uniWeight = lbsToKg(tempData['weight-lbs'] || tempData['Weight']);
    }

    let uniGoalWeight = null;
    if (tempData['goal-weight-kg'] !== undefined) uniGoalWeight = tempData['goal-weight-kg'];
    else if (tempData['goal-weight-lbs'] !== undefined || tempData['goal-weight'] !== undefined) {
        uniGoalWeight = lbsToKg(tempData['goal-weight-lbs'] || tempData['goal-weight']);
    }

    let uniHeight = null;
    if (tempData['height-cm'] !== undefined) uniHeight = tempData['height-cm'];
    else if ((tempData['height-feet'] !== undefined || tempData['Height-Feet'] !== undefined) &&
             (tempData['height-inches'] !== undefined || tempData['Height-Inches'] !== undefined)) {
        uniHeight = feetInchesToCm(tempData['height-feet'] || tempData['Height-Feet'], tempData['height-inches'] || tempData['Height-Inches']);
    }

    // Add normalized universal values if they exist
    if (uniWeight !== null) formData['uni-weight'] = uniWeight;
    if (uniGoalWeight !== null) formData['uni-goal-weight'] = uniGoalWeight;
    if (uniHeight !== null) formData['uni-height'] = uniHeight;

    // Ensure essential identifiers are present
    if (tempData['email']) formData['email'] = tempData['email'];
    if (tempData['name']) formData['name'] = tempData['name'];

    // Clean up potential boolean strings
    Object.keys(formData).forEach(key => {
      if (formData[key] === 'true') formData[key] = true;
      if (formData[key] === 'false') formData[key] = false;
    });

    return formData;
  }


// --- Core Customer.io Functions ---

  // Identify user or update traits in Customer.io
  function identifyUserInCustomerIO() {
    const traits = getCleanedCustomerIoData();
    const email = traits.email || getCookie("email-input"); // Prioritize cleaned data, fallback to direct cookie

    if (email) {
      // If email exists, identify the user with it and all traits
      window.analytics.identify(email, traits);
      // console.log("Customer.io: Identified user", email, "with traits:", JSON.stringify(traits, null, 2));
    } else {
      // If no email, update traits for the anonymous user
      window.analytics.identify(traits);
      // console.log("Customer.io: Updated anonymous user traits:", JSON.stringify(traits, null, 2));
    }
  }

  // Track an event in Customer.io
  function trackEventInCustomerIO(eventName) {
    const properties = getCleanedCustomerIoData();
    window.analytics.track(eventName, properties);
    // console.log("Customer.io: Tracked event", eventName, "with properties:", JSON.stringify(properties, null, 2));
  }

// --- Event Listeners ---

  // Run on initial page load for both /quiz and /results
  document.addEventListener('DOMContentLoaded', () => {
    // Initial identification attempt
    identifyUserInCustomerIO();
    // console.log("Customer.io: Initial identify call on page load.");

    // Add specific listeners based on page type or element presence

    // --- Listener for Quiz Step Completion ---
    document.body.addEventListener('click', function(event) {
        // Check if the click target (or its parent) is a next button
        const nextButton = event.target.closest('[data-form="next-btn"]');
        if (nextButton) {
            // Use requestAnimationFrame to defer execution until after quiz.js sync updates
            requestAnimationFrame(() => {
                // console.log("Customer.io: Quiz step next button clicked.");
                identifyUserInCustomerIO(); // Update traits/identity
                trackEventInCustomerIO('Quiz Step Completed'); // Track the step event
            });
        }
    });

    // --- Listeners for Final Results Submission ---
    const finalSubmitSelectors = [
        '#wf-form-Pricing-Top',
        '#wf-form-Pricing-Bottom',
        '.submit-button', // General submit buttons
        '.base-button.pricing-button' // Specific pricing buttons
    ];

    finalSubmitSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element.tagName === 'FORM') {
                element.addEventListener('submit', function(event) {
                    // Don't prevent default here, let moveo-dev handle submission
                    // console.log("Customer.io: Results form submitted.", element.id);
                    identifyUserInCustomerIO(); // Send final traits
                    trackEventInCustomerIO('Quiz Results Submitted'); // Track final event
                });
            } else if (element.tagName === 'A' || element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
                 element.addEventListener('click', function(event) {
                    // Don't prevent default here, let moveo-dev handle redirection
                    // console.log("Customer.io: Results submit button clicked.");
                    identifyUserInCustomerIO(); // Send final traits
                    trackEventInCustomerIO('Quiz Results Submitted'); // Track final event
                 });
            }
        });
    });
  });

// --- Initial check (for debugging) ---
// console.log("Customer.io analytics object:", window.analytics);

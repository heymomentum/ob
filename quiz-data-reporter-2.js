// Quiz Data Reporter - Handles data reporting for quiz forms
// Version: 3.0.1

console.log('🎯 Quiz Data Reporter v3.0.1 loaded (Pre-submit mode)');

// Session storage keys
const ENDPOINT_STORAGE_KEY = 'momentum-api-endpoint';
const FORM_DATA_STORAGE_KEY = 'momentum-form-data-cache';

// ---------------------------------------------------------------------------
// Added: reliable send configuration & state flags
// ---------------------------------------------------------------------------
const SEND_TIMEOUT_MS = 5000; // max wait for primary fetch
let momentumDataSent = false; // becomes true once payload delivered
let momentumPendingData = null; // holds payload until confirmed sent

// Function to fetch user's country based on IP and store in sessionStorage
function getUserGeoLocation() {
  // Only fetch if not already set
  if (sessionStorage.getItem('momentum-user-country')) return;
  (async () => {
    try {
      // Try multiple geolocation services for better Safari compatibility
      const geoServices = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json',
      ];

      let geoData = null;
      let success = false;

      for (const service of geoServices) {
        try {
          console.log(`Trying geolocation service: ${service}`);
          const geoRes = await fetch(service, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            // Safari-friendly configuration
            mode: 'cors',
            credentials: 'omit',
          });

          if (geoRes.ok) {
            geoData = await geoRes.json();
            success = true;
            console.log(`Geolocation service ${service} succeeded`);
            break;
          }
        } catch (serviceError) {
          console.warn(`Geolocation service ${service} failed:`, serviceError);
          continue;
        }
      }

      if (success && geoData) {
        // Handle different response formats
        let countryCode = null;
        if (geoData.country_code) {
          countryCode = geoData.country_code;
        } else if (geoData.country) {
          countryCode = geoData.country;
        } else if (geoData.geoplugin_countryCode) {
          countryCode = geoData.geoplugin_countryCode;
        }

        if (countryCode) {
          sessionStorage.setItem('momentum-user-country', countryCode);
          console.log('🌍 User country detected:', countryCode);
        } else {
          console.warn(
            'Could not determine user country from geoData:',
            geoData
          );
        }
      } else {
        console.warn('All geolocation services failed, using fallback');
        // Set a fallback country code or leave empty
        sessionStorage.setItem('momentum-user-country', 'US');
      }
    } catch (error) {
      console.error('Error fetching user geolocation:', error);
      // Set fallback on complete failure
      sessionStorage.setItem('momentum-user-country', 'US');
    }
  })();
}

// Call geolocation in background after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', getUserGeoLocation);
} else {
  getUserGeoLocation();
}

// Utility function to get cookie value
function getCookie(name) {
  const nameEQ = name + '=';
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
  return Math.round(parseFloat(lbs) * 0.453592 * 10) / 10;
}

function feetInchesToCm(feet, inches) {
  if ((feet === null || isNaN(feet)) && (inches === null || isNaN(inches)))
    return null;
  feet = parseFloat(feet || 0);
  inches = parseFloat(inches || 0);
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
}

// Function to track form values from cookies (excluding name)
function trackQuizFormValues(excludeName = false) {
  const tempData = {};

  // Define fields that should be arrays
  const arrayFields = [
    'bad-habits-uni',
    'muscle-group-uni',
    'problem-areas-uni',
    'workout-location-uni',
  ];

  // Define fields that should be strings (not arrays)
  const stringFields = ['water-intake-uni'];

  // Get all cookies
  const cookies = document.cookie.split(';');

  // Process each cookie
  cookies.forEach((cookie) => {
    let [name, value] = cookie.split('=').map((part) => part.trim());

    // Skip empty cookies
    if (!value || value === 'null' || value === '') return;

    // Skip name field if excludeName is true
    if (
      excludeName &&
      (name === 'name-input' || name === 'Name' || name === 'Name-2')
    ) {
      return;
    }

    // Handle input fields that might have -input suffix
    if (name.endsWith('-input')) {
      name = name.replace('-input', '');
    }

    // Handle array fields
    if (arrayFields.includes(name)) {
      const values = value
        .split(/[,&]/)
        .map((v) => v.trim())
        .filter((v) => v !== '');
      tempData[name] = values;
    } else if (stringFields.includes(name)) {
      tempData[name] = value;
    } else if (value.includes(',')) {
      tempData[name] = value.split(',').map((v) => v.trim());
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
  const universalKeys = Object.keys(tempData).filter((key) =>
    key.endsWith('-uni')
  );
  const universalPrefixes = universalKeys.map((key) => key.replace('-uni', ''));

  const filteredOutFields = [];

  // List of health metric keys that we'll handle separately
  const healthMetricKeys = [
    'weight-lbs',
    'Weight',
    'weight-kg',
    'goal-weight-lbs',
    'goal-weight',
    'goal-weight-kg',
    'height-feet',
    'Height-Feet',
    'height-inches',
    'Height-Inches',
    'height-cm',
    'weight-unit',
    'goal-weight-unit',
    'height-unit',
  ];

  // Process all keys from tempData
  Object.keys(tempData).forEach((key) => {
    if (healthMetricKeys.includes(key)) {
      return;
    }

    if (key.endsWith('-uni')) {
      formData[key] = tempData[key];
      return;
    }

    if (
      universalPrefixes.includes(key) &&
      tempData[key + '-uni'] !== undefined
    ) {
      filteredOutFields.push(key);
      return;
    }

    formData[key] = tempData[key];
  });

  // Extract and normalize weight
  let uniWeight = null;
  if (tempData['weight-kg'] !== undefined) {
    uniWeight = tempData['weight-kg'];
  } else if (
    tempData['weight-lbs'] !== undefined ||
    tempData['Weight'] !== undefined
  ) {
    const weightLbs = tempData['weight-lbs'] || tempData['Weight'];
    uniWeight = lbsToKg(weightLbs);
  }

  // Extract and normalize goal weight
  let uniGoalWeight = null;
  if (tempData['goal-weight-kg'] !== undefined) {
    uniGoalWeight = tempData['goal-weight-kg'];
  } else if (
    tempData['goal-weight-lbs'] !== undefined ||
    tempData['goal-weight'] !== undefined
  ) {
    const goalWeightLbs =
      tempData['goal-weight-lbs'] || tempData['goal-weight'];
    uniGoalWeight = lbsToKg(goalWeightLbs);
  }

  // Extract and normalize height
  let uniHeight = null;
  if (tempData['height-cm'] !== undefined) {
    uniHeight = tempData['height-cm'];
  } else if (
    (tempData['height-feet'] !== undefined ||
      tempData['Height-Feet'] !== undefined) &&
    (tempData['height-inches'] !== undefined ||
      tempData['Height-Inches'] !== undefined)
  ) {
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
    console.log(
      'Filtered out non-universal values that have universal counterparts:',
      filteredOutFields
    );
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
    console.log(
      `Sending quiz data to API (attempt ${retryCount + 1}/${
        MAX_RETRIES + 1
      }):`,
      data
    );
    console.log('API URL:', apiUrl);

    // Try different fetch configurations for Safari compatibility
    const fetchConfigs = [
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(data),
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(data),
      },
    ];

    let response = null;
    let lastError = null;

    for (let i = 0; i < fetchConfigs.length; i++) {
      try {
        console.log(`Trying fetch config ${i + 1}/${fetchConfigs.length}`);
        response = await fetch(apiUrl, fetchConfigs[i]);

        // If we get a response, break out of the loop
        if (response) {
          console.log(
            `Fetch config ${i + 1} succeeded with status: ${response.status}`
          );
          break;
        }
      } catch (configError) {
        console.warn(`Fetch config ${i + 1} failed:`, configError);
        lastError = configError;
        continue;
      }
    }

    if (!response) {
      throw lastError || new Error('All fetch configurations failed');
    }

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
    if (
      retryCount === 0 &&
      apiUrl.startsWith('https://') &&
      apiUrl.includes('0.0.0.0:1337')
    ) {
      const httpUrl = apiUrl.replace('https://', 'http://');
      console.log(`Trying HTTP fallback: ${httpUrl}`);
      sessionStorage.setItem(ENDPOINT_STORAGE_KEY, httpUrl);
      return sendDataToApi(formData, retryCount + 1);
    }

    // Safari-specific fallback: Try using a different approach
    if (
      retryCount === 0 &&
      (error.message.includes('Load failed') ||
        error.message.includes('CORS') ||
        error.message.includes('Access-Control'))
    ) {
      console.log('Safari CORS issue detected, trying alternative approach...');

      // Try using XMLHttpRequest as a fallback for Safari
      try {
        const xhrResponse = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', apiUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Accept', 'application/json');

          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch (parseError) {
                reject(new Error('Failed to parse XHR response'));
              }
            } else {
              reject(new Error(`XHR failed with status: ${xhr.status}`));
            }
          };

          xhr.onerror = function () {
            reject(new Error('XHR request failed'));
          };

          xhr.send(JSON.stringify(data));
        });

        console.log('XHR fallback succeeded:', xhrResponse);
        return xhrResponse;
      } catch (xhrError) {
        console.warn('XHR fallback also failed:', xhrError);
      }
    }

    // Try without authentication if we get 401/403 and we're on first attempt
    if (
      retryCount === 0 &&
      (error.message.includes('401') || error.message.includes('403'))
    ) {
      console.log('Trying without authentication...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API Response (no auth):', result);
        return result;
      }
    }

    // If we haven't exceeded max retries, try again
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return sendDataToApi(formData, retryCount + 1);
    } else {
      console.error(`Failed after ${MAX_RETRIES + 1} attempts`);

      // Final fallback: Store data locally so it's not lost
      try {
        const failedData = {
          timestamp: new Date().toISOString(),
          data: formData,
          status: 'failed_to_send',
        };

        const existingFailedData = JSON.parse(
          localStorage.getItem('momentum-failed-data') || '[]'
        );
        existingFailedData.push(failedData);
        localStorage.setItem(
          'momentum-failed-data',
          JSON.stringify(existingFailedData)
        );

        console.log('Data stored locally as fallback due to API failure');
      } catch (storageError) {
        console.error('Failed to store data locally:', storageError);
      }

      throw error; // Re-throw after all retries exhausted
    }
  }
}

// Function to send only the name to update the existing record
async function sendNameToApi(name, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const apiUrl = sessionStorage.getItem(ENDPOINT_STORAGE_KEY);
  const email =
    getCookie('email-input') || getCookie('email') || getCookie('ajs_user_id');

  if (!apiUrl) {
    console.log('No API endpoint found');
    throw new Error('No API endpoint found');
  }

  if (!email) {
    console.log('No email found for name update');
    throw new Error('No email found for name update');
  }

  const data = {
    data: {
      name: name,
      email: email,
    },
  };

  try {
    console.log(
      `Sending name update to API (attempt ${retryCount + 1}/${
        MAX_RETRIES + 1
      }):`,
      data
    );
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Name Update API Response:', result);

    return result;
  } catch (error) {
    console.error(`Name Update API Error (attempt ${retryCount + 1}):`, error);

    // Try HTTP fallback if HTTPS fails and we're on first attempt
    if (
      retryCount === 0 &&
      apiUrl.startsWith('https://') &&
      apiUrl.includes('0.0.0.0:1337')
    ) {
      const httpUrl = apiUrl.replace('https://', 'http://');
      console.log(`Trying HTTP fallback for name update: ${httpUrl}`);
      sessionStorage.setItem(ENDPOINT_STORAGE_KEY, httpUrl);
      return sendNameToApi(name, retryCount + 1);
    }

    // Try without authentication if we get 401/403 and we're on first attempt
    if (
      retryCount === 0 &&
      (error.message.includes('401') || error.message.includes('403'))
    ) {
      console.log('Trying without authentication for name update...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Name Update API Response (no auth):', result);
        return result;
      }
    }

    // If we haven't exceeded max retries, try again
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying name update in ${RETRY_DELAY}ms... (${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return sendNameToApi(name, retryCount + 1);
    } else {
      console.error(`Name update failed after ${MAX_RETRIES + 1} attempts`);
      throw error; // Re-throw after all retries exhausted
    }
  }
}

// Function to retry sending failed data
async function retryFailedData() {
  try {
    const failedData = JSON.parse(
      localStorage.getItem('momentum-failed-data') || '[]'
    );
    if (failedData.length > 0) {
      console.log(
        `Found ${failedData.length} failed data entries, attempting to retry...`
      );

      const successfulRetries = [];

      for (const failedEntry of failedData) {
        try {
          await sendDataToApi(failedEntry.data);
          successfulRetries.push(failedEntry);
          console.log('Successfully retried failed data entry');
        } catch (retryError) {
          console.warn('Failed to retry data entry:', retryError);
        }
      }

      // Remove successfully retried entries
      const remainingFailedData = failedData.filter(
        (entry) => !successfulRetries.includes(entry)
      );

      localStorage.setItem(
        'momentum-failed-data',
        JSON.stringify(remainingFailedData)
      );

      if (successfulRetries.length > 0) {
        console.log(
          `Successfully retried ${successfulRetries.length} data entries`
        );
      }
    }
  } catch (error) {
    console.error('Error retrying failed data:', error);
  }
}

// Main initialization function
function initializeQuizDataReporter() {
  console.log('Quiz Data Reporter initialized (Pre-submit mode)');

  // Determine default API endpoint based on domain
  const currentDomain = window.location.hostname;
  const defaultEndpoint =
    currentDomain === 'try-momentum.com' ||
    currentDomain === 'www.try-momentum.com'
      ? 'https://o37rcsefc3.execute-api.us-east-1.amazonaws.com/production/api/onboarding/qst'
      : 'https://4bropw3xnc.execute-api.eu-central-1.amazonaws.com/development/api/onboarding/qst';

  console.log(`Quiz form data will be reported to: ${defaultEndpoint}`);

  // Set the endpoint in session storage if not already set
  if (!sessionStorage.getItem(ENDPOINT_STORAGE_KEY)) {
    sessionStorage.setItem(ENDPOINT_STORAGE_KEY, defaultEndpoint);
    console.log('API endpoint initialized in session storage');
  }

  // Setup pre-submit handler (name-btn button)
  function setupPreSubmitHandler() {
    const nameButton = document.querySelector('[custom-data="name-btn"]');
    if (nameButton) {
      console.log('Found name-btn button, setting up pre-submit handler...');

      // Add our click handler without removing existing functionality
      nameButton.addEventListener('click', function (event) {
        console.log(
          'Name button clicked - sending pre-submit data in background'
        );

        // Send data in background (don't await) - don't prevent default
        sendPreSubmitData();
      });

      console.log('Pre-submit handler setup complete');
    }
  }

  // Function to send pre-submit data
  function sendPreSubmitData() {
    try {
      // Collect all form data except name
      const formData = trackQuizFormValues(true); // excludeName = true
      console.log('Pre-submit form data cached (excluding name):', formData);
      // Cache the payload so we can merge name later
      sessionStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(formData));
      sendDataToApi(formData);
    } catch (e) {
      console.warn('Unable to cache pre-submit data:', e);
    }
  }

  // Setup final submit handler
  function setupFinalSubmitHandler() {
    const quizForm = document.querySelector('form[data-form="multistep"]');
    if (quizForm) {
      console.log('Found quiz form, setting up final submit override...');

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
        newSubmitButton.addEventListener('click', async function (event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          console.log(
            'Final submit button clicked - sending name and redirecting'
          );

          // Show loading state if available
          const loader = document.querySelector('.form-loader');
          if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
          }

          try {
            // Get the name from the input field
            const nameInput = document.querySelector(
              '[custom-data="name-input"]'
            );
            const name = nameInput ? nameInput.value : '';

            if (name) {
              console.log('Sending name via sendBeacon:', name);
              const apiUrl = sessionStorage.getItem(ENDPOINT_STORAGE_KEY);
              if (apiUrl) {
                console.log('API URL for name submission:', apiUrl);
                const email =
                  getCookie('email-input') ||
                  getCookie('email') ||
                  getCookie('ajs_user_id');
                console.log('Email for name submission:', email);
                const nameData = {
                  data: {
                    name: name,
                    email: email,
                  }
                };

                console.log('Name data to be sent:', nameData);

                try {
                  // Use text/plain MIME type so the request remains a "simple"
                  // CORS request (avoids the pre-flight that was failing due
                  // to credential mode = include).
                  const blob = new Blob([JSON.stringify(nameData)], {
                    type: 'text/plain',
                  });
                  const success = navigator.sendBeacon(apiUrl, blob);
                  console.log('Name sendBeacon result:', success);
                } catch (beaconError) {
                  console.warn(
                    'sendBeacon failed, falling back to fetch without waiting:',
                    beaconError
                  );
                  // Fallback to fetch without waiting - use CORS-safe config
                  fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    body: JSON.stringify(nameData),
                  }).catch((error) => {
                    console.error(
                      'Error sending name via fetch fallback:',
                      error
                    );
                  });
                }
              }
            }

            // Get email from cookies for redirect URL
            const email =
              getCookie('email-input') ||
              getCookie('email') ||
              getCookie('ajs_user_id');
            const country = sessionStorage.getItem('momentum-user-country');

            // Build redirect URL with email and country
            const baseUrl =
              currentDomain === 'try-momentum.com' ||
              currentDomain === 'www.try-momentum.com'
                ? 'https://ob.try-momentum.com/en/results'
                : 'https://ob-dev.try-momentum.com/en/results';
            let redirectUrl = baseUrl;
            const params = new URLSearchParams();

            if (email) {
              params.append('email', email);
            }

            if (country) {
              params.append('geo', country);
              console.log('🌍 Country detected for redirect:', country);
            }

            if (params.toString()) {
              redirectUrl += '?' + params.toString();
            }

            // Redirect to next page
            console.log('DDD Redirecting to next page...', redirectUrl);
            window.location.href = redirectUrl;
          } catch (error) {
            console.error('Error in final form submission:', error);

            // Still redirect even if name sending fails
            const email =
              getCookie('email-input') ||
              getCookie('email') ||
              getCookie('ajs_user_id');
            const country = sessionStorage.getItem('momentum-user-country');

            // Build fallback redirect URL with email and country
            let fallbackUrl =
              'https://dev.d2fs7239g9ozrr.amplifyapp.com/es/results';
            const params = new URLSearchParams();

            if (email) {
              params.append('email', email);
            }

            if (country) {
              params.append('geo', country);
              console.log(
                '🌍 Country detected for fallback redirect:',
                country
              );
            }

            if (params.toString()) {
              fallbackUrl += '?' + params.toString();
            }

            setTimeout(() => {
              window.location.href = fallbackUrl;
            }, 1000);
          }
        });

        console.log('Final submit button override complete');
      }

      // Also override form submit event as backup
      quizForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Form submit event intercepted');
      });

      console.log('Final submit override setup complete');
    } else {
      console.error('Quiz form not found');
    }
  }

  // Try to set up the handlers immediately
  setupPreSubmitHandler();
  setupFinalSubmitHandler();

  // Also try again after delays in case elements load later
  setTimeout(() => {
    setupPreSubmitHandler();
    setupFinalSubmitHandler();
  }, 1000);

  setTimeout(() => {
    setupPreSubmitHandler();
    setupFinalSubmitHandler();
  }, 2000);

  setTimeout(() => {
    setupPreSubmitHandler();
    setupFinalSubmitHandler();
  }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
  // First retry any failed data
  await retryFailedData();

  // Then initialize the quiz data reporter
  initializeQuizDataReporter();
});

// Export functions for potential external use
window.QuizDataReporter = {
  trackQuizFormValues,
  sendDataToApi,
  retryFailedData,
  // sendNameToApi is kept for potential future use but not used in current flow
  initializeQuizDataReporter,
};

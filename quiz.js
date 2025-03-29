// Utility functions
function setCookie(name, value) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
  console.log(`Cookie set: ${name} = ${value}`);
}

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

// Custom date formatting function
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Unit conversion functions
function convertImperialToMetric(feet, inches, pounds) {
  const heightCm = (feet * 30.48) + (inches * 2.54);
  const weightKg = pounds * 0.453592;
  return { heightCm, weightKg };
}

function convertMetricToImperial(cm, kg) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  const pounds = Math.round(kg * 2.20462);
  return { feet, inches, pounds };
}

// BMI calculation and updating functions
function calculateBMI(heightCm, weightKg) {
  return weightKg / Math.pow(heightCm / 100, 2);
}

function updateBMI() {
  let heightCm, weightKg;

  // Try to get metric values first
  const metricHeight = parseFloat(getCookie('height-cm'));
  const metricWeight = parseFloat(getCookie('weight-kg'));

  // If metric values are not available, try imperial
  if (isNaN(metricHeight) || isNaN(metricWeight)) {
    const feet = parseFloat(getCookie('height-feet'));
    const inches = parseFloat(getCookie('height-inches'));
    const pounds = parseFloat(getCookie('weight-lbs'));

    if (!isNaN(feet) && !isNaN(pounds)) {
      const imperial = convertImperialToMetric(feet, inches || 0, pounds);
      heightCm = imperial.heightCm;
      weightKg = imperial.weightKg;
    }
  } else {
    heightCm = metricHeight;
    weightKg = metricWeight;
  }

  console.log(`heightCm: ${heightCm}, weightKg: ${weightKg}`);

  if (!isNaN(heightCm) && !isNaN(weightKg)) {
    const bmi = calculateBMI(heightCm, weightKg);
    console.log(`Calculated BMI: ${bmi}`);
    setCookie('bmi', bmi.toFixed(2), 1); // Save BMI to cookie
    updateBMIResults(bmi);
    updateBMIExplainers(bmi);
    updateBodyVisualClass(bmi);
    dispatchBMICalculatedEvent(bmi);
  } else {
    console.log('Height or weight values not found or invalid');
  }
}

function updateBMIResults(bmi) {
  document.querySelectorAll('[custom-data="bmi-result"]').forEach(bmiResultElement => {
    bmiResultElement.textContent = `${bmi.toFixed(2)}`;
    console.log(`BMI result updated: ${bmiResultElement.textContent}`);
  });
}

function updateBMIExplainers(bmi) {
  document.querySelectorAll('[custom-data^="explainer-"]').forEach(explainerElement => {
    explainerElement.classList.add('hide-block');
  });

  let explainerElement;
  if (bmi < 18.5) {
    explainerElement = document.querySelector('[custom-data="explainer-underweight"]');
  } else if (bmi >= 18.5 && bmi <= 24.9) {
    explainerElement = document.querySelector('[custom-data="explainer-normal"]');
  } else if (bmi >= 25 && bmi <= 29.99) {
    explainerElement = document.querySelector('[custom-data="explainer-overweight"]');
  } else if (bmi >= 30) {
    explainerElement = document.querySelector('[custom-data="explainer-obese"]');
  }

  if (explainerElement) {
    explainerElement.classList.remove('hide-block');
  }
}

function updateBodyVisualClass(bmi) {
  const age = parseInt(getCookie('age'));
  if (isNaN(bmi) || isNaN(age)) {
    console.log('BMI or Age cookie is invalid');
    return;
  }

  const bodyFatPercentage = calculateBodyFatPercentage(bmi, age);
  console.log(`Calculated body fat percentage: ${bodyFatPercentage}`);
  
  const bodyVisualElement = document.querySelector('[custom-data="body-visual"]');
  if (bodyVisualElement) {
    bodyVisualElement.classList.remove('_0-10', '_10-15', '_15-20', '_20-25', '_25-30', '_30-35', '_35plus');
    if (bodyFatPercentage <= 10) bodyVisualElement.classList.add('_0-10');
    else if (bodyFatPercentage <= 15) bodyVisualElement.classList.add('_10-15');
    else if (bodyFatPercentage <= 20) bodyVisualElement.classList.add('_15-20');
    else if (bodyFatPercentage <= 25) bodyVisualElement.classList.add('_20-25');
    else if (bodyFatPercentage <= 30) bodyVisualElement.classList.add('_25-30');
    else if (bodyFatPercentage <= 35) bodyVisualElement.classList.add('_30-35');
    else bodyVisualElement.classList.add('_35plus');
  }
}

function calculateBodyFatPercentage(bmi, age) {
  return (1.20 * bmi) + (0.23 * age) - 16.2;
}

function dispatchBMICalculatedEvent(bmi) {
  const bmiEvent = new CustomEvent('bmiCalculated', {
    detail: { bmi: bmi }
  });
  document.dispatchEvent(bmiEvent);
}

function updateBMIIndicatorPosition(event) {
  console.log('Received bmiCalculated event');

  const bmi = event.detail.bmi;
  console.log(`Updating position for BMI: ${bmi}`);

  const minBMI = 17;
  const maxBMI = 35;
  const clampedBMI = Math.max(minBMI, Math.min(maxBMI, bmi));
  const percentage = ((clampedBMI - minBMI) / (maxBMI - minBMI)) * 100;
  console.log(`Calculated percentage: ${percentage}%`);

  document.querySelectorAll('[custom-data="bmi-indicator"]').forEach(bmiIndicator => {
    const parentElement = bmiIndicator.parentElement;
    if (!parentElement) {
      console.error('.bmi-indicator parent element not found');
      return;
    }

    const maxLeftPercentage = 95;
    const adjustedPercentage = Math.min(percentage, maxLeftPercentage);
    bmiIndicator.style.left = `${adjustedPercentage}%`;
    console.log(`Adjusted left position: ${adjustedPercentage}%`);
  });
}

// Fitness level calculation and updating functions
function updateFitnessLevel() {
  const pullUpsValue = getCookie('pull-ups');
  const workoutFrequencyValue = getCookie('workout-frequency');

  if (pullUpsValue !== null && workoutFrequencyValue !== null) {
    const fitnessPoints = calculateFitnessPoints(pullUpsValue, workoutFrequencyValue);
    const fitnessLevel = determineFitnessLevel(fitnessPoints);
    setCookie('fitness-level', fitnessLevel.en, 1);
    setCookie('fitness-level-es', fitnessLevel.es, 1);

    // Update text display for both languages
    document.querySelectorAll('[custom-data="fitness-level"]').forEach(fitnessLevelElement => {
      fitnessLevelElement.textContent = fitnessLevel.en;
    });

    // Hide all fitness level explanations first
    document.querySelectorAll('[custom-data^="fitness-level-"]').forEach(element => {
      element.classList.add('hide-block');
    });

    // Show the appropriate fitness level explanation
    let fitnessLevelElement;
    switch (fitnessLevel.en) {
      case 'Excellent':
        fitnessLevelElement = document.querySelector('[custom-data="fitness-level-excellent"]');
        break;
      case 'Good':
        fitnessLevelElement = document.querySelector('[custom-data="fitness-level-good"]');
        break;
      case 'Intermediate':
        fitnessLevelElement = document.querySelector('[custom-data="fitness-level-intermediate"]');
        break;
      case 'Basic':
        fitnessLevelElement = document.querySelector('[custom-data="fitness-level-basic"]');
        break;
    }

    if (fitnessLevelElement) {
      fitnessLevelElement.classList.remove('hide-block');
    }

    // Update the fitness level bars (existing functionality)
    updateFitnessLevelBar(fitnessLevel.en);
  }
}

function updateFitnessLevelBar(fitnessLevel) {
  const barElements = document.querySelectorAll('[custom-data^="fitness-level-bar-"]');
  let filledBars = 0;

  switch (fitnessLevel) {
    case 'Excellent':
      filledBars = 5;
      break;
    case 'Good':
      filledBars = 4;
      break;
    case 'Intermediate':
      filledBars = 3;
      break;
    case 'Basic':
      filledBars = 2;
      break;
    default:
      filledBars = 1;
  }

  barElements.forEach((bar, index) => {
    if (index < filledBars) {
      bar.classList.add('green');
    } else {
      bar.classList.remove('green');
    }
  });
}

function calculateFitnessPoints(pullUpsValue, workoutFrequencyValue) {
  let pullUpsPoints = 0;
  let workoutFrequencyPoints = 0;

  switch (pullUpsValue) {
    case '0':
      pullUpsPoints = 0;
      break;
    case '5':
      pullUpsPoints = 1;
      break;
    case '10':
      pullUpsPoints = 2;
      break;
    case '11':
      pullUpsPoints = 3;
      break;
  }

  switch (workoutFrequencyValue) {
    case 'Almost every day':
      workoutFrequencyPoints = 3;
      break;
    case 'Several times per week':
      workoutFrequencyPoints = 2;
      break;
    case 'Several times per month':
      workoutFrequencyPoints = 1;
      break;
    case 'Never':
      workoutFrequencyPoints = 0;
      break;
  }

  return pullUpsPoints + workoutFrequencyPoints;
}

function determineFitnessLevel(fitnessPoints) {
  if (fitnessPoints >= 5) {
    return { en: 'Excellent', es: 'Excelente' };
  } else if (fitnessPoints === 4) {
    return { en: 'Good', es: 'Bueno' };
  } else if (fitnessPoints >= 2) {
    return { en: 'Intermediate', es: 'Intermedio' };
  } else {
    return { en: 'Basic', es: 'Básico' };
  }
}

// Event listeners setup functions
function setupEventListeners() {
  setupWeightInputListeners();
  setupHeightInputListeners();
  setupGoalWeightInputListener();
  setupRadioButtonListeners();
  setupTextInputListeners();
  setupWeeklyWorkoutsListeners();
  setupCheckboxGroupListeners();
  document.addEventListener('bmiCalculated', updateBMIIndicatorPosition);
}

function setupWeightInputListeners() {
  // Metric weight input
  const weightKgInput = document.querySelector('[custom-data="weight-kg"]');
  if (weightKgInput) {
    weightKgInput.addEventListener('input', handleWeightKgInputChange);
  }

  // Imperial weight input
  const weightLbsInput = document.querySelector('[custom-data="weight-lbs"]');
  if (weightLbsInput) {
    weightLbsInput.addEventListener('input', handleWeightLbsInputChange);
  }
}

function handleWeightKgInputChange() {
  const weightKg = this.value;
  setCookie('weight-kg', weightKg, 1);
  setCookie('weight-unit', 'metric', 1);
  console.log(`Weight kg cookie updated: ${weightKg}`);
  updateBMI();
  updateGoalWeightDate();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function handleWeightLbsInputChange() {
  const weightLbs = this.value;
  setCookie('weight-lbs', weightLbs, 1);
  setCookie('weight-unit', 'imperial', 1);
  console.log(`Weight lbs cookie updated: ${weightLbs}`);
  updateBMI();
  updateGoalWeightDate();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function getNormalizedWeight() {
  const unit = getCookie('weight-unit');
  if (unit === 'metric') {
    return parseFloat(getCookie('weight-kg'));
  } else {
    const weightLbs = parseFloat(getCookie('weight-lbs'));
    return weightLbs * 0.453592;
  }
}

function setupHeightInputListeners() {
  // Metric height input
  const heightCmInput = document.querySelector('[custom-data="height-cm"]');
  if (heightCmInput) {
    heightCmInput.addEventListener('input', handleHeightCmInputChange);
  }

  // Imperial height inputs
  const heightFtInput = document.querySelector('[custom-data="height-feet"]');
  const heightInInput = document.querySelector('[custom-data="height-inches"]');
  
  if (heightFtInput) {
    heightFtInput.addEventListener('input', handleHeightImperialInputChange);
  }
  if (heightInInput) {
    heightInInput.addEventListener('input', handleHeightImperialInputChange);
  }
}

function handleHeightCmInputChange() {
  const heightCm = this.value;
  setCookie('height-cm', heightCm, 1);
  console.log(`Height cm cookie updated: ${heightCm}`);
  updateBMI();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function handleHeightImperialInputChange() {
  const feet = parseFloat(document.querySelector('[custom-data="height-feet"]')?.value || 0);
  const inches = parseFloat(document.querySelector('[custom-data="height-inches"]')?.value || 0);
  
  if (!isNaN(feet)) {
    const heightCm = (feet * 30.48) + (inches * 2.54);
    setCookie('height-feet', feet, 1);
    setCookie('height-inches', inches, 1);
    setCookie('height-cm', heightCm.toFixed(2), 1);
    console.log(`Height imperial cookie updated: ${feet}'${inches}", converted to cm: ${heightCm}`);
    updateBMI();
    document.dispatchEvent(new Event('updateChartAndGoalDate'));
  }
}

function setupGoalWeightInputListener() {
  // Metric goal weight input
  const goalWeightKgInput = document.querySelector('[custom-data="goal-weight-kg"]');
  if (goalWeightKgInput) {
    goalWeightKgInput.addEventListener('input', handleGoalWeightKgInputChange);
  }

  // Imperial goal weight input
  const goalWeightLbsInput = document.querySelector('[custom-data="goal-weight-lbs"]');
  if (goalWeightLbsInput) {
    goalWeightLbsInput.addEventListener('input', handleGoalWeightLbsInputChange);
  }
}

function handleGoalWeightKgInputChange() {
  const goalWeightKg = this.value;
  setCookie('goal-weight-kg', goalWeightKg, 1);
  setCookie('goal-weight-unit', 'metric', 1);
  console.log(`Goal weight kg cookie updated: ${goalWeightKg}`);
  updateGoalWeightDisplay();
  updateGoalWeightDate();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function handleGoalWeightLbsInputChange() {
  const goalWeightLbs = this.value;
  setCookie('goal-weight-lbs', goalWeightLbs, 1);
  setCookie('goal-weight-unit', 'imperial', 1);
  console.log(`Goal weight lbs cookie updated: ${goalWeightLbs}`);
  updateGoalWeightDisplay();
  updateGoalWeightDate();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function getNormalizedGoalWeight() {
  const unit = getCookie('goal-weight-unit');
  if (unit === 'metric') {
    return parseFloat(getCookie('goal-weight-kg'));
  } else {
    const weightLbs = parseFloat(getCookie('goal-weight-lbs'));
    return weightLbs * 0.453592;
  }
}

function updateGoalWeightDisplay() {
  const unit = getCookie('goal-weight-unit');
  let displayValue, displayUnit;
  
  if (unit === 'metric') {
    displayValue = getCookie('goal-weight-kg');
    displayUnit = 'kg';
  } else {
    displayValue = getCookie('goal-weight-lbs');
    displayUnit = 'lbs';
  }
  
  console.log('Updating goal weight display:', displayValue, displayUnit);
  document.querySelectorAll('[custom-data="show-goal-weight"]').forEach(goalWeightElement => {
    goalWeightElement.textContent = `${displayValue} ${displayUnit}`;
  });
  updateGoalWeightDate();
}

function updateGoalWeightDate() {
  const currentWeightKg = getNormalizedWeight();
  const goalWeightKg = getNormalizedGoalWeight();

  console.log('Updating goal weight date. Current weight (kg):', currentWeightKg, 'Goal weight (kg):', goalWeightKg);

  if (currentWeightKg && goalWeightKg) {
    const goalDate = calculateGoalWeightDate(currentWeightKg, goalWeightKg);
    const currentDate = new Date();
    console.log('Calculated goal date:', goalDate);

    // Format the date for English
    let englishDisplayDate;
    if (goalDate.getFullYear() === currentDate.getFullYear()) {
      englishDisplayDate = goalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } else {
      englishDisplayDate = goalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Format the date for Spanish
    let spanishDisplayDate;
    if (goalDate.getFullYear() === currentDate.getFullYear()) {
      spanishDisplayDate = goalDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' });
    } else {
      spanishDisplayDate = goalDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    console.log('Display dates - English:', englishDisplayDate, 'Spanish:', spanishDisplayDate);

    // Store the full date string in the cookie (keep in English format for consistency)
    const fullDateString = goalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    setCookie('goal-weight-date', fullDateString, 1);
    console.log('Goal weight date cookie updated:', fullDateString);

    // Update English elements
    document.querySelectorAll('[custom-data="goal-weight-date"]').forEach(element => {
      element.textContent = englishDisplayDate;
      console.log('Set English goal weight date element text to:', englishDisplayDate);
    });

    // Update Spanish elements
    document.querySelectorAll('[custom-data="goal-weight-date-es"]').forEach(element => {
      element.textContent = spanishDisplayDate;
      console.log('Set Spanish goal weight date element text to:', spanishDisplayDate);
    });
  } else {
    console.log('Weight or goal weight is missing');
  }
}

function calculateGoalWeightDate(currentWeightKg, goalWeightKg) {
  console.log('Calculating goal date. Current weight (kg):', currentWeightKg, 'Goal weight (kg):', goalWeightKg);
  
  const isLosingWeight = currentWeightKg > goalWeightKg;
  const weightChangePerWeek = isLosingWeight ? 0.75 : 0.3; // kg per week
  const totalWeightChange = Math.abs(currentWeightKg - goalWeightKg);
  const timeToGoalInWeeks = totalWeightChange / weightChangePerWeek;
  const currentDate = new Date();
  const goalDate = new Date(currentDate.getTime() + timeToGoalInWeeks * 7 * 24 * 60 * 60 * 1000);
  
  console.log('Current date:', currentDate);
  console.log('Calculated goal date:', goalDate);
  
  return goalDate;
}

function setupRadioButtonListeners() {
  document.querySelectorAll('input[type="radio"]').forEach(radioButton => {
    radioButton.addEventListener('change', handleRadioButtonChange);
  });
}

function handleRadioButtonChange(event) {
  const { name, value } = event.target;
  const uniValue = event.target.getAttribute('uni-value');
  
  // Save localized value
  setCookie(name, value, 1);
  // Save universal value
  setCookie(`${name}-uni`, uniValue, 1);
  
  console.log(`Radio cookie set: ${name}=${value}, ${name}-uni=${uniValue}`);

  if (name === 'body-type') {
    updateMetabolismDisplay();
  }

  updateFitnessLevel();
}

function updateMetabolismDisplay() {
  const bodyType = getCookie('body-type');
  console.log(`Body Type from cookie: ${bodyType}`);

  document.querySelectorAll('[custom-data^="metabolism-"]').forEach(metabolismElement => {
    metabolismElement.classList.add('hide-block');
  });

  let metabolismElement;
  if (bodyType === 'Endomorph' || bodyType === 'Endomorfo') {
    metabolismElement = document.querySelector('[custom-data="metabolism-endomorph"]');
  } else if (bodyType === 'Mesomorph' || bodyType === 'Mesomorfo') {
    metabolismElement = document.querySelector('[custom-data="metabolism-mesomorph"]');
  } else if (bodyType === 'Ectomorph' || bodyType === 'Ectomorfo') {
    metabolismElement = document.querySelector('[custom-data="metabolism-ectomorph"]');
  }

  if (metabolismElement) {
    metabolismElement.classList.remove('hide-block');
  }
}

// New functions for text inputs
function setupTextInputListeners() {
  setupTextInputListener('name-input');
  setupTextInputListener('email-input');
  setupTextInputListener('age');
}

function setupTextInputListener(customDataAttribute) {
  const inputElement = document.querySelector(`[custom-data="${customDataAttribute}"]`);
  if (inputElement) {
    inputElement.addEventListener('input', () => handleTextInputChange(inputElement, customDataAttribute));
  } else {
    console.log(`${customDataAttribute} input not found`);
  }
}

function handleTextInputChange(inputElement, customDataAttribute) {
  const value = inputElement.value;
  setCookie(customDataAttribute, value, 1);
  console.log(`${customDataAttribute} cookie updated: ${value}`);
  if (customDataAttribute === 'age' || customDataAttribute === 'bmi') {
    const bmi = parseFloat(getCookie('bmi'));
    const age = parseInt(getCookie('age'));
    if (!isNaN(bmi) && !isNaN(age)) {
      updateBodyVisualClass(bmi);
      updateBMIExplainers(bmi); // Add this line to update explainers on age change
    }
  }
}

// New functions for weekly workouts
function setupWeeklyWorkoutsListeners() {
  document.querySelectorAll('[name="weekly-workouts"]').forEach(radioButton => {
    radioButton.addEventListener('change', handleWeeklyWorkoutsChange);
  });
}

function handleWeeklyWorkoutsChange(event) {
  const { name, value } = event.target;
  setCookie(name, value, 1);
  console.log(`${name} cookie updated: ${value}`);
}

// New functions for checkbox groups
function setupCheckboxGroupListeners() {
  // Find all elements that have checkbox-group attribute
  const checkboxGroups = document.querySelectorAll('[checkbox-group]');
  checkboxGroups.forEach(group => {
    const groupName = group.getAttribute('checkbox-group');
    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => handleCheckboxGroupChange(group, groupName));
    });
  });
}

function handleCheckboxGroupChange(groupContainer, groupName) {
  // Get selected checkboxes
  const selectedCheckboxes = Array.from(groupContainer.querySelectorAll('input[type="checkbox"]:checked'));
  
  // Get localized values
  const selectedValues = selectedCheckboxes
    .map(checkbox => checkbox.getAttribute('data-name') || checkbox.name)
    .filter(Boolean)
    .join(' & ');
    
  // Get universal values
  const selectedUniValues = selectedCheckboxes
    .map(checkbox => checkbox.getAttribute('uni-value'))
    .filter(Boolean)
    .join(' & ');
    
  // Save both cookies
  setCookie(groupName, selectedValues, 1);
  setCookie(`${groupName}-uni`, selectedUniValues, 1);
  
  console.log(`Checkbox group cookies set: ${groupName}=${selectedValues}, ${groupName}-uni=${selectedUniValues}`);
}

function updateGoalWeightFromCookie() {
  const goalWeight = getCookie('goal-weight-kg');
  if (goalWeight) {
    updateGoalWeightDisplay(goalWeight);
  }
}

// New function for consent checkbox
function setupConsentCheckboxListener() {
  const consentCheckbox = document.querySelector('[custom-data="consent-checkbox"]');
  if (!consentCheckbox) {
    console.log('Consent checkbox not found in the DOM');
    return;
  }

  // Add event listener on 'change'
  consentCheckbox.addEventListener('change', () => {
    if (consentCheckbox.checked) {
      // Capture timestamp
      const timestamp = new Date().toISOString();
      setCookie('consent-checkbox-timestamp', timestamp);

      // Retrieve label text using the span with for attribute
      const labelSpan = document.querySelector(`span.w-form-label[for="${consentCheckbox.id}"]`);
      const labelText = labelSpan ? labelSpan.textContent.trim() : 'Unknown Label';

      setCookie('consent-checkbox-label', labelText);
      console.log('Consent checkbox checked. Timestamp and label saved.');
    } else {
      // Clear cookies on uncheck
      document.cookie = 'consent-checkbox-timestamp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'consent-checkbox-label=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('Consent checkbox unchecked; cookies cleared.');
    }
  });
  
  // Check if the checkbox is already checked on page load
  // This handles the case where the page refreshes but the checkbox remains checked
  if (consentCheckbox.checked) {
    const timestamp = new Date().toISOString();
    setCookie('consent-checkbox-timestamp', timestamp);
    
    const labelSpan = document.querySelector(`span.w-form-label[for="${consentCheckbox.id}"]`);
    const labelText = labelSpan ? labelSpan.textContent.trim() : 'Unknown Label';
    
    setCookie('consent-checkbox-label', labelText);
    console.log('Consent checkbox found already checked on page load. Timestamp and label saved.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  setupEventListeners();
  setupCheckboxGroupListeners();
  setupConsentCheckboxListener();
  updateBMI();
  updateFitnessLevel();
  updateMetabolismDisplay();
  updateGoalWeightFromCookie();
  updateGoalWeightDate();
});
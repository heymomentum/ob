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

// BMI calculation and updating functions
function calculateBMI(heightCm, weightKg) {
  return weightKg / Math.pow(heightCm / 100, 2);
}

function updateBMI() {
  const heightCm = parseFloat(getCookie('height-cm'));
  const weightKg = parseFloat(getCookie('weight-kg'));

  console.log(`heightCm: ${heightCm}, weightKg: ${weightKg}`);

  if (!isNaN(heightCm) && !isNaN(weightKg)) {
    const bmi = calculateBMI(heightCm, weightKg);
    console.log(`Calculated BMI: ${bmi}`);
    setCookie('bmi', bmi.toFixed(2), 1); // Save BMI to cookie
    updateBMIResults(bmi);
    updateBMIExplainers(bmi);
    updateBodyVisualClass(bmi); // Update the body visual class based on BMI
    dispatchBMICalculatedEvent(bmi);
  } else {
    console.log('Height or weight cookie not found or invalid');
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
    setCookie('fitness-level', fitnessLevel, 1); // Save fitness level to cookie

    document.querySelectorAll('[custom-data="fitness-level"]').forEach(fitnessLevelElement => {
      fitnessLevelElement.textContent = fitnessLevel;
    });

    // Update fitness level bar
    updateFitnessLevelBar(fitnessLevel);
  }
}

function updateFitnessLevelBar(fitnessLevel) {
  const barElements = document.querySelectorAll('[custom-data^="fitness-level-bar-"]');
  let filledBars = 0;

  switch (fitnessLevel) {
    case 'Excelente':
      filledBars = 5;
      break;
    case 'Buena':
      filledBars = 4;
      break;
    case 'Intermedio':
      filledBars = 3;
      break;
    case 'Básica':
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
    return 'Excelente';
  } else if (fitnessPoints === 4) {
    return 'Buena';
  } else if (fitnessPoints >= 2) {
    return 'Intermedio';
  } else {
    return 'Básica';
  }
}

// Event listeners setup functions
function setupEventListeners() {
  setupWeightInputListener();
  setupHeightInputListener();
  setupGoalWeightInputListener();
  setupRadioButtonListeners();
  setupTextInputListeners();
  setupWeeklyWorkoutsListeners();
  setupCheckboxGroupListeners();
  document.addEventListener('bmiCalculated', updateBMIIndicatorPosition);
}

function setupWeightInputListener() {
  const weightInput = document.querySelector('[custom-data="weight-kg"]');
  if (weightInput) {
    weightInput.addEventListener('input', handleWeightInputChange);
  } else {
    console.log('Weight input not found');
  }
}

function handleWeightInputChange() {
  const weight = this.value;
  setCookie('weight-kg', weight, 1);
  console.log(`Weight cookie updated: ${weight}`);
  updateBMI();
  updateGoalWeightDate(); 
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function setupHeightInputListener() {
  const heightCmInput = document.querySelector('[custom-data="height-cm"]');
  if (heightCmInput) {
    heightCmInput.addEventListener('input', handleHeightCmInputChange);
  } else {
    console.log('Height input not found');
  }
}

function handleHeightCmInputChange() {
  const heightCm = this.value;
  setCookie('height-cm', heightCm, 1);
  console.log(`Height cm cookie updated: ${heightCm}`);
  updateBMI();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function setupGoalWeightInputListener() {
  const goalWeightInput = document.querySelector('[custom-data="goal-weight-kg"]');
  if (goalWeightInput) {
    goalWeightInput.addEventListener('input', handleGoalWeightInputChange);
  } else {
    console.log('Goal weight input not found');
  }
}

function handleGoalWeightInputChange() {
  const goalWeight = this.value;
  setCookie('goal-weight-kg', goalWeight, 1);
  console.log(`Goal weight cookie updated: ${goalWeight}`);
  updateGoalWeightDisplay(goalWeight);
  updateGoalWeightDate();
  document.dispatchEvent(new Event('updateChartAndGoalDate'));
}

function updateGoalWeightDate() {
  const weight = parseFloat(getCookie('weight-kg'));
  const goalWeight = parseFloat(getCookie('goal-weight-kg'));
  console.log('Updating goal weight date. Current weight:', weight, 'Goal weight:', goalWeight);

  if (weight && goalWeight) {
    const goalDate = calculateGoalWeightDate(weight, goalWeight);
    const currentDate = new Date();
    console.log('Calculated goal date:', goalDate);

    // Format the date for display
    let displayDate;
    if (goalDate.getFullYear() === currentDate.getFullYear()) {
      displayDate = goalDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' });
    } else {
      displayDate = goalDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    console.log('Display date:', displayDate);

    // Store the full date string in the cookie
    const fullDateString = goalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    setCookie('goal-weight-date', fullDateString, 1);
    console.log('Goal weight date cookie updated:', fullDateString);

    document.querySelectorAll('[custom-data="goal-weight-date"]').forEach(goalWeightDateElement => {
      goalWeightDateElement.textContent = `${displayDate}`;
      console.log('Set goal weight date element text to:', displayDate);
    });
  } else {
    console.log('Weight or goal weight is missing');
  }
}

function updateGoalWeightDisplay(goalWeight) {
  console.log('Updating goal weight display:', goalWeight);
  document.querySelectorAll('[custom-data="show-goal-weight"]').forEach(goalWeightElement => {
    goalWeightElement.textContent = `${goalWeight} kg`;
  });
  updateGoalWeightDate();
  const weight = parseFloat(getCookie('weight-kg'));
  console.log('Current weight:', weight);
  if (weight && goalWeight) {
    const goalDate = calculateGoalWeightDate(weight, parseFloat(goalWeight));
    const currentDate = new Date();
    console.log('Goal date:', goalDate);
    console.log('Current date:', currentDate);

    // Format the date for display
    let displayDate;
    if (goalDate.getFullYear() === currentDate.getFullYear()) {
      displayDate = goalDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' });
    } else {
      displayDate = goalDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    console.log('Display date:', displayDate);

    // Store the full date string in the cookie
    const fullDateString = goalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    setCookie('goal-weight-date', fullDateString, 1);

    document.querySelectorAll('[custom-data="goal-weight-date"]').forEach(goalWeightDateElement => {
      goalWeightDateElement.textContent = `Fecha objetivo: ${displayDate}`;
      console.log('Set goal weight date element text to:', displayDate);
    });
  } else {
    console.log('Weight or goal weight is missing');
  }
}

function calculateGoalWeightDate(weight, goalWeight) {
  console.log('Calculating goal date. Weight:', weight, 'Goal weight:', goalWeight);
  const isLosingWeight = weight > goalWeight;
  const weightChangePerWeek = isLosingWeight ? 0.75 : 0.3; // Adjusted for kg
  const totalWeightChange = Math.abs(weight - goalWeight);
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
  if (bodyType === 'Endomorfo') {
    metabolismElement = document.querySelector('[custom-data="metabolism-endomorph"]');
  } else if (bodyType === 'Mesomorfo') {
    metabolismElement = document.querySelector('[custom-data="metabolism-mesomorph"]');
  } else if (bodyType === 'Ectomorfo') {
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

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  setupEventListeners();
  setupCheckboxGroupListeners();
  updateBMI();
  updateFitnessLevel();
  updateMetabolismDisplay();
  updateGoalWeightFromCookie();
  updateGoalWeightDate();
});
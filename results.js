// Results data population script
// Utility functions
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

function calculateBodyFatPercentage(bmi, age) {
  return (1.20 * bmi) + (0.23 * age) - 16.2;
}

function determineBodyFatRange(bodyFatPercentage) {
  if (bodyFatPercentage <= 10) return "3-10%";
  if (bodyFatPercentage <= 15) return "10-15%";
  if (bodyFatPercentage <= 20) return "15-20%";
  if (bodyFatPercentage <= 25) return "20-25%";
  if (bodyFatPercentage <= 30) return "25-30%";
  if (bodyFatPercentage <= 35) return "30-35%";
  return "35%+";
}

function displayBodyFatPercentage() {
  const bmi = parseFloat(getCookie('bmi'));
  const age = parseInt(getCookie('age'));
  console.log(`BMI from cookie: ${bmi}, Age from cookie: ${age}`);
  if (isNaN(bmi) || isNaN(age)) {
    console.log('BMI or Age cookie is invalid');
    return;
  }
  const bodyFatPercentage = calculateBodyFatPercentage(bmi, age);
  const bodyFatRange = determineBodyFatRange(bodyFatPercentage);
  console.log(`Calculated body fat percentage: ${bodyFatPercentage}, Body fat range: ${bodyFatRange}`);

  const bodyFatElement = document.querySelector('[custom-data="show-body-fat"]');
  if (bodyFatElement) {
    bodyFatElement.textContent = bodyFatRange;
  }

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

function displayFitnessLevel() {
  const fitnessLevel = getCookie('fitness-level');
  console.log(`Fitness Level from cookie: ${fitnessLevel}`);
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

  for (let i = 1; i <= 5; i++) {
    const element = document.querySelector(`[custom-data="fitness-level-bar-${i}"]`);
    if (element) {
      if (i <= filledBars) {
        element.classList.add('green');
      } else {
        element.classList.remove('green');
      }
    }
  }

  const showFitnessLevelElement = document.querySelector('[custom-data="show-fitness-level"]');
  if (showFitnessLevelElement) {
    showFitnessLevelElement.textContent = fitnessLevel;
  }
}

function updateBMIIndicator() {
  const bmi = parseFloat(getCookie('bmi'));
  console.log(`BMI from cookie: ${bmi}`);
  if (isNaN(bmi)) {
    console.log('BMI cookie is invalid');
    return;
  }

  const minBMI = 17;
  const maxBMI = 35;
  const clampedBMI = Math.max(minBMI, Math.min(maxBMI, bmi));
  const percentage = ((clampedBMI - minBMI) / (maxBMI - minBMI)) * 100;
  console.log(`Calculated BMI percentage: ${percentage}%`);

  document.querySelectorAll('[custom-data="bmi-indicator"]').forEach(bmiIndicator => {
    if (bmiIndicator) {
      bmiIndicator.style.left = `${percentage}%`;
    }
  });

  const bmiResultElement = document.querySelector('[custom-data="bmi-result"]');
  if (bmiResultElement) {
    bmiResultElement.textContent = bmi.toFixed(2);
  }

  updateBMIExplainers(bmi);
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

function calculateBMR(weightKg, heightCm, age, gender) {
  if (gender === 'male' || gender === null) { // Default to male if gender is null
    return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
  }
  return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
}

function calculateTotalDailyExpenditure(bmr, workouts) {
  switch (workouts) {
    case '1-2 times':
    case '3-4 times':
    case '5+ times':
      return bmr * 1.15;
    default:
      return bmr;
  }
}

function calculateRecommendedCalories(weight, goalWeight, totalDailyExpenditure) {
  if (goalWeight < weight) {
    return totalDailyExpenditure;
  }
  return totalDailyExpenditure + 250;
}

function displayRecommendedCalories() {
  let weightKg, heightCm;
  const isMetric = document.querySelector('[custom-data="weight-kg"]') !== null;

  if (isMetric) {
    weightKg = parseFloat(getCookie('weight-kg'));
    heightCm = parseFloat(getCookie('height-cm'));
  } else {
    const weightLbs = parseFloat(getCookie('weight-lbs'));
    const feet = parseFloat(getCookie('height-feet'));
    const inches = parseFloat(getCookie('height-inches')) || 0;
    
    weightKg = weightLbs * 0.453592;
    heightCm = (feet * 30.48) + (inches * 2.54);
  }

  const age = parseInt(getCookie('age'));
  const gender = getCookie('gender');
  let goalWeightKg;

  if (isMetric) {
    goalWeightKg = parseFloat(getCookie('goal-weight-kg'));
  } else {
    const goalWeightLbs = parseFloat(getCookie('goal-weight-lbs'));
    goalWeightKg = goalWeightLbs * 0.453592;
  }

  const workouts = getCookie('weekly-workouts');
  console.log(`Weight: ${weightKg}kg, Height: ${heightCm}cm, Age: ${age}, Gender: ${gender}, Goal Weight: ${goalWeightKg}kg, Workouts: ${workouts}`);

  if (isNaN(weightKg) || isNaN(heightCm) || isNaN(age) || isNaN(goalWeightKg)) {
    console.log('One or more required values are invalid');
    return;
  }

  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  console.log(`Calculated BMR: ${bmr}`);
  const totalDailyExpenditure = calculateTotalDailyExpenditure(bmr, workouts);
  console.log(`Total Daily Expenditure: ${totalDailyExpenditure}`);
  const recommendedCalories = calculateRecommendedCalories(weightKg, goalWeightKg, totalDailyExpenditure);
  console.log(`Recommended Calories: ${recommendedCalories}`);

  const caloriesResultElement = document.querySelector('[custom-data="calories-result"]');
  if (caloriesResultElement) {
    caloriesResultElement.textContent = recommendedCalories.toFixed(0);
  }

  const caloriePercentage = ((recommendedCalories - 1000) / 2000) * 100;
  const adjustedCaloriePercentage = Math.max(0, Math.min(100, caloriePercentage));
  console.log(`Calorie Indicator Percentage: ${adjustedCaloriePercentage}%`);

  const calorieIndicatorElement = document.querySelector('[custom-data="calories-indicator"]');
  if (calorieIndicatorElement) {
    calorieIndicatorElement.style.width = `${adjustedCaloriePercentage}%`;
  }
}

function displayWaterIntake() {
  let weightKg;
  const isMetric = document.querySelector('[custom-data="weight-kg"]') !== null;

  if (isMetric) {
    weightKg = parseFloat(getCookie('weight-kg'));
  } else {
    const weightLbs = parseFloat(getCookie('weight-lbs'));
    weightKg = weightLbs * 0.453592;
  }

  console.log(`Weight for water calculation: ${weightKg} kg`);
  if (isNaN(weightKg)) {
    console.log('Weight value is invalid');
    return;
  }

  const dailyWaterLiters = weightKg * 0.033; // Approximately 33 ml per kg of body weight
  console.log(`Calculated daily water intake in liters: ${dailyWaterLiters}`);

  const waterResultElement = document.querySelector('[custom-data="water-result"]');
  if (waterResultElement) {
    if (isMetric) {
      waterResultElement.textContent = dailyWaterLiters.toFixed(1); // Display liters with one decimal place
    } else {
      const dailyWaterOz = dailyWaterLiters * 33.814; // Convert liters to fluid ounces
      waterResultElement.textContent = dailyWaterOz.toFixed(0); // Display ounces as whole number
    }
  }

  const minLiters = 1.5; // Minimum recommended daily water intake
  const maxLiters = 3.5; // Maximum recommended daily water intake
  const waterPercentage = ((dailyWaterLiters - minLiters) / (maxLiters - minLiters)) * 100;
  const adjustedWaterPercentage = Math.max(0, Math.min(100, waterPercentage));
  console.log(`Water Indicator Percentage: ${adjustedWaterPercentage}%`);

  const waterIndicatorElement = document.querySelector('[custom-data="water-indicator"]');
  if (waterIndicatorElement) {
    waterIndicatorElement.style.width = `${adjustedWaterPercentage}%`;
  }
}

function displayUserName() {
  const userName = getCookie('name-input');
  console.log(`User name from cookie: ${userName}`);
  const userNameElement = document.querySelector('[custom-data="show-name"]');
  if (userNameElement) {
    userNameElement.textContent = userName || "Unknown User";
    console.log(`Name updated in DOM: ${userNameElement.textContent}`);
  }
}

function displayAdditionalData() {
  const workoutDuration = getCookie('workout-duration');
  const workoutLocation = getCookie('workout-location');
  const workoutFrequency = getCookie('weekly-workouts');
  const currentWeight = getCookie('weight-kg');
  const goalWeight = getCookie('goal-weight-kg');
  const mainGoal = getCookie('main-goal');

  console.log(`Workout Duration from cookie: ${workoutDuration}`);
  console.log(`Workout Location from cookie: ${workoutLocation}`);
  console.log(`Workout Frequency from cookie: ${workoutFrequency}`);
  console.log(`Current Weight from cookie: ${currentWeight}`);
  console.log(`Goal Weight from cookie: ${goalWeight}`);
  console.log(`Main Goal from cookie: ${mainGoal}`);

  const workoutDurationElement = document.querySelector('[custom-data="workout-duration"]');
  if (workoutDurationElement) {
    workoutDurationElement.textContent = workoutDuration || "Not specified";
  }

  const workoutLocationElement = document.querySelector('[custom-data="workout-location"]');
  if (workoutLocationElement) {
    workoutLocationElement.textContent = workoutLocation ? workoutLocation.split(',').join(' & ') : "Not specified";
  }

  const workoutFrequencyElement = document.querySelector('[custom-data="workout-frequency"]');
  if (workoutFrequencyElement) {
    workoutFrequencyElement.textContent = workoutFrequency || "Not specified";
  }

  const showWeightElement = document.querySelector('[custom-data="show-weight"]');
  if (showWeightElement) {
    showWeightElement.textContent = currentWeight || "Not specified";
  }

  const showGoalWeightElement = document.querySelector('[custom-data="show-goal-weight"]');
  if (showGoalWeightElement) {
    showGoalWeightElement.textContent = goalWeight || "Not specified";
  }

  const showMainGoalElement = document.querySelector('[custom-data="show-main-goal"]');
  if (showMainGoalElement) {
    showMainGoalElement.textContent = mainGoal || "Not specified";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Landing page script loaded and running');

  displayBodyFatPercentage();
  displayFitnessLevel();
  updateBMIIndicator();
  displayRecommendedCalories();
  displayWaterIntake();
  displayUserName();
  displayAdditionalData();
});

// Timer Features Script
// Utility functions
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
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

// Timer functions
function startTimer(timerElement) {
  const timeParts = timerElement.textContent.split(':');
  let minutes = parseInt(timeParts[0], 10);
  let seconds = parseInt(timeParts[1], 10);
  let totalSeconds = minutes * 60 + seconds;

  function updateTimer() {
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      handleTimerComplete();
    } else {
      totalSeconds--;
      const minutesLeft = Math.floor(totalSeconds / 60);
      const secondsLeft = totalSeconds % 60;
      timerElement.textContent = `${minutesLeft}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
    }
  }

  const timerInterval = setInterval(updateTimer, 1000);
}

function handleTimerComplete() {
  document.querySelectorAll('[custom-data="timer-hide"]').forEach(element => {
    element.classList.add('hide-block');
  });

  document.querySelectorAll('[custom-data="timer-show"]').forEach(element => {
    element.classList.remove('hide-block');
  });

  setCookie('timer-complete', 'true', 1);
}

function applyTimerCompleteClasses() {
  document.querySelectorAll('[custom-data="timer-hide"]').forEach(element => {
    element.classList.add('hide-block');
  });

  document.querySelectorAll('[custom-data="timer-show"]').forEach(element => {
    element.classList.remove('hide-block');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Timer script loaded and running');
  
  if (getCookie('timer-complete') === 'true') {
    applyTimerCompleteClasses();
  } else {
    const timerElements = document.querySelectorAll('[custom-data="timer"]');
    timerElements.forEach(timerElement => {
      startTimer(timerElement);
    });
  }
});

// Reset Steps After Submission Script
// Remove formlyLastStep and filledInput from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    localStorage.removeItem('formlyLastStep');
    localStorage.removeItem('filledInput');

    // Optional: Log a message to the console for verification
    console.log('formlyLastStep and filledInput have been removed from localStorage');
});

// Clear localStorage before the user leaves the page
window.addEventListener('beforeunload', function() {
    localStorage.removeItem('formlyLastStep');
    localStorage.removeItem('filledInput');
});

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
  let level = 0;

  switch (fitnessLevel) {
    case 'Excellent':
      level = 4;
      break;
    case 'Good':
      level = 3;
      break;
    case 'Intermediate':
      level = 2;
      break;
    case 'Basic':
      level = 1;
      break;
  }

  for (let i = 1; i <= 4; i++) {
    const element = document.querySelector(`[custom-data="fitness-level-bar-${i}"]`);
    if (element) {
      if (i <= level) {
        element.classList.add('black');
      } else {
        element.classList.remove('black');
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

function calculateBMR(weight, height, age, gender) {
  if (gender === 'male' || gender === null) { // Default to male if gender is null
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  }
  return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
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
    return totalDailyExpenditure - 250;
  }
  return totalDailyExpenditure + 250;
}

function displayRecommendedCalories() {
  const weightLbs = parseFloat(getCookie('weight-lbs'));
  const heightFeet = parseFloat(getCookie('height-feet'));
  const heightInches = parseFloat(getCookie('height-inches')) || 0;
  const age = parseInt(getCookie('age'));
  const gender = getCookie('gender');
  const goalWeightLbs = parseFloat(getCookie('goal-weight-lbs'));
  const workouts = getCookie('weekly-workouts');
  console.log(`Weight: ${weightLbs}, Height: ${heightFeet}ft ${heightInches}in, Age: ${age}, Gender: ${gender}, Goal Weight: ${goalWeightLbs}, Workouts: ${workouts}`);

  if (isNaN(weightLbs) || isNaN(heightFeet) || isNaN(age) || isNaN(goalWeightLbs)) {
    console.log('One or more required cookies are invalid');
    return;
  }

  const weight = weightLbs * 0.453592; // Convert lbs to kg
  const height = (heightFeet * 12 + heightInches) * 2.54; // Convert inches to cm

  const bmr = calculateBMR(weight, height, age, gender);
  console.log(`Calculated BMR: ${bmr}`);
  const totalDailyExpenditure = calculateTotalDailyExpenditure(bmr, workouts);
  console.log(`Total Daily Expenditure: ${totalDailyExpenditure}`);
  const recommendedCalories = calculateRecommendedCalories(weight, goalWeightLbs * 0.453592, totalDailyExpenditure);
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
  const weightLbs = parseFloat(getCookie('weight-lbs'));
  console.log(`Weight from cookie: ${weightLbs}`);
  if (isNaN(weightLbs)) {
    console.log('Weight cookie is invalid');
    return;
  }

  const dailyWaterOunces = weightLbs * 0.66;
  console.log(`Calculated daily water intake in ounces: ${dailyWaterOunces}`);

  const waterResultElement = document.querySelector('[custom-data="water-result"]');
  if (waterResultElement) {
    waterResultElement.textContent = Math.round(dailyWaterOunces); // Changed to round number
  }

  const minOunces = 4 * 8; // 4 glasses * 8 ounces per glass
  const maxOunces = 16 * 8; // 16 glasses * 8 ounces per glass
  const waterPercentage = ((dailyWaterOunces - minOunces) / (maxOunces - minOunces)) * 100;
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
  const currentWeight = getCookie('weight-lbs');
  const goalWeight = getCookie('goal-weight-lbs');
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
</script>

<!-- Timer Features -->
<script>
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
// Function to get month name in English
function getEnglishMonthName(date) {
  return date.toLocaleString('en-US', { month: 'long' });
}

// Function to get month name in Spanish
function getSpanishMonthName(date) {
  return date.toLocaleString('es-ES', { month: 'long' });
}

// Function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to update radio button labels and values
function updateEventMonthRadios() {
  const currentDate = new Date();
  const radioButtons = document.querySelectorAll('input[custom-data="event-month"]');
  
  radioButtons.forEach((radio, index) => {
    // Calculate the date for this radio button (current month + index + 1)
    const futureDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index + 1, 1);
    
    // Get month names in both languages
    const englishMonth = getEnglishMonthName(futureDate);
    const spanishMonth = capitalizeFirstLetter(getSpanishMonthName(futureDate));
    const year = futureDate.getFullYear();
    
    // Create formatted strings
    const englishValue = `${englishMonth} ${year}`;
    const spanishValue = `${spanishMonth} ${year}`;
    const uniValue = `${futureDate.getMonth() + 1}/${year}`;
    
    // Update radio button attributes
    radio.value = englishValue;
    radio.setAttribute('data-name', englishValue);
    radio.setAttribute('uni-value', uniValue);
    
    // Find and update the corresponding label spans
    const englishSpan = document.querySelector(`[month="${index + 1}"]`);
    const spanishSpan = document.querySelector(`[month="${index + 1}-es"]`);
    
    if (englishSpan) {
      englishSpan.textContent = englishValue;
    }
    
    if (spanishSpan) {
      spanishSpan.textContent = spanishValue;
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dynamic dates script loaded');
  updateEventMonthRadios();
});

// Export functions for potential use in other scripts
window.updateEventMonthRadios = updateEventMonthRadios;

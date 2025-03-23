/**
 * Analytics tracking script
 * Handles custom event pushes to Google Tag Manager
 */

// Check if the URL contains '/results/' and push 'add_to_cart' event to dataLayer
document.addEventListener('DOMContentLoaded', function() {
  // Check if the current URL contains '/results/'
  if (window.location.pathname.includes('/results/')) {
    console.log('Results page detected, pushing add_to_cart event to dataLayer');
    
    // Ensure dataLayer is initialized
    window.dataLayer = window.dataLayer || [];
    
    // Push the add_to_cart event to dataLayer
    window.dataLayer.push({
      'event': 'add_to_cart'
    });
  }
});

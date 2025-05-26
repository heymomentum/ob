(function() {
  // Get tier from URL or default to "A"
  const urlParams = new URLSearchParams(window.location.search);
  const tierParam = urlParams.get('tier') || 'A';
  
  // Validate tier (only alphanumeric characters)
  const validTier = tierParam.match(/[A-Za-z0-9]+/)?.[0] || 'A';
  
  // Store in sessionStorage
  sessionStorage.setItem('price_tier', validTier.toUpperCase());
})(); 
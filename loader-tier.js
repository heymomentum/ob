(function() {
  // Configuration
  const LOADER_DELAY_MS = 7000; // 7 seconds

  // Resolve tier from URL, sessionStorage, or default to "A"
  const urlParams = new URLSearchParams(window.location.search);
  const tier = (urlParams.get('tier') || sessionStorage.getItem('price_tier') || 'A')
    .toUpperCase()
    .match(/[A-Za-z0-9]+/)?.[0] || 'A';

  // Determine target URL
  const targetUrl = tier === 'A' ? '/results' : `/results-${tier.toLowerCase()}`;

  // Prefetch the target page
  const prefetchLink = document.createElement('link');
  prefetchLink.rel = 'prefetch';
  prefetchLink.href = targetUrl;
  document.head.appendChild(prefetchLink);

  // Check if target page exists
  fetch(targetUrl, { method: 'HEAD' })
    .catch(() => {
      // If target doesn't exist, fallback to /results
      setTimeout(() => {
        window.location.replace('/results');
      }, LOADER_DELAY_MS);
    })
    .then(() => {
      // If target exists, redirect to it after delay
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, LOADER_DELAY_MS);
    });
})();

// Add noscript fallback
document.write('<noscript><meta http-equiv="refresh" content="0;url=/results"></noscript>'); 
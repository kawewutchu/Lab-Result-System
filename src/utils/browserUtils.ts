export function isWebView(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for common WebView indicators
  const isWebView = (
    userAgent.includes('line') ||
    userAgent.includes('wechat') ||
    /fb(av|ios|an|messenger)/i.test(userAgent) ||
    /instagram/i.test(userAgent) ||
    /webview/i.test(userAgent) ||
    // Additional checks for Thai banking apps
    /kplus/i.test(userAgent) ||
    /scbmobile/i.test(userAgent) ||
    /ttbmobile/i.test(userAgent)
  );

  // Check for standalone mode (PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return isWebView && !isStandalone;
}

export function openExternalLink(url: string) {
  if (isWebView()) {
    // Try Chrome first
    window.location.href = `googlechrome://${url}`;
    
    // Fallback to Safari after a short delay
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
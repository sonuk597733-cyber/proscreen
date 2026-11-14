export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.id === 'string' &&
    chrome.runtime.id.length > 0
  );
}

export function hasChromeStorage(): boolean {
  return isExtensionContext() && typeof chrome.storage !== 'undefined' && !!chrome.storage.local;
}

export function hasChromeTabs(): boolean {
  return isExtensionContext() && typeof chrome.tabs !== 'undefined';
}

export function hasChromeDownloads(): boolean {
  return isExtensionContext() && typeof chrome.downloads !== 'undefined';
}

export function isRestrictedBrowserUrl(url: string | undefined): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com')
  );
}

export function getTabSessionKey(url?: string, tabId?: number): string {
  if (typeof tabId === 'number' && tabId >= 0) {
    return `tab:${tabId}`;
  }
  if (typeof window !== 'undefined') {
    const targetUrl = url || window.location.href;
    try {
      const parsed = new URL(targetUrl);
      return `origin:${parsed.origin}${parsed.pathname}`;
    } catch {
      return 'local:default';
    }
  }
  return 'local:default';
}

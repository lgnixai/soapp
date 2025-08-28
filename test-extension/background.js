// Background service worker for test extension
console.log('Test Extension background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Test Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension action clicked on tab:', tab.id);
});

/**
 * Bridge between page and extension for Ethereum provider
 * This script is injected into webpages and communicates with the background script
 */

// Inject the script that will add window.ethereum
const injectScript = document.createElement('script');
injectScript.src = browser.runtime.getURL('injected.js');
injectScript.onload = () => injectScript.remove();
(document.head || document.documentElement).appendChild(injectScript);

// Set up communication bridge between page and extension
window.addEventListener('message', async (event) => {
  // Only accept messages from the current window
  if (event.source !== window || !event.data || !event.data.type) return;
  
  // Forward ethereum requests from the page to background script
  if (event.data.type === 'FROM_PAGE') {
    try {
      const response = await browser.runtime.sendMessage(event.data.message);
      // Send the response back to the injected script
      window.postMessage({ 
        type: 'FROM_EXTENSION',
        message: {
          id: event.data.message.id,
          result: response
        }
      }, '*');
    } catch (error) {
      // Send the error back to the injected script
      window.postMessage({ 
        type: 'FROM_EXTENSION',
        message: {
          id: event.data.message.id,
          error: error.message || 'Unknown error'
        }
      }, '*');
    }
  }
});

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender) => {
  // Make sure message is properly formatted for the injected script
  const formattedMessage = message;
  
  // Forward messages to the page
  window.postMessage({ type: 'FROM_EXTENSION', message: formattedMessage }, '*');
  
  // For logging/debugging
  if (message.event) {
    console.log(`[EthWallet] Forwarding event to page: ${message.event}`, message.data);
  }
});
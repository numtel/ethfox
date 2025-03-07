// Import the wallet provider
import walletProvider from './wallet-provider.js';

// Listen for messages from content script and popup
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Background received message:', request, request.params);
  
  try {
    // Handle direct requests from popup
    if (request && request.method) {
      console.log(`Processing ${request.method} request`);
      // Handle special case for wallet_removeNetwork which isn't part of standard handleRequest
      if (request.method === 'wallet_removeNetwork') {
        const result = await walletProvider.removeNetwork(request.params[0]);
        console.log('Network removed:', request.params[0]);
        return Promise.resolve(result);
      } else {
        const result = await walletProvider.handleRequest(request.method, request.params || []);
        console.log('Request result:', result);
        return Promise.resolve(result);
      }
    }
    
    // Handle requests from content script (with id)
    if (request && request.id && request.method && sender.tab) {
      let result;
      // Handle special case for wallet_removeNetwork
      if (request.method === 'wallet_removeNetwork') {
        result = await walletProvider.removeNetwork(request.params[0]);
      } else {
        result = await walletProvider.handleRequest(request.method, request.params || []);
      }
      
      browser.tabs.sendMessage(sender.tab.id, {
        id: request.id,
        result
      });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    
    // If it's from a tab, send error back to content script
    if (sender.tab) {
      browser.tabs.sendMessage(sender.tab.id, {
        id: request.id,
        error: error.message
      });
    }
    
    // Return the error to the popup
    return Promise.reject(error);
  }
  
  return true; // Keep the message channel open for asynchronous response
});

// Log when the background script initializes
console.log('Ethereum wallet background script initialized');

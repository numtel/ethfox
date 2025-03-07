// Import Buffer polyfill first
import './buffer-polyfill.js';
// Import the wallet provider
import walletProvider from './wallet-provider.js';

// Global variables to track repeated errors
let consecutiveWalletLockErrors = 0;
const ERROR_THROTTLE_THRESHOLD = 5; // How many errors before throttling logs
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 5000; // Only log errors every 5 seconds to reduce spam

// Session state for wallet unlock - retain password in memory for the browser session
let sessionPassword = null;

// Function to handle wallet errors with throttling
const handleWalletError = (error, methodName) => {
  // Check if it's a wallet locked error
  if (error.message && error.message.includes('Wallet is locked')) {
    consecutiveWalletLockErrors++;
    
    // Only log every few seconds to avoid console spam
    const currentTime = Date.now();
    if (currentTime - lastErrorLogTime > ERROR_LOG_INTERVAL || consecutiveWalletLockErrors <= ERROR_THROTTLE_THRESHOLD) {
      console.error(`Error in ${methodName}: ${error.message}`);
      lastErrorLogTime = currentTime;
      
      // If we're getting a lot of wallet locked errors, it might indicate a problem
      if (consecutiveWalletLockErrors > ERROR_THROTTLE_THRESHOLD) {
        console.warn(`${consecutiveWalletLockErrors} consecutive wallet locked errors. Wallet may need recovery.`);
      }
    }
  } else {
    // For non-wallet-locked errors, reset the counter and always log
    consecutiveWalletLockErrors = 0;
    console.error(`Error in ${methodName}:`, error);
  }
  
  return error;
};

// Listen for messages from content script and popup
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Only log non-polling requests to reduce console spam
  if (!request?.method?.includes('_getBalance') && 
      !request?.method?.includes('eth_blockNumber') &&
      !request?.method?.includes('eth_call')) {
    console.log('Background received message:', request);
  }
  
  try {
    // Handle direct requests from popup
    if (request && request.method) {
      // Log request processing for non-polling methods
      if (!request.method.includes('_getBalance') && 
          !request.method.includes('eth_blockNumber') &&
          !request.method.includes('eth_call')) {
        console.log(`Processing ${request.method} request`);
      }
      
      // Handle special cases that aren't part of standard handleRequest
      if (request.method === 'wallet_removeNetwork') {
        const result = await walletProvider.removeNetwork(request.params[0]);
        console.log('Network removed:', request.params[0]);
        return Promise.resolve(result);
      } else if (request.method === 'wallet_getPrivateKey') {
        try {
          const result = await walletProvider.getActivePrivateKey(request.params[0]?.password);
          console.log('Private key retrieved successfully');
          return Promise.resolve(result);
        } catch (error) {
          console.error('Error getting private key:', error);
          throw error;
        }
      } else if (request.method === 'wallet_isInitialized') {
        const result = await walletProvider.isWalletInitialized();
        return Promise.resolve(result);
      } else if (request.method === 'wallet_isLocked') {
        const result = await walletProvider.isWalletLocked();
        return Promise.resolve(result);
      } else if (request.method === 'wallet_lock') {
        const result = await walletProvider.lockWallet();
        // Reset error counter on explicit lock
        consecutiveWalletLockErrors = 0;
        // Clear session password on explicit lock
        sessionPassword = null;
        return Promise.resolve(result);
      } else if (request.method === 'wallet_unlock') {
        try {
          const password = request.params[0]?.password;
          const result = await walletProvider.unlockWallet(password);
          // Store password in session memory for future use
          sessionPassword = password;
          // Reset error counter on successful unlock
          consecutiveWalletLockErrors = 0;
          
          // After unlocking, immediately get accounts to make sure they're ready
          try {
            // This will ensure accounts are ready for DApps
            await walletProvider.handleRequest('eth_accounts', []);
          } catch (accountError) {
            console.warn('Error refreshing accounts after unlock:', accountError);
          }
          
          return Promise.resolve(result);
        } catch (error) {
          handleWalletError(error, 'wallet_unlock');
          throw error;
        }
      } else {
        try {
          // For wallet methods that need passwords, use session password if available
          if (request.method.startsWith('wallet_') && sessionPassword && 
              (request.method === 'wallet_getAccounts' || 
               request.method === 'wallet_addAccount' || 
               request.method === 'wallet_importAccount' || 
               request.method === 'wallet_exportWallet' ||
               request.method === 'wallet_getPrivateKey')) {
              
            // If the request doesn't include a password but we have a session password
            if (!request.params[0]?.password && sessionPassword) {
              // Clone params to avoid modifying the original
              const enhancedParams = [...(request.params || [])];
              enhancedParams[0] = { ...(enhancedParams[0] || {}), password: sessionPassword };
              console.log(`Using session password for ${request.method}`);
              
              // Use enhanced params with session password
              const result = await walletProvider.handleRequest(request.method, enhancedParams);
              
              // Success - reset consecutive error counter
              if (consecutiveWalletLockErrors > 0) {
                consecutiveWalletLockErrors = 0;
              }
              
              // Only log results for non-polling requests
              if (!request.method.includes('_getBalance') && 
                  !request.method.includes('eth_blockNumber') &&
                  !request.method.includes('eth_call')) {
                console.log('Request result:', result);
              }
              
              return Promise.resolve(result);
            }
          }
          
          // For all other methods, proceed normally
          const result = await walletProvider.handleRequest(request.method, request.params || []);
          
          // Success - reset consecutive error counter
          if (consecutiveWalletLockErrors > 0) {
            consecutiveWalletLockErrors = 0;
          }
          
          // Only log results for non-polling requests
          if (!request.method.includes('_getBalance') && 
              !request.method.includes('eth_blockNumber') &&
              !request.method.includes('eth_call')) {
            console.log('Request result:', result);
          }
          
          return Promise.resolve(result);
        } catch (error) {
          // If we encounter a wallet is locked error and have a session password, try to unlock automatically
          if (error.message && error.message.includes('Wallet is locked') && sessionPassword) {
            try {
              console.log('Attempting automatic unlock with session password');
              await walletProvider.unlockWallet(sessionPassword);
              
              // Retry the request now that the wallet is unlocked
              console.log('Retrying request after automatic unlock');
              const result = await walletProvider.handleRequest(request.method, request.params || []);
              
              // Success - reset consecutive error counter
              consecutiveWalletLockErrors = 0;
              
              return Promise.resolve(result);
            } catch (unlockError) {
              console.error('Automatic unlock failed:', unlockError);
              // If auto-unlock fails, fall through to normal error handling
              sessionPassword = null; // Clear invalid session password
            }
          }
          
          handleWalletError(error, request.method);
          throw error;
        }
      }
    }
    
    // Handle requests from content script (with id)
    if (request && request.id && request.method && sender.tab) {
      let result;
      try {
        // Handle special case for wallet_removeNetwork
        if (request.method === 'wallet_removeNetwork') {
          result = await walletProvider.removeNetwork(request.params[0]);
        } else {
          // For methods that might need a password, try to use session password
          if (request.method.startsWith('wallet_') && sessionPassword && 
              !request.params[0]?.password && 
              (request.method === 'wallet_getAccounts' || 
               request.method === 'wallet_addAccount' || 
               request.method === 'wallet_importAccount' || 
               request.method === 'wallet_exportWallet' ||
               request.method === 'wallet_getPrivateKey')) {
            
            // Clone params to avoid modifying the original
            const enhancedParams = [...(request.params || [])];
            enhancedParams[0] = { ...(enhancedParams[0] || {}), password: sessionPassword };
            
            try {
              result = await walletProvider.handleRequest(request.method, enhancedParams);
            } catch (passwordError) {
              // If session password doesn't work, try without it
              console.warn('Session password failed, trying original request');
              result = await walletProvider.handleRequest(request.method, request.params || []);
            }
          } else {
            // Normal request handling
            result = await walletProvider.handleRequest(request.method, request.params || []);
          }
        }
        
        // Success - reset consecutive error counter
        consecutiveWalletLockErrors = 0;
        
        browser.tabs.sendMessage(sender.tab.id, {
          id: request.id,
          result
        });
      } catch (error) {
        // If we encounter a wallet is locked error and have a session password, try to unlock automatically
        if (error.message && error.message.includes('Wallet is locked') && sessionPassword) {
          try {
            console.log('Attempting automatic unlock with session password for content script request');
            await walletProvider.unlockWallet(sessionPassword);
            
            // Retry the request now that the wallet is unlocked
            console.log('Retrying content script request after automatic unlock');
            if (request.method === 'wallet_removeNetwork') {
              result = await walletProvider.removeNetwork(request.params[0]);
            } else {
              result = await walletProvider.handleRequest(request.method, request.params || []);
            }
            
            // Success - return the result
            browser.tabs.sendMessage(sender.tab.id, {
              id: request.id,
              result
            });
            
            // Reset error counter
            consecutiveWalletLockErrors = 0;
            
            return;
          } catch (unlockError) {
            console.error('Automatic unlock failed for content script request:', unlockError);
            // If auto-unlock fails, fall through to normal error handling
            sessionPassword = null; // Clear invalid session password
          }
        }
        
        handleWalletError(error, request.method);
        
        browser.tabs.sendMessage(sender.tab.id, {
          id: request.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    handleWalletError(error, request?.method || 'unknown_method');
    
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
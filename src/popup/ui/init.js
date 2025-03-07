/**
 * UI Initialization Module
 * Handles the initial setup of the popup UI
 */

import { getWallet, updateWalletUIState } from '../services/wallet.js';
import { restoreState } from '../state/index.js';

// Initialize the popup UI
export const initializeUI = async () => {
  try {
    console.log('Initializing popup...');
    
    // First restore saved UI state
    try {
      await restoreState();
    } catch (stateError) {
      console.error('Error restoring UI state:', stateError);
      // Continue with initialization, as this is not critical
    }
    
    // Add emergency reset button regardless of wallet state
    if (!document.getElementById('emergency-reset-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.id = 'emergency-reset-btn';
      resetBtn.className = 'btn btn-sm btn-danger';
      resetBtn.style.display = 'none';
      resetBtn.style.marginLeft = '8px';
      resetBtn.textContent = 'Reset Wallet State';
      resetBtn.title = 'Use this if your wallet is stuck and cannot be unlocked';
      
      // Import on demand to avoid circular dependency
      resetBtn.addEventListener('click', async () => {
        const { customConfirm, showNotification } = await import('./utils.js');
        const shouldResetState = await customConfirm('WARNING: This will reset your wallet state but preserve your data. You will need to unlock your wallet again. Continue?');
        if (shouldResetState) {
          try {
            // Set wallet as locked
            await browser.storage.local.set({ 'walletEncryptionStatus': 'locked' });
            showNotification('Wallet state has been reset. Reloading...');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (error) {
            console.error('Error resetting wallet state:', error);
            showNotification('Error resetting wallet state: ' + error.message, true);
          }
        }
      });
      
      const walletHeader = document.querySelector('.card-header');
      if (walletHeader) {
        walletHeader.appendChild(resetBtn);
      }
    }
    
    // Initialize the wallet UI
    try {
      // First, check if we should show wallet setup or main UI
      await updateWalletUIState();
      
      // Then load all wallet data
      await getWallet();
    } catch (error) {
      console.error('Error initializing wallet:', error);
      
      // Show emergency reset button on initialization error
      const resetBtn = document.getElementById('emergency-reset-btn');
      if (resetBtn) {
        resetBtn.style.display = 'inline-block';
      }
      
      // Import showNotification on demand
      const { showNotification } = await import('./utils.js');
      showNotification('Error initializing wallet: ' + error.message, true);
    }
    
    console.log('Popup initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
    // Show a user-friendly error message
    const { showNotification } = await import('./utils.js');
    showNotification('Error initializing wallet: ' + error.message, true);
  }
};
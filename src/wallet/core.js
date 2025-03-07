/**
 * Core wallet management functionality
 */

import passworder from '../utils/crypto.js';
import { emitEvent } from '../utils/events.js';

// Storage key for wallet state
export const WALLET_STORAGE_KEY = 'walletState';

// Storage structure for wallet encryption status
export const WALLET_ENCRYPTION_STATUS_KEY = 'walletEncryptionStatus';

/**
 * Check if wallet is initialized
 * @returns {Promise<boolean>} True if wallet is initialized
 */
export async function isWalletInitialized() {
  try {
    const { walletEncryptionStatus } = await browser.storage.local.get(WALLET_ENCRYPTION_STATUS_KEY);
    return !!walletEncryptionStatus;
  } catch (error) {
    console.error('Error checking wallet status:', error);
    return false;
  }
}

/**
 * Check if wallet is locked
 * @returns {Promise<boolean>} True if wallet is locked
 */
export async function isWalletLocked() {
  try {
    const { walletEncryptionStatus } = await browser.storage.local.get(WALLET_ENCRYPTION_STATUS_KEY);
    return walletEncryptionStatus === 'locked';
  } catch (error) {
    console.error('Error checking wallet lock status:', error);
    return true; // Default to locked if error
  }
}

/**
 * Delete wallet data (for reset or recovery)
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteWalletData() {
  try {
    // Remove all wallet-related data from storage
    await browser.storage.local.remove([
      WALLET_STORAGE_KEY,
      'activeAccount',
      WALLET_ENCRYPTION_STATUS_KEY
    ]);
    
    console.log('Wallet data deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting wallet data:', error);
    throw new Error(`Failed to delete wallet data: ${error.message}`);
  }
}

/**
 * Lock the wallet
 * @returns {Promise<boolean>} True if successful
 */
export async function lockWallet() {
  try {
    await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'locked' });
    
    // Emit accountsChanged event with empty array to notify dApps
    await emitEvent('accountsChanged', []);
    
    return true;
  } catch (error) {
    console.error('Error locking wallet:', error);
    throw new Error(`Failed to lock wallet: ${error.message}`);
  }
}

/**
 * Unlock wallet with password
 * @param {string} password - The wallet password
 * @returns {Promise<object>} The wallet state
 */
export async function unlockWallet(password) {
  try {
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not found. Initialize wallet first.');
    }
    
    // Try to decrypt the wallet state
    try {
      const walletState = await passworder.decrypt(password, encryptedWallet);
      
      // If decryption succeeds, set wallet to unlocked
      await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked' });
      
      // Get the accounts to emit in the accountsChanged event
      let accounts = [];
      if (walletState.accounts && walletState.accounts.length > 0) {
        accounts = walletState.accounts.map(acc => acc.address);
      }
      
      // Emit accountsChanged event to notify dApps about available accounts
      await emitEvent('accountsChanged', accounts);
      
      return walletState;
    } catch (e) {
      throw new Error('Incorrect password');
    }
  } catch (error) {
    console.error('Error unlocking wallet:', error);
    throw new Error(`Failed to unlock wallet: ${error.message}`);
  }
}

/**
 * Get the wallet state (requires wallet to be unlocked)
 * @returns {Promise<string>} The encrypted wallet state
 */
export async function getWalletState() {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Get encrypted wallet state
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not initialized');
    }
    
    // We don't need to decrypt since we know it's unlocked
    // We'll pass the encrypted value through and let other functions handle decryption
    return encryptedWallet;
  } catch (error) {
    console.error('Error getting wallet state:', error);
    throw new Error(`Failed to access wallet: ${error.message}`);
  }
}

/**
 * Save wallet state (requires wallet to be unlocked)
 * @param {object} walletState - The wallet state to save
 * @param {string} password - The wallet password
 * @returns {Promise<boolean>} True if successful
 */
export async function saveWalletState(walletState, password) {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Encrypt the updated wallet state
    const encryptedWallet = await passworder.encrypt(password, walletState);
    
    // Save encrypted wallet
    await browser.storage.local.set({ [WALLET_STORAGE_KEY]: encryptedWallet });
    
    return true;
  } catch (error) {
    console.error('Error saving wallet state:', error);
    throw new Error(`Failed to save wallet state: ${error.message}`);
  }
}

/**
 * Export wallet as encrypted JSON file
 * @param {string} password - The wallet password
 * @returns {Promise<string>} The exported wallet data
 */
export async function exportWallet(password) {
  try {
    // Check if wallet is initialized
    const initialized = await isWalletInitialized();
    if (!initialized) {
      throw new Error('Wallet not initialized');
    }
    
    // Get encrypted wallet
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not found');
    }
    
    // Try to decrypt with password to verify it's correct
    try {
      await passworder.decrypt(password, encryptedWallet);
    } catch (e) {
      throw new Error('Incorrect password');
    }
    
    // Create export file with metadata
    const exportData = {
      type: 'eth-fox-wallet-backup',
      version: 1,
      timestamp: Date.now(),
      data: encryptedWallet
    };
    
    // Return the export data
    return JSON.stringify(exportData);
  } catch (error) {
    console.error('Error exporting wallet:', error);
    throw new Error(`Failed to export wallet: ${error.message}`);
  }
}

/**
 * Import wallet from encrypted JSON file
 * @param {string} fileData - The file data to import
 * @param {string} password - The wallet password
 * @returns {Promise<object>} Information about the imported wallet
 */
export async function importWallet(fileData, password) {
  try {
    // Parse the file data
    const importData = JSON.parse(fileData);
    
    // Validate the import data
    if (!importData.type || importData.type !== 'eth-fox-wallet-backup') {
      throw new Error('Invalid wallet backup file');
    }
    
    if (!importData.data) {
      throw new Error('No wallet data found in backup');
    }
    
    // Try to decrypt the wallet data with the provided password
    try {
      const walletState = await passworder.decrypt(password, importData.data);
      
      // Validate wallet state has required properties
      if (!walletState.mnemonic || !walletState.accounts || !Array.isArray(walletState.accounts)) {
        throw new Error('Invalid wallet data structure');
      }
      
      // Save the imported wallet
      await browser.storage.local.set({
        [WALLET_STORAGE_KEY]: importData.data,
        'activeAccount': 0, // Reset to first account
        [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked'
      });
      
      // Emit accountsChanged event with the first account
      if (walletState.accounts.length > 0) {
        await emitEvent('accountsChanged', [walletState.accounts[0].address]);
      }
      
      return {
        accounts: walletState.accounts.length,
        importedAccounts: walletState.customAccounts ? walletState.customAccounts.length : 0
      };
    } catch (e) {
      throw new Error('Invalid password or corrupted backup file');
    }
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw new Error(`Failed to import wallet: ${error.message}`);
  }
}
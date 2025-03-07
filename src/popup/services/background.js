/**
 * Background Service
 * Handles communication with the background script
 */

// Send a message to the background script and wait for response
export const sendToBackground = (message) => {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message).then(response => {
      resolve(response);
    }).catch(error => {
      console.error('Runtime error:', error);
      reject(error);
    });
  });
};

// Check if wallet is initialized
export const checkWalletInitialized = async () => {
  try {
    const isInitialized = await sendToBackground({
      method: 'wallet_isInitialized',
      params: []
    });
    
    return isInitialized;
  } catch (error) {
    console.error('Error checking wallet initialization status:', error);
    return false;
  }
};

// Check if wallet is locked
export const checkWalletLocked = async () => {
  try {
    const isLocked = await sendToBackground({
      method: 'wallet_isLocked',
      params: []
    });
    
    return isLocked;
  } catch (error) {
    console.error('Error checking wallet lock status:', error);
    // Assume locked if error
    return true;
  }
};

// Initialize wallet
export const initializeWallet = async (password, mnemonic = null) => {
  try {
    const result = await sendToBackground({
      method: 'wallet_initializeWallet',
      params: [{
        password,
        mnemonic
      }]
    });
    
    return result;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw error;
  }
};

// Unlock wallet
export const unlockWallet = async (password) => {
  try {
    const result = await sendToBackground({
      method: 'wallet_unlock',
      params: [{
        password
      }]
    });
    
    return result;
  } catch (error) {
    console.error('Error unlocking wallet:', error);
    throw error;
  }
};

// Lock wallet
export const lockWallet = async () => {
  try {
    await sendToBackground({
      method: 'wallet_lock',
      params: []
    });
    
    return true;
  } catch (error) {
    console.error('Error locking wallet:', error);
    throw error;
  }
};

// Get accounts
export const getAccounts = async (password = null) => {
  try {
    const params = password ? [{ password }] : [{}];
    
    const accountsResult = await sendToBackground({
      method: 'wallet_getAccounts',
      params
    });
    
    return accountsResult || [];
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
};

// Set active account
export const setActiveAccount = async (index) => {
  try {
    await sendToBackground({
      method: 'wallet_setActiveAccount',
      params: [{
        index
      }]
    });
    
    return true;
  } catch (error) {
    console.error('Error setting active account:', error);
    throw error;
  }
};

// Add account from seed phrase
export const addAccount = async (password, name) => {
  try {
    const result = await sendToBackground({
      method: 'wallet_addAccount',
      params: [{
        password,
        name
      }]
    });
    
    return result;
  } catch (error) {
    console.error('Error adding account:', error);
    throw error;
  }
};

// Import account from private key
export const importAccount = async (privateKey, name, password) => {
  try {
    const accountInfo = await sendToBackground({
      method: 'wallet_importAccount',
      params: [{
        privateKey,
        name,
        password
      }]
    });
    
    return accountInfo;
  } catch (error) {
    console.error('Error importing private key:', error);
    throw error;
  }
};

// Export wallet (backup)
export const exportWallet = async (password) => {
  try {
    const walletData = await sendToBackground({
      method: 'wallet_exportWallet',
      params: [{
        password
      }]
    });
    
    return walletData;
  } catch (error) {
    console.error('Error exporting wallet:', error);
    throw error;
  }
};

// Import wallet from file
export const importWallet = async (fileData, password) => {
  try {
    const result = await sendToBackground({
      method: 'wallet_importWallet',
      params: [{
        fileData,
        password
      }]
    });
    
    return result;
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw error;
  }
};

// Export private key for active account
export const getPrivateKey = async (password) => {
  try {
    const privateKey = await sendToBackground({
      method: 'wallet_getPrivateKey',
      params: [{
        password
      }]
    });
    
    return privateKey;
  } catch (error) {
    console.error('Error exporting private key:', error);
    throw error;
  }
};

// Get chain info
export const getChainInfo = async (chainId) => {
  try {
    const chainInfo = await sendToBackground({
      method: 'wallet_getChainInfo',
      params: [chainId]
    });
    
    return chainInfo;
  } catch (error) {
    console.error('Error getting chain info:', error);
    throw error;
  }
};

// Get ETH balance
export const getEthBalance = async (address) => {
  try {
    const balance = await sendToBackground({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    return balance;
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    throw error;
  }
};

// Call a contract method
export const callContractMethod = async (contractAddress, data, fromAddress) => {
  try {
    const result = await sendToBackground({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data,
        from: fromAddress
      }, 'latest']
    });
    
    return result;
  } catch (error) {
    console.error('Error calling contract method:', error);
    throw error;
  }
};

// Send transaction
export const sendTransaction = async (txParams, requestId) => {
  try {
    const txHash = await sendToBackground({
      method: 'eth_sendTransaction',
      params: [txParams, requestId]
    });
    
    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

// Sign message
export const signMessage = async (messageHex, requestId, skipApproval = false) => {
  try {
    const signature = await sendToBackground({
      method: 'personal_sign',
      params: [messageHex, requestId, skipApproval]
    });
    
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

// Switch network
export const switchNetwork = async (chainId) => {
  try {
    await sendToBackground({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    });
    
    return true;
  } catch (error) {
    console.error('Error switching network:', error);
    throw error;
  }
};

// Add network
export const addEthereumChain = async (chainParams) => {
  try {
    await sendToBackground({
      method: 'wallet_addEthereumChain',
      params: [chainParams]
    });
    
    return true;
  } catch (error) {
    console.error('Error adding network:', error);
    throw error;
  }
};

// Remove network
export const removeNetwork = async (chainId) => {
  try {
    await sendToBackground({
      method: 'wallet_removeNetwork',
      params: [chainId]
    });
    
    return true;
  } catch (error) {
    console.error('Error removing network:', error);
    throw error;
  }
};

// Reset wallet
export const resetWallet = async () => {
  try {
    await sendToBackground({
      method: 'wallet_resetWallet',
      params: []
    });
    
    return true;
  } catch (error) {
    console.error('Error resetting wallet:', error);
    throw error;
  }
};
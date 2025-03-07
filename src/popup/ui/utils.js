/**
 * UI Utility Functions
 */

// Show notification message
export const showNotification = (message, isError = false) => {
  const notificationEl = document.getElementById('copied-notification');
  notificationEl.textContent = message;
  notificationEl.style.backgroundColor = isError ? 'rgba(234, 67, 53, 0.9)' : 'rgba(0, 0, 0, 0.8)';
  notificationEl.style.display = 'block';
  
  setTimeout(() => {
    notificationEl.style.display = 'none';
  }, 3000);
};

// Custom confirm dialog to replace browser's confirm()
export const customConfirm = (message) => {
  return new Promise((resolve) => {
    const confirmContainerEl = document.getElementById('confirm-container');
    const confirmMessageEl = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    
    // Set the message
    confirmMessageEl.textContent = message;
    
    // Show the dialog
    confirmContainerEl.style.display = 'flex';
    
    // Handle confirm button
    const handleConfirm = () => {
      confirmContainerEl.style.display = 'none';
      cleanup();
      resolve(true);
    };
    
    // Handle cancel button
    const handleCancel = () => {
      confirmContainerEl.style.display = 'none';
      cleanup();
      resolve(false);
    };
    
    // Set up event listeners for one-time use
    const confirmListener = () => {
      handleConfirm();
    };
    
    const cancelListener = () => {
      handleCancel();
    };
    
    const keydownListener = (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };
    
    // Clean up function to remove event listeners
    const cleanup = () => {
      confirmOkBtn.removeEventListener('click', confirmListener);
      confirmCancelBtn.removeEventListener('click', cancelListener);
      window.removeEventListener('keydown', keydownListener);
    };
    
    // Add event listeners
    confirmOkBtn.addEventListener('click', confirmListener);
    confirmCancelBtn.addEventListener('click', cancelListener);
    window.addEventListener('keydown', keydownListener);
  });
};

// Show password prompt and wait for input
export const promptForPassword = (message) => {
  return new Promise((resolve, reject) => {
    const passwordContainerEl = document.getElementById('password-container');
    const passwordPromptEl = document.getElementById('password-prompt');
    const passwordInputEl = document.getElementById('password-input');
    const passwordSubmitBtn = document.getElementById('password-submit');
    const passwordCancelBtn = document.getElementById('password-cancel');
    const passwordStatusEl = document.getElementById('password-status');
    
    // Reset password input and status
    passwordInputEl.value = '';
    passwordStatusEl.textContent = '';
    passwordStatusEl.style.display = 'none';
    
    // Set prompt message
    passwordPromptEl.textContent = message || 'Enter your password:';
    
    // Show password container
    passwordContainerEl.style.display = 'flex';
    
    // Focus the input
    passwordInputEl.focus();
    
    // Handle password submit
    const handleSubmit = () => {
      const password = passwordInputEl.value;
      if (!password) {
        passwordStatusEl.textContent = 'Password is required';
        passwordStatusEl.style.display = 'block';
        return;
      }
      
      passwordContainerEl.style.display = 'none';
      resolve(password);
    };
    
    // Handle cancel
    const handleCancel = () => {
      passwordContainerEl.style.display = 'none';
      reject(new Error('Password entry cancelled'));
    };
    
    // Set up event listeners for one-time use
    const submitListener = () => {
      handleSubmit();
      cleanup();
    };
    
    const cancelListener = () => {
      handleCancel();
      cleanup();
    };
    
    const keydownListener = (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
        cleanup();
      } else if (e.key === 'Escape') {
        handleCancel();
        cleanup();
      }
    };
    
    // Clean up function to remove event listeners
    const cleanup = () => {
      passwordSubmitBtn.removeEventListener('click', submitListener);
      passwordCancelBtn.removeEventListener('click', cancelListener);
      passwordInputEl.removeEventListener('keydown', keydownListener);
    };
    
    // Add event listeners
    passwordSubmitBtn.addEventListener('click', submitListener);
    passwordCancelBtn.addEventListener('click', cancelListener);
    passwordInputEl.addEventListener('keydown', keydownListener);
  });
};

// Format address for display
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
};

// Helper: Convert hex to string (improved with UTF-8 support)
export const hexToUtf8String = (hexString) => {
  try {
    // Remove '0x' prefix if present
    const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    
    // Create an array of bytes from the hex string
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    
    // Use TextDecoder (available in modern browsers) for UTF-8 decoding
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(new Uint8Array(bytes));
  } catch (error) {
    console.error('Error decoding hex to UTF-8:', error);
    return ''; // Return empty string on error
  }
};

// Legacy helper (kept for backward compatibility)
export const hexToString = (hex) => {
  return hexToUtf8String(hex);
};

// Helper: Encode ERC20 transfer data
export const encodeERC20TransferData = (to, amount) => {
  // Function signature for transfer(address,uint256)
  const functionSignature = '0xa9059cbb';
  
  // Encode "to" address - pad to 32 bytes
  const encodedTo = to.substring(2).padStart(64, '0');
  
  // Encode amount - convert to hex and pad to 32 bytes
  // Use BigInt to avoid overflow with large token amounts
  const hexAmount = BigInt(amount).toString(16);
  const encodedAmount = hexAmount.padStart(64, '0');
  
  console.log('Encoded token amount:', hexAmount);
  
  return functionSignature + encodedTo + encodedAmount;
};

// Helper: Get explorer URL based on chain
export const getExplorerUrl = async (chainId) => {
  try {
    // Import on demand to avoid circular dependency
    const { getChainInfo } = await import('../services/background.js');
    
    // Try to get explorer URL from chain object
    const chainInfo = await getChainInfo(chainId);
    
    if (chainInfo && chainInfo.blockExplorers && chainInfo.blockExplorers.default) {
      return chainInfo.blockExplorers.default.url;
    }
    
    // Fallback to hardcoded values
    switch (chainId) {
      case '0x1':
        return 'https://etherscan.io';
      case '0xaa36a7':
        return 'https://sepolia.etherscan.io';
      default:
        return 'https://etherscan.io';
    }
  } catch (error) {
    console.error('Error getting explorer URL:', error);
    // Fallback to hardcoded values
    switch (chainId) {
      case '0x1':
        return 'https://etherscan.io';
      case '0xaa36a7':
        return 'https://sepolia.etherscan.io';
      default:
        return 'https://etherscan.io';
    }
  }
};
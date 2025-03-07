/**
 * Event Registration
 * Handles all event listeners for DOM elements in the popup UI
 */

import { initTabs } from './tabs.js';
import { showNotification, getExplorerUrl, promptForPassword, customConfirm, encodeERC20TransferData } from './utils.js';
import { 
  addAccountFromSeed, getWallet, getActiveAccount, updateAccountUI, 
  setActiveAccount, getEthBalance, getTokenBalances, displayChainInfo,
  getStoredTokens, saveTokens, updateTokenSelect, populateNetworkSelect
} from '../services/wallet.js';
import { getState, setState } from '../state/index.js';
import * as backgroundService from '../services/background.js';

// Helper: Creates a file input for wallet import
const createWalletFileInput = () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', handleWalletImportFileSelect);
  document.body.appendChild(fileInput);
  return fileInput;
};

// Get or create wallet file input
let walletFileInput;
const getWalletFileInput = () => {
  if (!walletFileInput) {
    walletFileInput = createWalletFileInput();
  }
  return walletFileInput;
};

// Handler for wallet import file selection
const handleWalletImportFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const fileData = event.target.result;
      await importWallet(fileData);
    } catch (error) {
      console.error('Error reading wallet file:', error);
      const walletActionStatusEl = document.getElementById('wallet-action-status');
      walletActionStatusEl.textContent = 'Error reading wallet file: ' + error.message;
      walletActionStatusEl.style.color = '#ea4335';
      walletActionStatusEl.style.display = 'block';
    }
  };
  
  reader.readAsText(file);
};

// Import wallet from file
const importWallet = async (fileData) => {
  const walletActionStatusEl = document.getElementById('wallet-action-status');
  
  try {
    let password;
    try {
      password = await promptForPassword('Enter the password for this wallet backup:');
    } catch (error) {
      // User cancelled password entry
      return;
    }
    
    walletActionStatusEl.textContent = 'Importing wallet...';
    walletActionStatusEl.style.color = '#000000';
    walletActionStatusEl.style.display = 'block';
    
    // Import the wallet
    const result = await backgroundService.importWallet(fileData, password);
    
    // Cache the password
    setState({
      cachedPassword: password,
      walletInitialized: true,
      walletLocked: false
    });
    
    // Update accounts list and UI
    await getActiveAccount();
    updateAccountUI();
    
    // Get balances
    getEthBalance();
    getTokenBalances();
    
    walletActionStatusEl.textContent = `Wallet imported successfully! (${result.accounts} accounts, ${result.importedAccounts} imported keys)`;
    walletActionStatusEl.style.color = '#34a853';
    
    // Switch to the accounts tab
    const { switchToTab } = await import('./tabs.js');
    switchToTab('assets');
    
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 5000);
    
    return result;
  } catch (error) {
    console.error('Error importing wallet:', error);
    walletActionStatusEl.textContent = 'Error: ' + error.message;
    walletActionStatusEl.style.color = '#ea4335';
    walletActionStatusEl.style.display = 'block';
    
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 5000);
    
    throw error;
  }
};

// Add a token
const addToken = async () => {
  // First, check the wallet state
  const { walletLocked, currentAccount, tokens, currentChainId } = getState();
  
  if (walletLocked) {
    showNotification('Wallet is locked. Please unlock it first', true);
    return;
  }
  
  if (!currentAccount || !currentAccount.address) {
    try {
      // Try to refresh account data
      console.log("No current account, attempting to refresh account data before adding token");
      await getActiveAccount();
      
      // If we still don't have an account after refresh, show error
      const { currentAccount } = getState();
      if (!currentAccount || !currentAccount.address) {
        showNotification('No active account found. Please unlock your wallet', true);
        return;
      }
    } catch (error) {
      console.error('Error refreshing account data:', error);
      showNotification('Cannot add token: No active account found', true);
      return;
    }
  }
  
  const tokenAddressInput = document.getElementById('token-address');
  const tokenAddress = tokenAddressInput.value.trim();
  if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
    showNotification('Please enter a valid ERC-20 token address', true);
    return;
  }
  
  // Check if token already exists for the current chain
  if (tokens.some(t => 
    t.address.toLowerCase() === tokenAddress.toLowerCase() && 
    t.chainId === currentChainId
  )) {
    showNotification('Token already added to this network', true);
    return;
  }
  
  // Show loading notification
  showNotification('Fetching token information...', false);
  
  try {
    // Get token info with proper error handling for each call
    let tokenName, tokenSymbol, tokenDecimals;
    
    try {
      // Call name() on the token contract
      const nameData = '0x06fdde03'; // name() function signature
      tokenName = await getTokenStringProperty(tokenAddress, nameData, 'name');
    } catch (nameError) {
      console.error('Error getting token name:', nameError);
      tokenName = 'Unknown Token';
    }
    
    try {
      // Call symbol() on the token contract
      const symbolData = '0x95d89b41'; // symbol() function signature
      tokenSymbol = await getTokenStringProperty(tokenAddress, symbolData, 'symbol');
    } catch (symbolError) {
      console.error('Error getting token symbol:', symbolError);
      tokenSymbol = 'UNKNOWN';
    }
    
    try {
      // Call decimals() on the token contract
      const decimalsData = '0x313ce567'; // decimals() function signature
      const decimalsResult = await backgroundService.callContractMethod(
        tokenAddress,
        decimalsData,
        currentAccount.address
      );
      tokenDecimals = parseInt(decimalsResult, 16).toString();
    } catch (decimalsError) {
      console.error('Error getting token decimals:', decimalsError);
      tokenDecimals = '18'; // Default to 18 decimals
    }
    
    // Add token to the list
    const newToken = {
      address: tokenAddress,
      name: tokenName || 'Unknown Token',
      symbol: tokenSymbol || 'UNKNOWN',
      decimals: parseInt(tokenDecimals || '18'),
      chainId: currentChainId
    };
    
    const updatedTokens = [...tokens, newToken];
    setState({ tokens: updatedTokens });
    await saveTokens();
    tokenAddressInput.value = '';
    
    // Update balances and select with forced refresh
    console.log('Forcing token balance refresh after adding new token');
    getTokenBalances(true); // Pass true to force refresh regardless of timing
    updateTokenSelect();
    
    // Show success notification
    showNotification(`${newToken.symbol} token added successfully`);
  } catch (error) {
    console.error('Error adding token:', error);
    showNotification('Error adding token: ' + error.message, true);
  }
};

// Helper function to decode token properties (name, symbol)
const getTokenStringProperty = async (tokenAddress, data, propertyName) => {
  const { currentAccount } = getState();
  
  const result = await backgroundService.callContractMethod(
    tokenAddress,
    data,
    currentAccount.address
  );
  
  try {
    // Import on demand to avoid circular dependency
    const { hexToUtf8String } = await import('../ui/utils.js');
    
    // Try different parsing methods for different token implementations
    if (!result || result === '0x' || result.length < 66) {
      return propertyName === 'name' ? 'Unknown Token' : 'UNKNOWN';
    }
    
    // Try standard ABI encoding
    // Extract string from dynamically encoded response
    const dataOffset = parseInt(result.slice(2, 66), 16);
    if (!isNaN(dataOffset)) {
      const lengthPos = 2 + (dataOffset * 2);
      if (lengthPos + 64 <= result.length) {
        const strLength = parseInt(result.slice(lengthPos, lengthPos + 64), 16);
        if (!isNaN(strLength) && strLength > 0) {
          const dataPos = lengthPos + 64;
          if (dataPos + (strLength * 2) <= result.length) {
            const hexString = result.slice(dataPos, dataPos + (strLength * 2));
            const decoded = hexToUtf8String(hexString);
            if (decoded && decoded.length > 0) {
              return decoded;
            }
          }
        }
      }
    }
    
    // Fallback method for non-standard encodings
    const rawHex = result.startsWith('0x') ? result.slice(2) : result;
    const trimmedHex = rawHex.replace(/0+$/, '');
    
    if (trimmedHex.length > 0) {
      const simpleDecoded = hexToUtf8String(trimmedHex);
      if (simpleDecoded && simpleDecoded.length > 0 && 
          /^[a-zA-Z0-9\s\-_\.]+$/.test(simpleDecoded)) {
        return simpleDecoded;
      }
    }
    
    // Last resort - try decoding fixed-length string in first 32 bytes
    if (result.length >= 66) {
      let fixedHex = result.slice(2, 66);
      fixedHex = fixedHex.replace(/0+$/, '');
      
      if (fixedHex.length > 0 && fixedHex.length % 2 === 0) {
        const fixedDecoded = hexToUtf8String(fixedHex);
        if (fixedDecoded && fixedDecoded.length > 0 && 
            /^[a-zA-Z0-9\s\-_\.]+$/.test(fixedDecoded)) {
          return fixedDecoded;
        }
      }
    }
    
    // If all parsing methods fail, return default
    return propertyName === 'name' ? 'Unknown Token' : 'UNKNOWN';
  } catch (decodeError) {
    console.error(`Error decoding ${propertyName}:`, decodeError);
    return propertyName === 'name' ? 'Unknown Token' : 'UNKNOWN';
  }
};

// Send token or ETH
const sendToken = async () => {
  try {
    const { currentAccount, currentChainId, tokens } = getState();
    
    // Get form elements
    const tokenSelectEl = document.getElementById('token-select');
    const recipientInput = document.getElementById('recipient');
    const amountInput = document.getElementById('amount');
    const txStatusEl = document.getElementById('tx-status');
    const sendTokenBtn = document.getElementById('send-token');
    
    const tokenValue = tokenSelectEl.value;
    const recipient = recipientInput.value.trim();
    const amount = amountInput.value.trim();
    
    // Validate recipient address
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      showNotification('Please enter a valid recipient address', true);
      return;
    }
    
    // Validate amount with greater precision
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid amount greater than 0', true);
      return;
    }
    
    // Show processing status
    txStatusEl.innerHTML = '<div class="loading"></div> Processing...';
    sendTokenBtn.disabled = true;
    
    console.log(`Preparing to send ${amount} ${tokenValue === 'eth' ? 'ETH' : tokenValue} to ${recipient}`);
    
    let txHash;
    
    if (tokenValue === 'eth') {
      // Send ETH
      try {
        // Convert ETH to Wei with extra careful handling
        const ethAmount = parseFloat(amount);
        console.log('ETH amount (parsed):', ethAmount);
        
        // Calculate wei value using string operations to avoid floating point issues
        const weiValue = ethAmount * 1e18;
        console.log('Wei value (as number):', weiValue);
        
        // Floor the value to ensure we don't get partial wei
        const weiValueFloored = Math.floor(weiValue);
        console.log('Wei value (floored):', weiValueFloored);
        
        // Convert to BigInt for accurate representation
        const weiValueBigInt = BigInt(weiValueFloored);
        console.log('Wei value (as BigInt):', weiValueBigInt.toString());
        
        // Format as proper hex string with 0x prefix
        const hexValue = '0x' + weiValueBigInt.toString(16);
        console.log('Hex value:', hexValue);
        
        console.log(`Sending ETH amount: ${ethAmount} ETH (${weiValueBigInt} wei / ${hexValue})`);
        
        // Include a request ID for tracking this specific transaction
        const requestId = `popup-tx-${Date.now()}`;
        
        // Update status to show waiting for approval
        txStatusEl.innerHTML = '<div class="loading"></div> Waiting for approval...';
        
        txHash = await backgroundService.sendTransaction({
          from: currentAccount.address,
          to: recipient,
          value: hexValue
        }, requestId);
      } catch (error) {
        console.error('Error preparing ETH transaction:', error);
        throw new Error(`Failed to prepare ETH transaction: ${error.message}`);
      }
    } else {
      // Send ERC-20 token
      try {
        const token = tokens.find(t => t.address === tokenValue);
        if (!token) {
          throw new Error(`Token ${tokenValue} not found in your list`);
        }
        
        // Parse the amount with precision handling
        const parsedAmount = parseFloat(amount);
        // Calculate token units based on decimals
        const tokenUnits = parsedAmount * Math.pow(10, token.decimals);
        // Convert to BigInt safely
        const tokenUnitsBigInt = BigInt(Math.floor(tokenUnits));
        
        console.log(`Sending token: ${parsedAmount} ${token.symbol} (${tokenUnitsBigInt} base units)`);
        
        // Encode the transfer function call
        const data = encodeERC20TransferData(recipient, tokenUnitsBigInt.toString());
        
        // Include a request ID for tracking this specific transaction
        const requestId = `popup-token-tx-${Date.now()}`;
        
        // Update status to show waiting for approval
        txStatusEl.innerHTML = '<div class="loading"></div> Waiting for approval...';
        
        txHash = await backgroundService.sendTransaction({
          from: currentAccount.address,
          to: tokenValue,
          data
        }, requestId);
      } catch (error) {
        console.error('Error preparing token transaction:', error);
        throw new Error(`Failed to prepare token transaction: ${error.message}`);
      }
    }
    
    // Get explorer URL and add link to transaction
    const explorerUrl = await getExplorerUrl(currentChainId);
    txStatusEl.innerHTML = `Sent! <a href="${explorerUrl}/tx/${txHash}" target="_blank">View</a>`;
    
    // Reset form
    recipientInput.value = '';
    amountInput.value = '';
    
    // Update balances
    getEthBalance();
    getTokenBalances();
  } catch (error) {
    console.error('Error sending token:', error);
    document.getElementById('tx-status').textContent = 'Error: ' + error.message;
  } finally {
    document.getElementById('send-token').disabled = false;
  }
};

// Sign a message
const signMessage = async () => {
  const messageInput = document.getElementById('message');
  const signatureResultEl = document.getElementById('signature-result');
  const signMessageBtn = document.getElementById('sign-message');
  
  const message = messageInput.value.trim();
  
  if (!message) {
    showNotification('Please enter a message to sign', true);
    return;
  }
  
  try {
    signatureResultEl.innerHTML = '<div class="loading"></div> Signing...';
    signMessageBtn.disabled = true;
    
    // Convert message to hex
    const messageHex = '0x' + Array.from(new TextEncoder().encode(message))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Include a request ID for tracking this specific signing request
    const requestId = `popup-sign-${Date.now()}`;
    
    // Update status to show signing process
    signatureResultEl.innerHTML = '<div class="loading"></div> Signing message...';
    
    // Sign the message directly without opening approval popup (since we're in the wallet UI)
    // We add a skipApproval flag to indicate this is initiated from the popup
    const signature = await backgroundService.signMessage(messageHex, requestId, true);
    
    // Enhance the signature result display
    signatureResultEl.innerHTML = `
      <div style="margin-bottom: 10px; color: #34a853;">
        <span style="display: inline-block; margin-right: 5px; vertical-align: middle;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </span>
        Message signed successfully
      </div>
      <div style="font-size: 11px; margin-bottom: 4px; color: #666;">Signature:</div>
      <div style="word-break: break-all; font-family: monospace; font-size: 10px; background-color: #f5f5f5; padding: 8px; border-radius: 4px; max-height: 80px; overflow-y: auto;">${signature}</div>
      <div style="font-size: 11px; margin-top: 8px; color: #666;">
        <button id="copy-signature" class="btn btn-sm" style="font-size: 11px; padding: 3px 8px; margin-right: 5px;">
          Copy to Clipboard
        </button>
        <span id="copy-signature-confirmation" style="color: #34a853; display: none;">Copied!</span>
      </div>
    `;
    
    // Add event listener to the copy button
    document.getElementById('copy-signature').addEventListener('click', () => {
      navigator.clipboard.writeText(signature).then(() => {
        const confirmEl = document.getElementById('copy-signature-confirmation');
        confirmEl.style.display = 'inline';
        setTimeout(() => {
          confirmEl.style.display = 'none';
        }, 2000);
      });
    });
  } catch (error) {
    console.error('Error signing message:', error);
    // Enhance error display
    signatureResultEl.innerHTML = `
      <div style="margin-bottom: 10px; color: #ea4335;">
        <span style="display: inline-block; margin-right: 5px; vertical-align: middle;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
        Error signing message
      </div>
      <div style="font-size: 12px; color: #333; background-color: #fff0f0; padding: 8px; border-radius: 4px; border-left: 3px solid #ea4335;">
        ${error.message}
      </div>
    `;
  } finally {
    signMessageBtn.disabled = false;
  }
};

// Switch network
const switchNetwork = async () => {
  const networkSelectEl = document.getElementById('network-select');
  const networkStatusEl = document.getElementById('network-status');
  const switchNetworkBtn = document.getElementById('switch-network');
  const { currentChainId } = getState();
  
  const chainId = networkSelectEl.value;
  
  if (chainId === currentChainId) {
    return;
  }
  
  try {
    networkStatusEl.innerHTML = '<div class="loading"></div> Switching...';
    switchNetworkBtn.disabled = true;
    
    await backgroundService.switchNetwork(chainId);
    
    setState({ currentChainId: chainId });
    displayChainInfo(chainId);
    networkStatusEl.textContent = 'Network switched!';
    
    // Refresh data for the new network
    getEthBalance();
    getTokenBalances();
    updateTokenSelect();
  } catch (error) {
    console.error('Error switching network:', error);
    networkStatusEl.textContent = 'Error: ' + error.message;
  } finally {
    switchNetworkBtn.disabled = false;
  }
};

// Copy address to clipboard
const copyAddress = async () => {
  const { currentAccount } = getState();
  if (!currentAccount) return;
  
  try {
    await navigator.clipboard.writeText(currentAccount.address);
    const notification = document.getElementById('copied-notification');
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 2000);
  } catch (error) {
    console.error('Error copying address:', error);
  }
};

// Function to open address in block explorer
const openAddressInExplorer = async () => {
  const { currentAccount, currentChainId } = getState();
  if (!currentAccount || !currentChainId) return;
  
  try {
    const explorerUrl = await getExplorerUrl(currentChainId);
    const addressUrl = `${explorerUrl}/address/${currentAccount.address}`;
    window.open(addressUrl, '_blank');
  } catch (error) {
    console.error('Error opening address in explorer:', error);
  }
};

// Lock/unlock wallet
const toggleLockWallet = async () => {
  const lockWalletBtn = document.getElementById('lock-wallet');
  const { walletLocked } = getState();
  
  if (walletLocked) {
    try {
      const password = await promptForPassword('Enter your password to unlock the wallet:');
      await backgroundService.unlockWallet(password);
      setState({ 
        walletLocked: false,
        cachedPassword: password
      });
      lockWalletBtn.textContent = 'Lock Wallet';
      
      // Update UI to show unlocked state
      await getActiveAccount();
      await getAccountsList();
      updateAccountUI();
      getEthBalance();
      getTokenBalances();
    } catch (error) {
      console.error('Error unlocking wallet:', error);
    }
  } else {
    await backgroundService.lockWallet();
    setState({ 
      walletLocked: true,
      cachedPassword: null
    });
    
    // Update UI to show locked state
    document.getElementById('wallet-status').textContent = 'Wallet is locked. Please unlock.';
    lockWalletBtn.textContent = 'Unlock Wallet';
    
    // Disable functionality
    document.getElementById('send-token').disabled = true;
    document.getElementById('sign-message').disabled = true;
    document.getElementById('add-token').disabled = true;
    document.getElementById('add-account').disabled = true;
    document.getElementById('import-key-btn').disabled = true;
    document.getElementById('export-wallet').disabled = true;
  }
};

// Import account from private key
const importAccountFromKey = async () => {
  const importPrivateKeyInput = document.getElementById('import-private-key');
  const importKeyStatusEl = document.getElementById('import-key-status');
  const importKeyBtn = document.getElementById('import-key-btn');
  
  try {
    const privateKey = importPrivateKeyInput.value.trim();
    
    if (!privateKey) {
      importKeyStatusEl.textContent = 'Please enter a private key';
      importKeyStatusEl.style.color = '#ea4335';
      importKeyStatusEl.style.display = 'block';
      return;
    }
    
    const { cachedPassword, accounts } = getState();
    if (!cachedPassword) {
      try {
        const password = await promptForPassword('Enter your password to import this key:');
        setState({ cachedPassword: password });
      } catch (error) {
        // User cancelled password entry
        return;
      }
    }
    
    importKeyStatusEl.textContent = 'Importing...';
    importKeyStatusEl.style.color = '#000000';
    importKeyStatusEl.style.display = 'block';
    importKeyBtn.disabled = true;
    
    // Import the private key
    const accountInfo = await backgroundService.importAccount(
      privateKey,
      `Imported ${accounts.filter(a => a.type === 'imported').length + 1}`,
      getState().cachedPassword
    );
    
    console.log('Account imported:', accountInfo);
    
    // Update accounts list
    await getAccounts();
    
    // Find the index of the newly imported account
    const newAccounts = getState().accounts;
    const newAccountIndex = newAccounts.findIndex(account => 
      account.address.toLowerCase() === accountInfo.address.toLowerCase()
    );
    
    if (newAccountIndex !== -1) {
      console.log('Setting newly imported account as active. Index:', newAccountIndex);
      // Set the new account as active
      await setActiveAccount(newAccountIndex);
    } else {
      console.warn('Could not find newly imported account in accounts list');
      updateAccountUI(); // Still update the UI even if we couldn't set active
    }
    
    // Clear the input
    importPrivateKeyInput.value = '';
    
    importKeyStatusEl.textContent = `Successfully imported account: ${accountInfo.address} (now active)`;
    importKeyStatusEl.style.color = '#34a853';
  } catch (error) {
    console.error('Error importing private key:', error);
    importKeyStatusEl.textContent = 'Error: ' + error.message;
    importKeyStatusEl.style.color = '#ea4335';
  } finally {
    importKeyBtn.disabled = false;
    setTimeout(() => {
      importKeyStatusEl.style.display = 'none';
    }, 5000);
  }
};

// Export wallet (backup)
const exportWallet = async () => {
  const walletActionStatusEl = document.getElementById('wallet-action-status');
  const exportWalletBtn = document.getElementById('export-wallet');
  
  try {
    const { cachedPassword } = getState();
    if (!cachedPassword) {
      try {
        const password = await promptForPassword('Enter your password to export wallet:');
        setState({ cachedPassword: password });
      } catch (error) {
        // User cancelled password entry
        return;
      }
    }
    
    walletActionStatusEl.textContent = 'Exporting wallet...';
    walletActionStatusEl.style.color = '#000000';
    walletActionStatusEl.style.display = 'block';
    exportWalletBtn.disabled = true;
    
    // Export the wallet
    const walletData = await backgroundService.exportWallet(getState().cachedPassword);
    
    // Create download link
    const blob = new Blob([walletData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eth-fox-wallet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    walletActionStatusEl.textContent = 'Wallet exported successfully!';
    walletActionStatusEl.style.color = '#34a853';
  } catch (error) {
    console.error('Error exporting wallet:', error);
    walletActionStatusEl.textContent = 'Error: ' + error.message;
    walletActionStatusEl.style.color = '#ea4335';
  } finally {
    exportWalletBtn.disabled = false;
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 5000);
  }
};

// Export private key for active account
const exportPrivateKey = async () => {
  const { cachedPassword } = getState();
  const walletActionStatusEl = document.getElementById('wallet-action-status');
  const privateKeyDisplayEl = document.getElementById('private-key-display');
  const exportPrivateKeyBtn = document.getElementById('export-private-key');
  
  try {
    if (!cachedPassword) {
      try {
        const password = await promptForPassword('Enter your password to export private key:');
        setState({ cachedPassword: password });
      } catch (error) {
        // User cancelled password entry
        return;
      }
    }
    
    // Get the active account first
    const activeAccount = await getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account found');
    }
    
    // Log the account being used
    console.log('Exporting private key for account:', activeAccount.address);
    
    // Get the private key
    console.log('Requesting private key from background script');
    const privateKey = await backgroundService.getPrivateKey(getState().cachedPassword);
    
    console.log('Private key received successfully');
    
    if (privateKeyDisplayEl.style.display === 'none') {
      privateKeyDisplayEl.textContent = privateKey;
      privateKeyDisplayEl.style.display = 'block';
      exportPrivateKeyBtn.textContent = 'Hide Private Key';
    } else {
      privateKeyDisplayEl.style.display = 'none';
      exportPrivateKeyBtn.textContent = 'Show Private Key';
    }
  } catch (error) {
    console.error('Error exporting private key:', error);
    walletActionStatusEl.textContent = 'Error: ' + error.message;
    walletActionStatusEl.style.color = '#ea4335';
    walletActionStatusEl.style.display = 'block';
    
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 5000);
  }
};

// Remove network
const removeNetwork = async () => {
  const networkSelectEl = document.getElementById('network-select');
  const networkStatusEl = document.getElementById('network-status');
  const removeNetworkBtn = document.getElementById('remove-network');
  const switchNetworkBtn = document.getElementById('switch-network');
  
  try {
    const chainId = networkSelectEl.value;
    
    // Confirm with the user
    const shouldRemove = await customConfirm(`Are you sure you want to remove the network "${networkSelectEl.options[networkSelectEl.selectedIndex].text}"?`);
    if (!shouldRemove) {
      return;
    }
    
    networkStatusEl.textContent = 'Removing network...';
    removeNetworkBtn.disabled = true;
    switchNetworkBtn.disabled = true;
    
    // Remove the network
    await backgroundService.removeNetwork(chainId);
    
    // Refresh the network list
    await populateNetworkSelect();
    
    // If the current chain was removed, we're now on the default chain
    const newChainId = await backgroundService.sendToBackground({
      method: 'eth_chainId',
      params: []
    });
    
    setState({ currentChainId: newChainId });
    displayChainInfo(newChainId);
    
    // Update UI
    networkStatusEl.textContent = 'Network removed successfully';
    
    // Refresh data for the new network
    getEthBalance();
    getTokenBalances();
    updateTokenSelect();
    
    setTimeout(() => {
      networkStatusEl.textContent = '';
    }, 3000);
    
  } catch (error) {
    console.error('Error removing network:', error);
    networkStatusEl.textContent = `Error: ${error.message}`;
  } finally {
    removeNetworkBtn.disabled = false;
    switchNetworkBtn.disabled = false;
  }
};

// Add network
const addNetwork = async () => {
  try {
    // Get form elements
    const chainNameInput = document.getElementById('chain-name');
    const chainIdInput = document.getElementById('chain-id');
    const rpcUrlInput = document.getElementById('rpc-url');
    const blockExplorerInput = document.getElementById('block-explorer');
    const currencySymbolInput = document.getElementById('currency-symbol');
    const currencyDecimalsInput = document.getElementById('currency-decimals');
    const addNetworkBtn = document.getElementById('add-network');
    const addNetworkStatusEl = document.getElementById('add-network-status');
    
    // Validate inputs
    const chainName = chainNameInput.value.trim();
    const chainId = chainIdInput.value.trim();
    const rpcUrl = rpcUrlInput.value.trim();
    const blockExplorer = blockExplorerInput.value.trim();
    const currencySymbol = currencySymbolInput.value.trim();
    const currencyDecimals = parseInt(currencyDecimalsInput.value.trim());
    
    if (!chainName || !chainId || !rpcUrl || !currencySymbol) {
      addNetworkStatusEl.textContent = 'Please fill out all required fields';
      addNetworkStatusEl.style.color = '#ea4335';
      addNetworkStatusEl.style.display = 'block';
      return;
    }
    
    // Validate chain ID format
    if (!chainId.startsWith('0x')) {
      addNetworkStatusEl.textContent = 'Chain ID must be in hex format (0x...)';
      addNetworkStatusEl.style.color = '#ea4335';
      addNetworkStatusEl.style.display = 'block';
      return;
    }
    
    // Prepare add chain parameters
    const addChainParams = {
      chainId: chainId,
      chainName: chainName,
      rpcUrls: [rpcUrl],
      nativeCurrency: {
        name: chainName + ' Coin',
        symbol: currencySymbol,
        decimals: currencyDecimals
      }
    };
    
    // Add block explorer if provided
    if (blockExplorer) {
      addChainParams.blockExplorerUrls = [blockExplorer];
    }
    
    addNetworkStatusEl.textContent = 'Adding network...';
    addNetworkStatusEl.style.color = 'black';
    addNetworkStatusEl.style.display = 'block';
    addNetworkBtn.disabled = true;
    
    // Request to add the chain
    await backgroundService.addEthereumChain(addChainParams);
    
    // Success - update UI
    addNetworkStatusEl.textContent = 'Network added successfully!';
    addNetworkStatusEl.style.color = '#34a853';
    
    // Clear form
    chainNameInput.value = '';
    chainIdInput.value = '';
    rpcUrlInput.value = '';
    blockExplorerInput.value = '';
    currencySymbolInput.value = '';
    currencyDecimalsInput.value = '18';
    
    // Update network select and switch to the new chain
    await populateNetworkSelect();
    setState({ currentChainId: chainId });
    const networkSelectEl = document.getElementById('network-select');
    networkSelectEl.value = chainId;
    displayChainInfo(chainId);
    
    // Refresh data for the new network
    getEthBalance();
    getTokenBalances();
    updateTokenSelect();
    
  } catch (error) {
    console.error('Error adding network:', error);
    document.getElementById('add-network-status').textContent = `Error: ${error.message}`;
    document.getElementById('add-network-status').style.color = '#ea4335';
  } finally {
    document.getElementById('add-network').disabled = false;
    
    // Hide status after a delay
    setTimeout(() => {
      document.getElementById('add-network-status').style.display = 'none';
    }, 5000);
  }
};

// Reset wallet
const resetWallet = async () => {
  // Confirm with the user first
  const shouldReset = await customConfirm('WARNING: This will permanently delete your wallet data and cannot be undone! Make sure you have a backup of your seed phrase or private keys before proceeding.\n\nAre you sure you want to reset your wallet?');
  if (!shouldReset) {
    return;
  }
  
  // Double-check with a second confirmation
  const finalConfirmation = await customConfirm('FINAL WARNING: All accounts, balances, and wallet data will be permanently erased. Continue?');
  if (!finalConfirmation) {
    return;
  }
  
  try {
    document.getElementById('wallet-action-status').textContent = 'Resetting wallet...';
    document.getElementById('wallet-action-status').style.color = '#000000';
    document.getElementById('wallet-action-status').style.display = 'block';
    
    // Call the wallet reset API
    await backgroundService.resetWallet();
    
    // Clear cached password
    setState({ cachedPassword: null });
    
    // Show setup UI, hide main UI
    document.getElementById('setup-container').style.display = 'block';
    document.querySelector('main').style.display = 'none';
    
    // Show success message in setup container
    document.getElementById('setup-status').textContent = 'Wallet data has been reset. Please set up a new wallet.';
    document.getElementById('setup-status').style.color = '#34a853';
    document.getElementById('setup-status').style.display = 'block';
    
  } catch (error) {
    console.error('Error resetting wallet:', error);
    document.getElementById('wallet-action-status').textContent = 'Error: ' + error.message;
    document.getElementById('wallet-action-status').style.color = '#ea4335';
    document.getElementById('wallet-action-status').style.display = 'block';
    
    setTimeout(() => {
      document.getElementById('wallet-action-status').style.display = 'none';
    }, 5000);
  }
};

// Wallet creation and setup
const setupCreateWallet = async () => {
  const setupPasswordInputEl = document.getElementById('setup-password-input');
  const setupConfirmPasswordInputEl = document.getElementById('setup-confirm-password-input');
  const setupStatusEl = document.getElementById('setup-status');
  const setupMnemonicDisplayEl = document.getElementById('setup-mnemonic-display');
  const setupMnemonicContainerEl = document.getElementById('setup-mnemonic-container');
  const createWalletBtn = document.getElementById('create-wallet');
  
  // Validate password
  const password = setupPasswordInputEl.value;
  const confirmPassword = setupConfirmPasswordInputEl.value;
  
  if (!password) {
    setupStatusEl.textContent = 'Please enter a password';
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    setupStatusEl.textContent = 'Passwords do not match';
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  try {
    setupStatusEl.textContent = 'Generating seed phrase and creating wallet...';
    setupStatusEl.style.color = '#000000';
    setupStatusEl.style.display = 'block';
    createWalletBtn.disabled = true;
    
    // Initialize wallet with new seed phrase
    const walletState = await backgroundService.initializeWallet(password);
    
    // Update state
    setState({
      cachedPassword: password,
      walletInitialized: true,
      walletLocked: false
    });
    
    // Display seed phrase
    setupMnemonicDisplayEl.textContent = walletState.mnemonic;
    
    // Hide password inputs, show seed phrase
    document.getElementById('setup-password-container').style.display = 'none';
    setupMnemonicContainerEl.style.display = 'block';
    
    setupStatusEl.textContent = 'Wallet created successfully! Please write down your seed phrase to back up your wallet.';
    setupStatusEl.style.color = '#34a853';
  } catch (error) {
    console.error('Error creating wallet:', error);
    setupStatusEl.textContent = 'Error: ' + error.message;
    setupStatusEl.style.color = '#ea4335';
    createWalletBtn.disabled = false;
  }
};

// Setup: Continue after showing the seed phrase
const setupConfirmPhrase = async () => {
  try {
    // Hide setup UI, show main UI
    document.getElementById('setup-container').style.display = 'none';
    document.querySelector('main').style.display = 'block';
    
    // Get accounts first, to make sure we have a list of accounts
    await getAccounts();
    const { accounts } = getState();
    console.log('Retrieved accounts after setup:', accounts);
    
    if (accounts && accounts.length > 0) {
      // Set the first account as active explicitly
      await setActiveAccount(0);
      console.log('Set initial account as active');
    } else {
      console.warn('No accounts found after wallet creation');
    }
    
    // Initialize wallet state
    await getActiveAccount();
    updateAccountUI();
    
    // Get chain ID
    const chainId = await backgroundService.sendToBackground({
      method: 'eth_chainId',
      params: []
    });
    
    setState({ currentChainId: chainId });
    displayChainInfo(chainId);
    
    // Get balances
    getEthBalance();
    await getStoredTokens();
    getTokenBalances();
    updateTokenSelect();
  } catch (error) {
    console.error('Error finalizing wallet setup:', error);
    document.getElementById('setup-status').textContent = 'Error: ' + error.message;
    document.getElementById('setup-status').style.color = '#ea4335';
    document.getElementById('setup-status').style.display = 'block';
  }
};

// Setup: Show import seed phrase UI
const setupShowImportUI = () => {
  document.getElementById('setup-password-container').style.display = 'none';
  document.getElementById('setup-import-phrase-container').style.display = 'block';
};

// Setup: Import wallet from seed phrase
const setupImportWallet = async () => {
  // Get DOM elements
  const setupPasswordInputEl = document.getElementById('setup-password-input');
  const setupConfirmPasswordInputEl = document.getElementById('setup-confirm-password-input');
  const setupImportPhraseInputEl = document.getElementById('setup-import-phrase-input');
  const setupStatusEl = document.getElementById('setup-status');
  const setupImportPhraseBtn = document.getElementById('setup-import-phrase');
  
  // Validate password and seed phrase
  const password = setupPasswordInputEl.value;
  const confirmPassword = setupConfirmPasswordInputEl.value;
  const seedPhrase = setupImportPhraseInputEl.value.trim();
  
  if (!password) {
    setupStatusEl.textContent = 'Please enter a password';
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    setupStatusEl.textContent = 'Passwords do not match';
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  if (!seedPhrase) {
    setupStatusEl.textContent = 'Please enter your seed phrase';
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  // Validate the seed phrase format - should be 12 or 24 words separated by spaces
  const words = seedPhrase.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    setupStatusEl.textContent = `Invalid seed phrase - should be 12 or 24 words (found ${words.length})`;
    setupStatusEl.style.color = '#ea4335';
    setupStatusEl.style.display = 'block';
    return;
  }
  
  try {
    setupStatusEl.textContent = 'Importing wallet from seed phrase...';
    setupStatusEl.style.color = '#000000';
    setupStatusEl.style.display = 'block';
    setupImportPhraseBtn.disabled = true;
    
    // Initialize wallet with provided seed phrase
    await backgroundService.initializeWallet(password, seedPhrase);
    
    // Update state
    setState({
      cachedPassword: password,
      walletInitialized: true,
      walletLocked: false
    });
    
    // Hide setup UI, show main UI
    document.getElementById('setup-container').style.display = 'none';
    document.querySelector('main').style.display = 'block';
    
    // Get accounts first, to make sure we have a list of accounts
    await getAccounts();
    const { accounts } = getState();
    console.log('Retrieved accounts after import:', accounts);
    
    if (accounts && accounts.length > 0) {
      // Set the first account as active explicitly
      await setActiveAccount(0);
      console.log('Set initial account as active after import');
    } else {
      console.warn('No accounts found after wallet import');
    }
    
    // Initialize wallet state
    await getActiveAccount();
    updateAccountUI();
    
    // Get chain ID
    const chainId = await backgroundService.sendToBackground({
      method: 'eth_chainId',
      params: []
    });
    
    setState({ currentChainId: chainId });
    displayChainInfo(chainId);
    
    // Get balances
    getEthBalance();
    await getStoredTokens();
    getTokenBalances();
    updateTokenSelect();
  } catch (error) {
    console.error('Error importing wallet:', error);
    setupStatusEl.textContent = 'Error: ' + error.message;
    setupStatusEl.style.color = '#ea4335';
    setupImportPhraseBtn.disabled = false;
  }
};

// Register all event listeners
export const registerEventListeners = () => {
  // Initialize tab management
  initTabs();
  
  // Wallet functionality
  document.getElementById('add-token').addEventListener('click', addToken);
  document.getElementById('send-token').addEventListener('click', sendToken);
  document.getElementById('sign-message').addEventListener('click', signMessage);
  document.getElementById('switch-network').addEventListener('click', switchNetwork);
  document.getElementById('remove-network').addEventListener('click', removeNetwork);
  document.getElementById('network-select').addEventListener('change', populateNetworkSelect);
  document.getElementById('copy-address').addEventListener('click', copyAddress);
  document.getElementById('account-address').addEventListener('click', openAddressInExplorer);
  document.getElementById('add-network').addEventListener('click', addNetwork);
  
  // Account management
  document.getElementById('add-account').addEventListener('click', addAccountFromSeed);
  document.getElementById('export-wallet').addEventListener('click', exportWallet);
  document.getElementById('export-private-key').addEventListener('click', exportPrivateKey);
  document.getElementById('import-key-btn').addEventListener('click', importAccountFromKey);
  
  // Wallet state management
  document.getElementById('reset-wallet').addEventListener('click', resetWallet);
  document.getElementById('lock-wallet').addEventListener('click', toggleLockWallet);
  
  // Setup (wallet creation)
  document.getElementById('create-wallet').addEventListener('click', setupCreateWallet);
  document.getElementById('restore-wallet').addEventListener('click', setupShowImportUI);
  document.getElementById('setup-confirm-phrase').addEventListener('click', setupConfirmPhrase);
  document.getElementById('setup-import-phrase').addEventListener('click', setupImportWallet);
  
  // Import wallet file
  document.getElementById('import-wallet-btn').addEventListener('click', () => {
    const fileInput = getWalletFileInput();
    fileInput.click();
  });
};
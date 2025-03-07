/**
 * Wallet Service Module
 * Handles wallet-specific functionality
 */

import { getState, setState, getRefreshIntervals } from '../state/index.js';
import * as backgroundService from './background.js';
import { formatAddress, hexToUtf8String, encodeERC20TransferData, getExplorerUrl } from '../ui/utils.js';
import { promptForPassword, showNotification, customConfirm } from '../ui/utils.js';

// Get active account index
export const getActiveAccountIndex = async () => {
  try {
    // Get from state
    const { activeAccount } = await browser.storage.local.get('activeAccount');
    const index = activeAccount !== undefined ? activeAccount : 0;
    setState({ activeAccountIndex: index });
    return index;
  } catch (error) {
    console.error('Error getting active account index:', error);
    return 0;
  }
};

// Get accounts
export const getAccounts = async () => {
  try {
    const { walletLocked, cachedPassword } = getState();
    console.log('Fetching accounts, wallet locked:', walletLocked, 'cached password available:', !!cachedPassword);
    
    // Request accounts from background
    let accountsResult;
    
    try {
      accountsResult = await backgroundService.getAccounts();
    } catch (error) {
      console.error('Error in first getAccounts attempt:', error);
      
      // If first attempt fails, try with cached password if available
      if (cachedPassword) {
        console.log('Retrying with explicit password parameter');
        try {
          accountsResult = await backgroundService.getAccounts(cachedPassword);
        } catch (retryError) {
          console.error('Explicit password retry failed:', retryError);
        }
      }
      
      // If we still don't have accounts and this was due to the wallet being locked
      if (!accountsResult && error.message && error.message.includes('Wallet is locked')) {
        setState({ walletLocked: true });
        
        // We need to prompt for password - automatic unlocking didn't work
        try {
          const password = await promptForPassword('Enter your password to unlock the wallet:');
          if (password) {
            setState({ cachedPassword: password });
            await backgroundService.unlockWallet(password);
            setState({ walletLocked: false });
            // Try again with the password we just got
            accountsResult = await backgroundService.getAccounts(password);
          }
        } catch (promptError) {
          console.error('Password prompt cancelled or failed:', promptError);
        }
      }
      
      if (!accountsResult) {
        throw error; // Re-throw if we still couldn't get accounts
      }
    }
    
    console.log(`Retrieved ${accountsResult ? accountsResult.length : 0} accounts from wallet`);
    
    if (accountsResult && accountsResult.length > 0) {
      // Update global accounts
      setState({ accounts: accountsResult });
      console.log('Updated global accounts array');
      
      // If success, wallet must be unlocked
      setState({ walletLocked: false });
    }
    
    return accountsResult || [];
  } catch (error) {
    console.error('Error getting accounts:', error);
    // Just log the error but don't throw, so UI can still update
    return getState().accounts || [];
  }
};

// Get the current active account details
export const getActiveAccount = async () => {
  try {
    console.log('Getting active account...');
    const { accounts } = getState();
    
    // Get active account index first
    let indexSuccess = false;
    try {
      await getActiveAccountIndex();
      indexSuccess = true;
      console.log('Retrieved active account index:', getState().activeAccountIndex);
    } catch (indexError) {
      console.error('Error getting active account index:', indexError);
      // If we can't get the index, we'll try with index 0 as fallback
      setState({ activeAccountIndex: 0 });
    }
    
    // Make sure we have accounts loaded
    let accountsSuccess = false;
    try {
      await getAccounts();
      accountsSuccess = true;
      const updatedAccounts = getState().accounts;
      console.log(`Retrieved ${updatedAccounts.length} accounts`);
    } catch (accountsError) {
      console.error('Error loading accounts:', accountsError);
    }
    
    const currentAccounts = getState().accounts;
    const currentIndex = getState().activeAccountIndex;
    
    // Handle empty accounts array
    if (!currentAccounts || currentAccounts.length === 0) {
      console.warn('No accounts available in wallet');
      setState({ currentAccount: null });
      
      // Try to refresh accounts with explicit password if available
      const { cachedPassword } = getState();
      if (cachedPassword) {
        try {
          console.log('Attempting to refresh accounts with cached password');
          const refreshResult = await backgroundService.getAccounts(cachedPassword);
          
          if (refreshResult && refreshResult.length > 0) {
            setState({ accounts: refreshResult });
            console.log('Account refresh successful, retrieved', refreshResult.length, 'accounts');
            accountsSuccess = true;
          }
        } catch (refreshError) {
          console.error('Failed to refresh accounts with cached password:', refreshError);
        }
      }
      
      // If we still have no accounts, return null
      const finalAccounts = getState().accounts;
      if (!finalAccounts || finalAccounts.length === 0) {
        return null;
      }
    }
    
    // Get latest accounts from state for validation
    const validationAccounts = getState().accounts;
    const validationIndex = getState().activeAccountIndex;
    
    // Validate the active account index
    if (!indexSuccess || validationIndex >= validationAccounts.length) {
      console.warn(`Invalid active account index: ${validationIndex}, max: ${validationAccounts.length - 1}. Resetting to 0.`);
      
      // Update the active account index in the wallet
      try {
        await backgroundService.setActiveAccount(0);
        setState({ activeAccountIndex: 0 });
        console.log('Active account index reset to 0');
      } catch (resetError) {
        console.error('Failed to reset active account index:', resetError);
      }
    }
    
    // Set current account
    const finalActiveIndex = getState().activeAccountIndex;
    const finalAccounts = getState().accounts;
    const selectedAccount = finalAccounts[finalActiveIndex];
    
    // Validate account data
    if (!selectedAccount || !selectedAccount.address) {
      console.error('Invalid account data retrieved:', selectedAccount);
      // Try first account as fallback
      const fallbackAccount = finalAccounts[0];
      
      if (!fallbackAccount || !fallbackAccount.address) {
        console.error('No valid accounts available in wallet');
        setState({ currentAccount: null });
        return null;
      }
      
      setState({ currentAccount: fallbackAccount });
    } else {
      setState({ currentAccount: selectedAccount });
    }
    
    const finalCurrentAccount = getState().currentAccount;
    console.log('Active account set to:', finalCurrentAccount?.address);
    return finalCurrentAccount;
  } catch (error) {
    console.error('Error getting active account:', error);
    setState({ currentAccount: null });
    return null;
  }
};

// Update accounts list UI
export const updateAccountsList = () => {
  const { accounts, activeAccountIndex } = getState();
  console.log('Updating accounts list UI with:', accounts ? accounts.length : 0, 'accounts');
  console.log('Active account index:', activeAccountIndex);
  
  const accountsListEl = document.getElementById('accounts-list');
  
  if (!accounts || accounts.length === 0) {
    console.warn('No accounts found for display');
    accountsListEl.innerHTML = `
      <div class="no-accounts" style="padding: 20px; text-align: center; color: #666;">
        <div style="margin-bottom: 10px;">No accounts found</div>
        <div style="font-size: 12px;">
          If you just created an account and don't see it, try refreshing the extension
        </div>
      </div>`;
    return;
  }
  
  // Clear existing list
  accountsListEl.innerHTML = '';
  
  // Create account items
  accounts.forEach((account, index) => {
    if (!account || !account.address) {
      console.warn('Invalid account at index', index, ':', account);
      return;
    }
    
    console.log(`Rendering account ${index}:`, account.address, 'active:', index === activeAccountIndex);
    
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    accountItem.style.cursor = 'pointer';
    accountItem.style.padding = '10px';
    accountItem.style.margin = '5px 0';
    accountItem.style.border = '1px solid #ddd';
    accountItem.style.borderRadius = '5px';
    
    if (index === activeAccountIndex) {
      accountItem.classList.add('active');
      accountItem.style.borderColor = '#34a853';
      accountItem.style.backgroundColor = '#f0fff0';
    }
    
    accountItem.innerHTML = `
      <div class="account-info">
        <div class="account-name" style="font-weight: bold;">${account.name || `Account ${index + 1}`}</div>
        <div class="account-address" style="font-family: monospace; margin: 5px 0;">${formatAddress(account.address)}</div>
        <div class="account-type ${account.type}" style="font-size: 12px; color: #666;">${account.type === 'seed' ? 'HD Wallet' : 'Imported'}</div>
        ${index === activeAccountIndex ? 
          '<div class="active-badge" style="color: #34a853; font-weight: bold; margin-top: 5px;">Active</div>' : 
          '<div class="select-prompt" style="color: #666; font-style: italic; margin-top: 5px;">Click to select</div>'
        }
      </div>
    `;
    
    // Add click handler to switch accounts
    accountItem.addEventListener('click', async () => {
      if (index !== activeAccountIndex) {
        console.log(`Switching active account from ${activeAccountIndex} to ${index}`);
        try {
          await setActiveAccount(index);
        } catch (error) {
          console.error('Error setting active account:', error);
          const walletActionStatusEl = document.getElementById('wallet-action-status');
          walletActionStatusEl.textContent = 'Error: ' + error.message;
          walletActionStatusEl.style.color = '#ea4335';
          walletActionStatusEl.style.display = 'block';
          
          setTimeout(() => {
            walletActionStatusEl.style.display = 'none';
          }, 5000);
        }
      }
    });
    
    accountsListEl.appendChild(accountItem);
  });
};

// Set active account
export const setActiveAccount = async (index) => {
  try {
    await backgroundService.setActiveAccount(index);
    
    setState({ activeAccountIndex: index });
    
    // Update UI with new active account
    await getActiveAccount();
    
    // Update UI and explicitly refresh balances based on current tab
    updateAccountUI(true); // Pass true to force balance refresh
    
    // Refresh accounts list to ensure it's up to date
    await getAccountsList();
    
    return true;
  } catch (error) {
    console.error('Error setting active account:', error);
    throw error;
  }
};

// Get accounts list and update UI
export const getAccountsList = async () => {
  try {
    console.log('Getting accounts list and updating UI');
    // Get accounts
    const retrievedAccounts = await getAccounts();
    console.log(`Retrieved ${retrievedAccounts ? retrievedAccounts.length : 0} accounts`);
    
    // Update UI with accounts
    updateAccountsList();
    return retrievedAccounts;
  } catch (error) {
    console.error('Error getting accounts list:', error);
    throw error;
  }
};

// Update account UI with current active account
export const updateAccountUI = (refreshBalances = false) => {
  const { currentAccount, currentActiveTab } = getState();
  const accountAddressEl = document.getElementById('account-address');
  const walletStatusEl = document.getElementById('wallet-status');
  
  if (!currentAccount) {
    accountAddressEl.textContent = 'No account selected';
    return;
  }
  
  // Set account address display
  accountAddressEl.textContent = formatAddress(currentAccount.address);
  
  // Make the address element clickable
  accountAddressEl.style.cursor = 'pointer';
  accountAddressEl.title = 'View on block explorer';
  
  // Set account name if available
  if (currentAccount.name) {
    walletStatusEl.textContent = `${currentAccount.name} (${currentAccount.type})`;
  }
  
  // Only refresh balances if explicitly requested or if we're on a relevant tab
  if (refreshBalances || currentActiveTab === 'accounts' || currentActiveTab === 'tokens') {
    console.log('Refreshing balances during updateAccountUI');
    
    // Only refresh balances that are visible in the current tab to reduce unnecessary requests
    if (currentActiveTab === 'accounts') {
      getEthBalance();
    } else if (currentActiveTab === 'tokens') {
      getTokenBalances();
    } else if (refreshBalances) {
      // If explicitly requested, refresh both
      getEthBalance();
      getTokenBalances();
    }
  }
};

// Update wallet UI based on current wallet state
export const updateWalletUIState = async () => {
  // DOM Elements
  const setupContainerEl = document.getElementById('setup-container');
  const walletStatusEl = document.getElementById('wallet-status');
  const sendTokenBtn = document.getElementById('send-token');
  const signMessageBtn = document.getElementById('sign-message');
  const addTokenBtn = document.getElementById('add-token');
  const addAccountBtn = document.getElementById('add-account');
  const importKeyBtn = document.getElementById('import-key-btn');
  const exportWalletBtn = document.getElementById('export-wallet');
  const lockWalletBtn = document.getElementById('lock-wallet');
  
  // Check if wallet is initialized
  const isInitialized = await backgroundService.checkWalletInitialized();
  setState({ walletInitialized: isInitialized });
  
  if (!isInitialized) {
    // Show setup UI
    setupContainerEl.style.display = 'block';
    document.querySelector('main').style.display = 'none';
    return;
  }
  
  // Hide setup UI, show main UI
  setupContainerEl.style.display = 'none';
  document.querySelector('main').style.display = 'block';
  
  // Check if wallet is locked
  const isLocked = await backgroundService.checkWalletLocked();
  setState({ walletLocked: isLocked });
  
  if (isLocked) {
    // Disable functionality first
    sendTokenBtn.disabled = true;
    signMessageBtn.disabled = true;
    addTokenBtn.disabled = true;
    addAccountBtn.disabled = true;
    importKeyBtn.disabled = true;
    exportWalletBtn.disabled = true;
    
    // Immediately prompt for password instead of showing locked state
    try {
      const password = await promptForPassword('Enter your password to unlock the wallet:');
      // Store password for future operations
      setState({ cachedPassword: password });
      
      // Unlock the wallet - this will trigger accountsChanged event to dApps
      await backgroundService.unlockWallet(password);
      setState({ walletLocked: false });
      
      // Update UI with unlocked state
      await getActiveAccount();
      await getAccountsList();
      updateAccountUI();
      getEthBalance();
      getTokenBalances();
      
      walletStatusEl.textContent = 'Wallet unlocked';
      lockWalletBtn.textContent = 'Lock Wallet';
      
      // Re-enable functionality
      sendTokenBtn.disabled = false;
      signMessageBtn.disabled = false;
      addTokenBtn.disabled = false;
      addAccountBtn.disabled = false;
      importKeyBtn.disabled = false;
      exportWalletBtn.disabled = false;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      
      // Only show locked UI if password prompt fails or is cancelled
      walletStatusEl.textContent = 'Wallet is locked. Please unlock.';
      lockWalletBtn.textContent = 'Unlock Wallet';
    }
  } else {
    // Show unlocked UI
    walletStatusEl.textContent = 'Wallet unlocked';
    lockWalletBtn.textContent = 'Lock Wallet';
    
    // Enable functionality
    sendTokenBtn.disabled = false;
    signMessageBtn.disabled = false;
    addTokenBtn.disabled = false;
    addAccountBtn.disabled = false;
    importKeyBtn.disabled = false;
    exportWalletBtn.disabled = false;
    
    // Load accounts and active account
    await getActiveAccount();
    await getAccountsList();
    updateAccountUI();
  }
};

// Get wallet information
export const getWallet = async () => {
  console.log('Getting wallet information...');
  
  // First, check if wallet is initialized
  const isInitialized = await backgroundService.checkWalletInitialized();
  console.log('Wallet initialized:', isInitialized);
  setState({ walletInitialized: isInitialized });
  
  if (!isInitialized) {
    // Show setup UI
    document.getElementById('setup-container').style.display = 'block';
    document.querySelector('main').style.display = 'none';
    console.log('Showing wallet setup UI');
    return;
  }
  
  // Hide setup UI, show main UI
  document.getElementById('setup-container').style.display = 'none';
  document.querySelector('main').style.display = 'block';
  
  // Check if wallet is locked
  let isLocked = true;
  let lockCheckError = false;
  try {
    isLocked = await backgroundService.checkWalletLocked();
    console.log('Wallet lock status:', isLocked ? 'locked' : 'unlocked');
    setState({ walletLocked: isLocked });
  } catch (error) {
    console.error('Error checking wallet lock status during initialization:', error);
    lockCheckError = true;
  }
  
  try {
    // Get accounts first - crucial step!
    console.log('Fetching wallet accounts');
    const allAccounts = await getAccounts();
    console.log(`Retrieved ${allAccounts ? allAccounts.length : 0} accounts from wallet`);
    
    // If we got no accounts but the wallet is unlocked, try again with explicit refresh
    if ((!allAccounts || allAccounts.length === 0) && !isLocked) {
      console.log('No accounts retrieved but wallet is unlocked - trying explicit refresh');
      try {
        await getAccountsList();
      } catch (refreshError) {
        console.error('Error in explicit account refresh:', refreshError);
      }
    }
    
    const { currentAccount, accounts } = getState();
    
    // Make sure there's an active account set if we have accounts
    if (accounts && accounts.length > 0 && !currentAccount) {
      console.log('Found accounts but no current account, getting active account');
      try {
        await getActiveAccount();
      } catch (activeError) {
        console.error('Error getting active account:', activeError);
      }
    }
    
    // Check again if we have a current account after all our attempts
    const finalCurrentAccount = getState().currentAccount;
    const finalAccounts = getState().accounts;
    
    if (!finalCurrentAccount && finalAccounts && finalAccounts.length > 0) {
      console.log('Still no current account, manually setting first account as active');
      try {
        await setActiveAccount(0);
      } catch (setError) {
        console.error('Error setting active account:', setError);
      }
    }
    
    // Now check one more time for a current account
    const lastCurrentAccount = getState().currentAccount;
    
    if (lastCurrentAccount) {
      console.log('Active account found:', lastCurrentAccount.address);
      document.getElementById('wallet-status').textContent = lastCurrentAccount.name ? 
        `${lastCurrentAccount.name} (${lastCurrentAccount.type})` : 
        'Wallet connected';
      
      // Make the address element clickable
      const accountAddressEl = document.getElementById('account-address');
      accountAddressEl.textContent = formatAddress(lastCurrentAccount.address);
      accountAddressEl.style.cursor = 'pointer';
      accountAddressEl.title = 'View on block explorer';
      
      // Get chain ID
      try {
        const chainId = await backgroundService.sendToBackground({
          method: 'eth_chainId',
          params: []
        });
        
        console.log('Got chain ID:', chainId);
        setState({ currentChainId: chainId });
        displayChainInfo(chainId);
      } catch (chainError) {
        console.error('Error getting chain ID:', chainError);
      }
      
      // Get balances
      getEthBalance();
      await getStoredTokens();
      getTokenBalances();
      updateTokenSelect();
      
      // Always update accounts list when wallet is initialized
      console.log('Updating accounts list after initialization');
      try {
        updateAccountsList();
      } catch (updateError) {
        console.error('Error updating accounts list:', updateError);
      }
    } else {
      // We have a wallet but no accounts - this is unusual but could happen
      console.warn('No wallet account found - wallet may be empty');
      document.getElementById('wallet-status').textContent = 'No wallet account found';
      
      // Try to create an account if we have a password
      const { cachedPassword } = getState();
      if (cachedPassword) {
        const shouldCreate = await customConfirm('No accounts found in your wallet. Would you like to create your first account?');
        if (shouldCreate) {
          try {
            console.log('Creating first account for empty wallet');
            await addAccountFromSeed();
          } catch (createError) {
            console.error('Error creating account:', createError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error initializing wallet:', error);
    document.getElementById('wallet-status').textContent = 'Error initializing wallet';
    
    // Add a recovery button if there's an error
    if (!document.getElementById('recovery-button')) {
      const recoveryBtn = document.createElement('button');
      recoveryBtn.id = 'recovery-button';
      recoveryBtn.innerText = 'Attempt Recovery';
      recoveryBtn.className = 'btn btn-sm btn-warning';
      recoveryBtn.style.marginLeft = '8px';
      
      recoveryBtn.addEventListener('click', async () => {
        try {
          // Try to prompt for password and refresh accounts
          const password = await promptForPassword('Enter your wallet password to attempt recovery:');
          if (!password) return;
          
          setState({ cachedPassword: password });
          await backgroundService.unlockWallet(password);
          await getAccountsList();
          await getActiveAccount();
          updateAccountUI();
          
          document.getElementById('wallet-status').textContent = 'Recovery successful!';
          recoveryBtn.remove();
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
          document.getElementById('wallet-status').textContent = 'Recovery failed: ' + recoveryError.message;
        }
      });
      
      const walletStatusEl = document.getElementById('wallet-status');
      if (walletStatusEl && walletStatusEl.parentNode) {
        walletStatusEl.parentNode.appendChild(recoveryBtn);
      }
    }
  }
};

// Display chain information
export const displayChainInfo = async (chainId) => {
  try {
    // Get chain info from wallet provider
    const chainInfo = await backgroundService.getChainInfo(chainId);
    
    let chainName = '';
    if (chainInfo && chainInfo.name) {
      chainName = chainInfo.name;
    } else {
      // Fallback for known chains
      switch (chainId) {
        case '0x1':
          chainName = 'Ethereum Mainnet';
          break;
        case '0xaa36a7':
          chainName = 'Sepolia Testnet';
          break;
        default:
          chainName = `Chain ID: ${chainId}`;
      }
    }
    
    document.getElementById('chain-info').textContent = chainName;
    
    // Update network select
    populateNetworkSelect();
    document.getElementById('network-select').value = chainId;
  } catch (error) {
    console.error('Error getting chain info:', error);
    // Fallback
    let chainName = '';
    switch (chainId) {
      case '0x1':
        chainName = 'Ethereum Mainnet';
        break;
      case '0xaa36a7':
        chainName = 'Sepolia Testnet';
        break;
      default:
        chainName = `Chain ID: ${chainId}`;
    }
    
    document.getElementById('chain-info').textContent = chainName;
  }
};

// Populate network select with all available chains
export const populateNetworkSelect = async () => {
  try {
    // Get all chains from storage
    const { userChains } = await browser.storage.local.get('userChains');
    
    // Get network select element
    const networkSelectEl = document.getElementById('network-select');
    
    // Clear existing options
    while (networkSelectEl.options.length > 0) {
      networkSelectEl.remove(0);
    }
    
    // Add built-in networks
    const builtInNetworks = [
      { id: '0x1', name: 'Ethereum Mainnet', builtin: true },
      { id: '0xaa36a7', name: 'Sepolia Testnet', builtin: true }
    ];
    
    // Optgroup for built-in networks
    const builtinGroup = document.createElement('optgroup');
    builtinGroup.label = 'Built-in Networks';
    
    for (const network of builtInNetworks) {
      const option = document.createElement('option');
      option.value = network.id;
      option.text = network.name;
      option.dataset.builtin = 'true';
      builtinGroup.appendChild(option);
    }
    
    networkSelectEl.appendChild(builtinGroup);
    
    // Add user-defined networks if any exist
    if (userChains && Object.keys(userChains).length > 0) {
      // Optgroup for custom networks
      const customGroup = document.createElement('optgroup');
      customGroup.label = 'Custom Networks';
      
      for (const [chainId, chain] of Object.entries(userChains)) {
        const option = document.createElement('option');
        option.value = chainId;
        option.text = chain.name;
        option.dataset.builtin = 'false';
        customGroup.appendChild(option);
      }
      
      networkSelectEl.appendChild(customGroup);
    }
    
    // Set the current value
    const { currentChainId } = getState();
    if (currentChainId) {
      networkSelectEl.value = currentChainId;
    }
    
    // Update the state of the remove button
    updateRemoveNetworkButton();
  } catch (error) {
    console.error('Error populating network select:', error);
  }
};

// Update the state of the remove network button
export const updateRemoveNetworkButton = () => {
  const networkSelectEl = document.getElementById('network-select');
  const removeNetworkBtn = document.getElementById('remove-network');
  
  const selectedOption = networkSelectEl.options[networkSelectEl.selectedIndex];
  const isBuiltin = selectedOption?.dataset?.builtin === 'true';
  
  if (isBuiltin) {
    removeNetworkBtn.disabled = true;
    removeNetworkBtn.title = 'Built-in networks cannot be removed';
  } else {
    removeNetworkBtn.disabled = false;
    removeNetworkBtn.title = 'Remove this network';
  }
};

// Get ETH balance
export const getEthBalance = async () => {
  const { ethBalanceRefreshTimer, lastBalanceRefreshTime, currentAccount, accounts } = getState();
  const { MIN_BALANCE_REFRESH_INTERVAL } = getRefreshIntervals();
  
  // Check if we've refreshed too recently
  const now = Date.now();
  if (now - lastBalanceRefreshTime < MIN_BALANCE_REFRESH_INTERVAL) {
    console.log('Skipping balance refresh: too soon since last refresh');
    return;
  }
  setState({ lastBalanceRefreshTime: now });
  
  // Clear any existing refresh timer to prevent multiple concurrent requests
  if (ethBalanceRefreshTimer) {
    clearTimeout(ethBalanceRefreshTimer);
    setState({ ethBalanceRefreshTimer: null });
  }
  
  // Get ETH balance element
  const ethBalanceEl = document.getElementById('eth-balance');
  
  // Basic validations to prevent unnecessary network calls
  if (!currentAccount) {
    console.warn('Cannot get ETH balance: No current account selected');
    ethBalanceEl.textContent = 'No account selected';
    return;
  }
  
  if (accounts.length === 0) {
    console.warn('Cannot get ETH balance: No accounts available');
    ethBalanceEl.textContent = 'No accounts available';
    return;
  }
  
  try {
    // Only show loading indicator if we don't already have an error state
    if (!ethBalanceEl.textContent.includes('Error')) {
      ethBalanceEl.innerHTML = '<div class="loading"></div> Loading...';
    }
    
    // Make sure we have accounts loaded before attempting to get balance
    if (accounts.length === 0) {
      try {
        console.log('No accounts loaded, attempting to refresh account list before getting ETH balance');
        await getAccounts();
        
        // Verify we have the current account selected
        const { currentAccount, accounts } = getState();
        if (accounts.length > 0 && !currentAccount) {
          await getActiveAccount();
        }
      } catch (accountError) {
        console.error('Error refreshing accounts before getting ETH balance:', accountError);
        ethBalanceEl.textContent = 'Error: Account data unavailable';
        return;
      }
    }
    
    // Double check we have a valid account after refresh
    const { currentAccount } = getState();
    if (!currentAccount || !currentAccount.address) {
      console.error('Cannot get ETH balance: No valid account available after refresh');
      ethBalanceEl.textContent = 'Error: No valid account';
      return;
    }
    
    const balance = await backgroundService.getEthBalance(currentAccount.address);
    
    // Convert from wei to ETH
    const ethBalance = parseInt(balance, 16) / 1e18;
    ethBalanceEl.textContent = `${ethBalance.toFixed(6)} ETH`;
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    
    // More helpful error message based on the error type
    if (error.message?.includes('No accounts found') || error.message?.includes('invalid account index')) {
      ethBalanceEl.textContent = 'Error: Account access issue';
      
      // Try to recover by refreshing accounts, but only once
      const { ethBalanceRefreshTimer } = getState();
      if (!ethBalanceRefreshTimer) {
        try {
          console.log('Attempting to recover from account access issue');
          await getAccounts();
          await getActiveAccount();
          updateAccountUI();
          
          // Set a timer to try again after a delay rather than retrying immediately
          // This prevents infinite refresh loops
          const timer = setTimeout(() => {
            console.log('Retrying balance fetch after recovery wait');
            setState({ ethBalanceRefreshTimer: null });
            getEthBalance();
          }, 2000);
          
          setState({ ethBalanceRefreshTimer: timer });
        } catch (recoveryError) {
          console.error('Failed to recover account state:', recoveryError);
        }
      }
    } else if (error.message?.includes('Wallet is locked')) {
      ethBalanceEl.textContent = 'Wallet is locked';
    } else {
      ethBalanceEl.textContent = 'Error loading ETH balance';
    }
  }
};

// Get stored tokens
export const getStoredTokens = async () => {
  try {
    const result = await browser.storage.local.get('tokens');
    const tokens = result.tokens || [];
    setState({ tokens });
    return tokens;
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return [];
  }
};

// Save tokens to storage
export const saveTokens = async () => {
  try {
    const { tokens } = getState();
    await browser.storage.local.set({ tokens });
    return true;
  } catch (error) {
    console.error('Error saving tokens:', error);
    return false;
  }
};

// Get token balances with optional force refresh
export const getTokenBalances = async (forceRefresh = false) => {
  const { 
    tokenBalanceRefreshTimer, 
    lastTokenBalanceRefreshTime, 
    currentAccount, 
    accounts,
    tokens,
    currentChainId
  } = getState();
  const { MIN_TOKEN_REFRESH_INTERVAL } = getRefreshIntervals();
  
  console.log(`Getting token balances${forceRefresh ? ' (forced refresh)' : ''}`);
  
  // Check if we've refreshed too recently, but allow override with forceRefresh
  const now = Date.now();
  if (!forceRefresh && now - lastTokenBalanceRefreshTime < MIN_TOKEN_REFRESH_INTERVAL) {
    console.log('Skipping token balance refresh: too soon since last refresh');
    return;
  }
  setState({ lastTokenBalanceRefreshTime: now });
  
  // Clear any existing refresh timer to prevent multiple concurrent requests
  if (tokenBalanceRefreshTimer) {
    clearTimeout(tokenBalanceRefreshTimer);
    setState({ tokenBalanceRefreshTimer: null });
  }
  
  // Get token balances element
  const tokenBalancesEl = document.getElementById('token-balances');
  
  // Basic validations to prevent unnecessary network calls
  if (!currentAccount) {
    tokenBalancesEl.textContent = 'No wallet connected';
    return;
  }
  
  if (accounts.length === 0) {
    tokenBalancesEl.textContent = 'No accounts available';
    return;
  }
  
  const chainTokens = tokens.filter(t => t.chainId === currentChainId);
  
  if (chainTokens.length === 0) {
    tokenBalancesEl.textContent = 'No tokens added for this network';
    return;
  }
  
  // Only show loading if we don't already have an error state
  if (!tokenBalancesEl.textContent.includes('Error')) {
    tokenBalancesEl.innerHTML = '<div class="loading"></div> Loading tokens...';
  }
  
  try {
    let balancesHtml = '';
    
    for (const token of chainTokens) {
      try {
        console.log(`Fetching balance for token ${token.symbol} (${token.address})`);
        
        // Prepare data for balanceOf call
        const methodSignature = '0x70a08231'; // balanceOf(address)
        const paddedAddress = currentAccount.address.substring(2).padStart(64, '0');
        const data = methodSignature + paddedAddress;
        
        // Call balanceOf on the token contract
        const balance = await backgroundService.callContractMethod(
          token.address,
          data,
          currentAccount.address
        );
        
        console.log(`Raw balance for ${token.symbol}:`, balance);
        
        // Convert balance based on decimals
        let formattedBalance;
        
        try {
          // Handle different balance return formats
          if (balance === '0x0' || balance === '0x') {
            formattedBalance = '0.000000';
          } else {
            // Convert to decimal number with proper formatting
            const balanceBigInt = BigInt(balance);
            const decimals = token.decimals || 18;
            
            // Format with proper decimal handling
            const fullNum = balanceBigInt.toString();
            
            if (fullNum === '0') {
              formattedBalance = '0.000000';
            } else if (fullNum.length <= decimals) {
              // Number is smaller than 1
              const padded = fullNum.padStart(decimals, '0');
              formattedBalance = '0.' + padded.slice(0, 6).padEnd(6, '0');
            } else {
              // Number is larger than 1
              const intPart = fullNum.slice(0, fullNum.length - decimals) || '0';
              const decimalStartPos = Math.max(0, fullNum.length - decimals);
              const decPart = fullNum.slice(decimalStartPos).slice(0, 6).padEnd(6, '0');
              formattedBalance = `${intPart}.${decPart}`;
            }
          }
        } catch (formatError) {
          console.error(`Error formatting balance for token ${token.symbol}:`, formatError);
          formattedBalance = 'Error formatting';
        }
        
        // Make sure we have a valid token symbol
        const displaySymbol = token.symbol || 'UNKNOWN';
        
        balancesHtml += `
          <div class="token-balance">
            <div class="token-symbol" title="${token.name || 'Unknown Token'}">${displaySymbol}</div>
            <div>${formattedBalance}</div>
          </div>
        `;
      } catch (tokenError) {
        // If one token fails, continue with the others
        console.error(`Error getting balance for token ${token.symbol || token.address}:`, tokenError);
        // Make sure we have a valid token symbol, even for error display
        const errorDisplaySymbol = token.symbol || 'UNKNOWN';
        
        balancesHtml += `
          <div class="token-balance">
            <div class="token-symbol" title="${token.name || 'Unknown Token'}">${errorDisplaySymbol}</div>
            <div class="error-text">Error loading</div>
          </div>
        `;
      }
    }
    
    tokenBalancesEl.innerHTML = balancesHtml || 'No tokens found';
  } catch (error) {
    console.error('Error getting token balances:', error);
    
    if (error.message?.includes('No accounts found') || error.message?.includes('invalid account index')) {
      tokenBalancesEl.textContent = 'Error: Account access issue';
      
      // Try to recover by refreshing accounts, but only once
      const { tokenBalanceRefreshTimer } = getState();
      if (!tokenBalanceRefreshTimer) {
        try {
          console.log('Attempting to recover from account access issue in token balances');
          await getAccounts();
          await getActiveAccount();
          updateAccountUI();
          
          // Set a timer to try again after a delay rather than retrying immediately
          // This prevents infinite refresh loops
          const timer = setTimeout(() => {
            console.log('Retrying token balance fetch after recovery wait');
            setState({ tokenBalanceRefreshTimer: null });
            getTokenBalances();
          }, 2000);
          
          setState({ tokenBalanceRefreshTimer: timer });
        } catch (recoveryError) {
          console.error('Failed to recover account state for token balances:', recoveryError);
        }
      }
    } else if (error.message?.includes('Wallet is locked')) {
      tokenBalancesEl.textContent = 'Wallet is locked';
    } else {
      tokenBalancesEl.textContent = 'Error loading token balances';
    }
  }
};

// Update token select dropdown
export const updateTokenSelect = () => {
  const { tokens, currentChainId } = getState();
  const tokenSelectEl = document.getElementById('token-select');
  
  // Clear previous options except ETH
  while (tokenSelectEl.options.length > 1) {
    tokenSelectEl.remove(1);
  }
  
  // Filter tokens by current chain
  const chainTokens = tokens.filter(t => t.chainId === currentChainId);
  
  // Add token options
  chainTokens.forEach(token => {
    const option = document.createElement('option');
    option.value = token.address;
    option.text = token.symbol;
    tokenSelectEl.add(option);
  });
};

// Helper: Convert hex string to decimal
export const hexToDecimal = (hex) => {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.substring(2) : hex;
  return parseInt(cleanHex, 16);
};

// Add account from seed phrase
export const addAccountFromSeed = async () => {
  const walletActionStatusEl = document.getElementById('wallet-action-status');
  const addAccountBtn = document.getElementById('add-account');
  
  try {
    console.log('Starting account creation process...');
    walletActionStatusEl.textContent = 'Adding new account...';
    walletActionStatusEl.style.color = '#000000';
    walletActionStatusEl.style.display = 'block';
    addAccountBtn.disabled = true;
    
    let { cachedPassword } = getState();
    if (!cachedPassword) {
      try {
        console.log('No cached password, prompting user');
        const password = await promptForPassword('Enter your password to add a new account:');
        setState({ cachedPassword: password });
        cachedPassword = password;
        console.log('Got password from user');
      } catch (pwError) {
        console.error('User cancelled password entry:', pwError);
        walletActionStatusEl.textContent = 'Account creation cancelled';
        walletActionStatusEl.style.color = '#ea4335';
        setTimeout(() => {
          walletActionStatusEl.style.display = 'none';
        }, 3000);
        addAccountBtn.disabled = false;
        return;
      }
    }
    
    console.log('Getting current accounts before adding new one...');
    const currentAccounts = await getAccounts();
    console.log(`Current accounts: ${currentAccounts.length}`);
    
    console.log('Sending wallet_addAccount request to background...');
    const result = await backgroundService.addAccount(
      cachedPassword,
      `Account ${currentAccounts.length + 1}`
    );
    
    console.log('New account added. Result:', result);
    
    // Force refresh the accounts
    console.log('Refreshing account list...');
    const updatedAccounts = await backgroundService.getAccounts(cachedPassword);
    
    console.log(`Updated accounts received: ${updatedAccounts.length}`);
    setState({ accounts: updatedAccounts });
    
    // Find the index of the newly created account
    const accounts = getState().accounts;
    const newAccountIndex = accounts.findIndex(account => 
      account.address && result.address && 
      account.address.toLowerCase() === result.address.toLowerCase()
    );
    
    console.log('New account index:', newAccountIndex, 'Address:', result.address);
    
    if (newAccountIndex !== -1) {
      console.log('Setting newly created account as active. Index:', newAccountIndex);
      // Set the new account as active
      await setActiveAccount(newAccountIndex);
      
      // Force reload active account
      setState({ currentAccount: accounts[newAccountIndex] });
      updateAccountUI();
    } else {
      console.warn('Could not find newly created account in accounts list');
      updateAccountsList(); // Still update the list even if we couldn't set active
    }
    
    // Final accounts refresh and UI update
    await getAccountsList();
    
    walletActionStatusEl.textContent = 'New account added successfully!';
    walletActionStatusEl.style.color = '#34a853';
    
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 3000);
    
    return result;
  } catch (error) {
    console.error('Error adding account:', error);
    walletActionStatusEl.textContent = 'Error: ' + error.message;
    walletActionStatusEl.style.color = '#ea4335';
    walletActionStatusEl.style.display = 'block';
    
    setTimeout(() => {
      walletActionStatusEl.style.display = 'none';
    }, 5000);
    
    throw error;
  } finally {
    addAccountBtn.disabled = false;
  }
};
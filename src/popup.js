// Wait for page to load
document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Tabs
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content > div');
  
  // DOM Elements - General
  const walletStatusEl = document.getElementById('wallet-status');
  const accountAddressEl = document.getElementById('account-address');
  const chainInfoEl = document.getElementById('chain-info');
  const ethBalanceEl = document.getElementById('eth-balance');
  const tokenBalancesEl = document.getElementById('token-balances');
  
  // DOM Elements - Token Management
  const tokenAddressInput = document.getElementById('token-address');
  const addTokenBtn = document.getElementById('add-token');
  const tokenSelectEl = document.getElementById('token-select');
  
  // DOM Elements - Send
  const recipientInput = document.getElementById('recipient');
  const amountInput = document.getElementById('amount');
  const sendTokenBtn = document.getElementById('send-token');
  const txStatusEl = document.getElementById('tx-status');
  
  // DOM Elements - Sign
  const messageInput = document.getElementById('message');
  const signMessageBtn = document.getElementById('sign-message');
  const signatureResultEl = document.getElementById('signature-result');
  
  // DOM Elements - Settings
  const networkSelectEl = document.getElementById('network-select');
  const switchNetworkBtn = document.getElementById('switch-network');
  const removeNetworkBtn = document.getElementById('remove-network');
  const networkStatusEl = document.getElementById('network-status');
  const copyAddressBtn = document.getElementById('copy-address');
  const accountsContainerEl = document.getElementById('accounts-container');
  const accountsListEl = document.getElementById('accounts-list');
  const addAccountBtn = document.getElementById('add-account');
  const exportWalletBtn = document.getElementById('export-wallet');
  const walletActionStatusEl = document.getElementById('wallet-action-status');
  const importSeedPhraseBtn = document.getElementById('import-seed-phrase');
  const seedPhraseInput = document.getElementById('seed-phrase-input');
  const importSeedStatusEl = document.getElementById('import-seed-status');
  const privateKeyDisplayEl = document.getElementById('private-key-display');
  const exportPrivateKeyBtn = document.getElementById('export-private-key');
  const importPrivateKeyInput = document.getElementById('import-private-key');
  const importKeyBtn = document.getElementById('import-key-btn');
  const importKeyStatusEl = document.getElementById('import-key-status');
  const passwordContainerEl = document.getElementById('password-container');
  const passwordPromptEl = document.getElementById('password-prompt');
  const passwordInputEl = document.getElementById('password-input');
  const passwordSubmitBtn = document.getElementById('password-submit');
  const passwordCancelBtn = document.getElementById('password-cancel');
  const passwordStatusEl = document.getElementById('password-status');
  const lockWalletBtn = document.getElementById('lock-wallet');
  
  // DOM Elements - Initial Setup (Wallet Creation)
  const setupContainerEl = document.getElementById('setup-container');
  const createWalletBtn = document.getElementById('create-wallet');
  const restoreWalletBtn = document.getElementById('restore-wallet');
  const setupPasswordInputEl = document.getElementById('setup-password-input');
  const setupConfirmPasswordInputEl = document.getElementById('setup-confirm-password-input');
  const setupMnemonicContainerEl = document.getElementById('setup-mnemonic-container');
  const setupMnemonicDisplayEl = document.getElementById('setup-mnemonic-display');
  const setupConfirmPhraseBtn = document.getElementById('setup-confirm-phrase');
  const setupImportPhraseContainerEl = document.getElementById('setup-import-phrase-container');
  const setupImportPhraseInputEl = document.getElementById('setup-import-phrase-input');
  const setupImportPhraseBtn = document.getElementById('setup-import-phrase');
  const setupStatusEl = document.getElementById('setup-status');
  
  // DOM Elements - Add Network
  const chainNameInput = document.getElementById('chain-name');
  const chainIdInput = document.getElementById('chain-id');
  const rpcUrlInput = document.getElementById('rpc-url');
  const blockExplorerInput = document.getElementById('block-explorer');
  const currencySymbolInput = document.getElementById('currency-symbol');
  const currencyDecimalsInput = document.getElementById('currency-decimals');
  const addNetworkBtn = document.getElementById('add-network');
  const addNetworkStatusEl = document.getElementById('add-network-status');
  
  // State variables
  let currentAccount = null;
  let activeAccountIndex = 0;
  let accounts = [];
  let tokens = [];
  let currentChainId = null;
  let walletInitialized = false;
  let walletLocked = true;
  let cachedPassword = null;

  // Save current UI state
  const saveState = async () => {
    try {
      // Determine active tab
      const activeTab = Array.from(tabs).find(t => t.classList.contains('active'))?.dataset.tab || 'assets';
      
      // Collect form values
      const state = {
        activeTab,
        forms: {
          // Send form
          send: {
            recipient: recipientInput.value,
            amount: amountInput.value,
            selectedToken: tokenSelectEl.value
          },
          // Token form
          token: {
            tokenAddress: tokenAddressInput.value
          },
          // Message signing form
          sign: {
            message: messageInput.value
          },
          // Network selection
          network: {
            selectedNetwork: networkSelectEl.value
          }
        }
      };
      
      // Save to storage
      await browser.storage.local.set({ popupState: state });
      console.log('UI state saved:', state);
    } catch (error) {
      console.error('Error saving UI state:', error);
    }
  };
  
  // Restore saved UI state
  const restoreState = async () => {
    try {
      const { popupState } = await browser.storage.local.get('popupState');
      
      if (popupState) {
        console.log('Restoring UI state:', popupState);
        
        // Restore active tab
        const tabToActivate = document.querySelector(`.tab[data-tab="${popupState.activeTab}"]`);
        if (tabToActivate) {
          // Simulate a click on the tab
          switchToTab(popupState.activeTab);
        }
        
        // Restore form values
        if (popupState.forms) {
          // Restore send form
          if (popupState.forms.send) {
            recipientInput.value = popupState.forms.send.recipient || '';
            amountInput.value = popupState.forms.send.amount || '';
            if (popupState.forms.send.selectedToken) {
              tokenSelectEl.value = popupState.forms.send.selectedToken;
            }
          }
          
          // Restore token form
          if (popupState.forms.token) {
            tokenAddressInput.value = popupState.forms.token.tokenAddress || '';
          }
          
          // Restore message form
          if (popupState.forms.sign) {
            messageInput.value = popupState.forms.sign.message || '';
          }
          
          // Restore network selection
          if (popupState.forms.network && popupState.forms.network.selectedNetwork) {
            networkSelectEl.value = popupState.forms.network.selectedNetwork;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring UI state:', error);
    }
  };
  
  // Track the current active tab
  let currentActiveTab = null;
  
  // Function to switch tabs
  const switchToTab = (tabName) => {
    // If already on this tab, do nothing
    if (currentActiveTab === tabName) {
      return;
    }
    
    // Save the previous tab
    const previousTab = currentActiveTab;
    
    // Update current tab
    currentActiveTab = tabName;
    
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}-tab`);
    
    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
      
      // Refresh data only if needed based on the tab
      if (tabName === 'accounts' || tabName === 'tokens') {
        // These tabs need updated balance data
        if (previousTab !== 'accounts' && previousTab !== 'tokens') {
          console.log(`Switching to ${tabName} tab - refreshing balances`);
          
          // Only refresh if accounts are loaded
          if (currentAccount && accounts.length > 0) {
            if (tabName === 'accounts') {
              getEthBalance();
            } else if (tabName === 'tokens') {
              getTokenBalances();
            }
          }
        }
      }
      
      // Save state after tab switch
      saveState();
    }
  };
  
  // Tab switching with state saving
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchToTab(tabName);
    });
  });
  
  // Listen for input changes to save state
  const inputElements = [
    recipientInput, amountInput, tokenSelectEl, 
    tokenAddressInput, messageInput, networkSelectEl
  ];
  
  inputElements.forEach(el => {
    el.addEventListener('change', saveState);
    el.addEventListener('input', saveState);
  });
  
  // Save state before popup closes
  window.addEventListener('beforeunload', saveState);

  // Get wallet instance from background page
  // Send a message to the background script and wait for response
  const sendToBackground = (message) => {
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
  const checkWalletInitialized = async () => {
    try {
      const isInitialized = await sendToBackground({
        method: 'wallet_isInitialized',
        params: []
      });
      
      walletInitialized = isInitialized;
      return isInitialized;
    } catch (error) {
      console.error('Error checking wallet initialization status:', error);
      return false;
    }
  };
  
  // Check if wallet is locked
  const checkWalletLocked = async () => {
    try {
      const isLocked = await sendToBackground({
        method: 'wallet_isLocked',
        params: []
      });
      
      walletLocked = isLocked;
      return isLocked;
    } catch (error) {
      console.error('Error checking wallet lock status:', error);
      
      // If we get errors checking the lock status, the wallet state might be inconsistent
      // Try to detect and correct wallet state issues
      
      try {
        // First, check if wallet is initialized
        const initialized = await sendToBackground({
          method: 'wallet_isInitialized',
          params: []
        });
        
        if (initialized) {
          console.warn('Wallet is initialized but there was an error checking lock status. Trying to recover...');
          
          // First, try to explicitly unlock if the user provides a password
          try {
            const password = await promptForPassword('Wallet state is inconsistent. Enter your password to recover:');
            if (password) {
              await sendToBackground({
                method: 'wallet_unlock',
                params: [{ password }]
              });
              
              // If we get here, the unlock worked
              walletLocked = false;
              return false;
            }
          } catch (unlockError) {
            console.error('Error attempting unlock recovery:', unlockError);
          }
          
          // If unlock didn't work or was cancelled, try a state reset
          const shouldReset = await customConfirm('Unable to access wallet. Would you like to try resetting the wallet state? (Your data will be preserved, but you will need to enter your password again)');
          if (shouldReset) {
            try {
              // Set wallet state to locked explicitly
              await browser.storage.local.set({ 'walletEncryptionStatus': 'locked' });
              
              // Try unlock again
              try {
                const password = await promptForPassword('Enter your wallet password:');
                if (password) {
                  await sendToBackground({
                    method: 'wallet_unlock',
                    params: [{ password }]
                  });
                  
                  // If we get here, the unlock worked after reset
                  walletLocked = false;
                  return false;
                }
              } catch (secondUnlockError) {
                console.error('Error unlocking after state reset:', secondUnlockError);
              }
            } catch (resetError) {
              console.error('Error resetting wallet state:', resetError);
            }
          }
        }
      } catch (recoveryError) {
        console.error('Error in recovery process:', recoveryError);
      }
      
      return true; // Assume locked if error and recovery failed
    }
  };

  // Show password prompt and wait for input
  const promptForPassword = (message) => {
    return new Promise((resolve, reject) => {
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

  // Initialize wallet
  const initializeWallet = async (password, mnemonic = null) => {
    try {
      const result = await sendToBackground({
        method: 'wallet_initializeWallet',
        params: [{
          password,
          mnemonic
        }]
      });
      
      cachedPassword = password;
      walletInitialized = true;
      walletLocked = false;
      
      return result;
    } catch (error) {
      console.error('Error initializing wallet:', error);
      throw error;
    }
  };
  
  // Unlock wallet
  const unlockWallet = async (password) => {
    try {
      const result = await sendToBackground({
        method: 'wallet_unlock',
        params: [{
          password
        }]
      });
      
      cachedPassword = password;
      walletLocked = false;
      
      return result;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      throw error;
    }
  };
  
  // Lock wallet
  const lockWallet = async () => {
    try {
      await sendToBackground({
        method: 'wallet_lock',
        params: []
      });
      
      cachedPassword = null;
      walletLocked = true;
      
      // Update UI to show locked state
      updateWalletUIState();
      
      return true;
    } catch (error) {
      console.error('Error locking wallet:', error);
      throw error;
    }
  };

  // Get accounts
  const getAccounts = async () => {
    try {
      console.log('Fetching accounts, wallet locked:', walletLocked, 'cached password available:', !!cachedPassword);
      
      // The background script now handles password session management
      // so we can just make the request without passing a password parameter
      // If the wallet is locked, it will be automatically unlocked with the session password
      
      // Request accounts from background
      const accountsResult = await sendToBackground({
        method: 'wallet_getAccounts',
        params: [{}]
      });
      
      console.log(`Retrieved ${accountsResult ? accountsResult.length : 0} accounts from wallet`);
      
      if (accountsResult && accountsResult.length > 0) {
        // Only update global accounts if we got valid results
        accounts = accountsResult;
        console.log('Updated global accounts array');
        
        // If there's no current account but we have accounts, set the first one
        if (!currentAccount && accounts.length > 0) {
          console.log('No current account selected, setting first account as current');
          await getActiveAccountIndex();
          currentAccount = accounts[activeAccountIndex] || accounts[0];
        }
        
        // If the request succeeded, the wallet must be unlocked now
        walletLocked = false;
      } else {
        console.warn('No accounts returned from wallet_getAccounts');
        
        // Try again with explicit password if available, might help with initialization
        if (cachedPassword) {
          console.log('Retrying with explicit password parameter');
          try {
            const retryResult = await sendToBackground({
              method: 'wallet_getAccounts',
              params: [{ password: cachedPassword }]
            });
            
            if (retryResult && retryResult.length > 0) {
              accounts = retryResult;
              console.log('Retry succeeded, got accounts:', retryResult.length);
              walletLocked = false;
              return retryResult;
            }
          } catch (retryError) {
            console.error('Explicit password retry failed:', retryError);
          }
        }
      }
      
      return accountsResult;
    } catch (error) {
      console.error('Error getting accounts:', error);
      // Check if this was due to the wallet being locked
      if (error.message && error.message.includes('Wallet is locked')) {
        walletLocked = true;
        
        // We need to prompt for password - automatic unlocking didn't work
        try {
          const password = await promptForPassword('Enter your password to unlock the wallet:');
          if (password) {
            cachedPassword = password;
            await unlockWallet(password);
            // Try again with the password we just got
            return getAccounts();
          }
        } catch (promptError) {
          console.error('Password prompt cancelled or failed:', promptError);
        }
      }
      
      // Just log the error but don't throw, so UI can still update
      return accounts || [];
    }
  };
  
  // Get active account index
  const getActiveAccountIndex = async () => {
    try {
      // Get from state
      const { activeAccount } = await browser.storage.local.get('activeAccount');
      activeAccountIndex = activeAccount !== undefined ? activeAccount : 0;
      return activeAccountIndex;
    } catch (error) {
      console.error('Error getting active account index:', error);
      return 0;
    }
  };
  
  // Get the current active account details
  const getActiveAccount = async () => {
    try {
      console.log('Getting active account...');
      
      // Get active account index first
      let indexSuccess = false;
      try {
        await getActiveAccountIndex();
        indexSuccess = true;
        console.log('Retrieved active account index:', activeAccountIndex);
      } catch (indexError) {
        console.error('Error getting active account index:', indexError);
        // If we can't get the index, we'll try with index 0 as fallback
        activeAccountIndex = 0;
      }
      
      // Make sure we have accounts loaded
      let accountsSuccess = false;
      try {
        await getAccounts();
        accountsSuccess = true;
        console.log(`Retrieved ${accounts.length} accounts`);
      } catch (accountsError) {
        console.error('Error loading accounts:', accountsError);
      }
      
      // Handle empty accounts array
      if (!accounts || accounts.length === 0) {
        console.warn('No accounts available in wallet');
        currentAccount = null;
        
        // Try to refresh accounts with explicit password if available
        if (cachedPassword) {
          try {
            console.log('Attempting to refresh accounts with cached password');
            const refreshResult = await sendToBackground({
              method: 'wallet_getAccounts',
              params: [{ password: cachedPassword }]
            });
            
            if (refreshResult && refreshResult.length > 0) {
              accounts = refreshResult;
              console.log('Account refresh successful, retrieved', accounts.length, 'accounts');
              accountsSuccess = true;
            }
          } catch (refreshError) {
            console.error('Failed to refresh accounts with cached password:', refreshError);
          }
        }
        
        // If we still have no accounts, return null
        if (!accounts || accounts.length === 0) {
          return null;
        }
      }
      
      // Validate the active account index
      if (!indexSuccess || activeAccountIndex >= accounts.length) {
        console.warn(`Invalid active account index: ${activeAccountIndex}, max: ${accounts.length - 1}. Resetting to 0.`);
        activeAccountIndex = 0;
        
        // Update the active account index in the wallet
        try {
          await setActiveAccount(0);
          console.log('Active account index reset to 0');
        } catch (resetError) {
          console.error('Failed to reset active account index:', resetError);
        }
      }
      
      // Set current account
      currentAccount = accounts[activeAccountIndex];
      
      // Validate account data
      if (!currentAccount || !currentAccount.address) {
        console.error('Invalid account data retrieved:', currentAccount);
        // Try first account as fallback
        currentAccount = accounts[0];
        
        if (!currentAccount || !currentAccount.address) {
          console.error('No valid accounts available in wallet');
          currentAccount = null;
          return null;
        }
      }
      
      console.log('Active account set to:', currentAccount.address);
      return currentAccount;
    } catch (error) {
      console.error('Error getting active account:', error);
      currentAccount = null;
      return null;
    }
  };
  
  // Set active account
  const setActiveAccount = async (index) => {
    try {
      await sendToBackground({
        method: 'wallet_setActiveAccount',
        params: [{
          index
        }]
      });
      
      activeAccountIndex = index;
      
      // Update UI with new active account
      await getActiveAccount();
      
      // Update UI and explicitly refresh balances based on current tab
      updateAccountUI(true); // Pass true to force balance refresh
      
      // Refresh accounts list to ensure it's up to date
      await getAccountsList();
      
      // No need to call getEthBalance and getTokenBalances directly here
      // as updateAccountUI(true) will handle this appropriately
      
      return true;
    } catch (error) {
      console.error('Error setting active account:', error);
      throw error;
    }
  };
  
  // Add new account from seed phrase
  const addAccountFromSeed = async () => {
    try {
      console.log('Starting account creation process...');
      walletActionStatusEl.textContent = 'Adding new account...';
      walletActionStatusEl.style.color = '#000000';
      walletActionStatusEl.style.display = 'block';
      addAccountBtn.disabled = true;
      
      if (!cachedPassword) {
        try {
          console.log('No cached password, prompting user');
          const password = await promptForPassword('Enter your password to add a new account:');
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
      const result = await sendToBackground({
        method: 'wallet_addAccount',
        params: [{
          password: cachedPassword,
          name: `Account ${currentAccounts.length + 1}`
        }]
      });
      
      console.log('New account added. Result:', result);
      
      // Force refresh the accounts
      console.log('Refreshing account list...');
      const updatedAccounts = await sendToBackground({
        method: 'wallet_getAccounts',
        params: [{ password: cachedPassword }]
      });
      
      console.log(`Updated accounts received: ${updatedAccounts.length}`);
      accounts = updatedAccounts;
      
      // Find the index of the newly created account
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
        currentAccount = accounts[newAccountIndex];
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
  
  // Import account from private key
  const importAccountFromKey = async () => {
    try {
      const privateKey = importPrivateKeyInput.value.trim();
      
      if (!privateKey) {
        importKeyStatusEl.textContent = 'Please enter a private key';
        importKeyStatusEl.style.color = '#ea4335';
        importKeyStatusEl.style.display = 'block';
        return;
      }
      
      if (!cachedPassword) {
        try {
          const password = await promptForPassword('Enter your password to import this key:');
          cachedPassword = password;
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
      const accountInfo = await sendToBackground({
        method: 'wallet_importAccount',
        params: [{
          privateKey,
          name: `Imported ${accounts.filter(a => a.type === 'imported').length + 1}`,
          password: cachedPassword
        }]
      });
      
      console.log('Account imported:', accountInfo);
      
      // Update accounts list
      await getAccounts();
      
      // Find the index of the newly imported account
      const newAccountIndex = accounts.findIndex(account => 
        account.address.toLowerCase() === accountInfo.address.toLowerCase()
      );
      
      if (newAccountIndex !== -1) {
        console.log('Setting newly imported account as active. Index:', newAccountIndex);
        // Set the new account as active
        await setActiveAccount(newAccountIndex);
      } else {
        console.warn('Could not find newly imported account in accounts list');
        updateAccountsList(); // Still update the list even if we couldn't set active
      }
      
      // Clear the input
      importPrivateKeyInput.value = '';
      
      importKeyStatusEl.textContent = `Successfully imported account: ${formatAddress(accountInfo.address)} (now active)`;
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
    try {
      if (!cachedPassword) {
        try {
          const password = await promptForPassword('Enter your password to export wallet:');
          cachedPassword = password;
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
      const walletData = await sendToBackground({
        method: 'wallet_exportWallet',
        params: [{
          password: cachedPassword
        }]
      });
      
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
  
  // Import wallet from file
  const importWallet = async (fileData) => {
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
      const result = await sendToBackground({
        method: 'wallet_importWallet',
        params: [{
          fileData,
          password
        }]
      });
      
      // Cache the password
      cachedPassword = password;
      walletInitialized = true;
      walletLocked = false;
      
      // Update accounts list and UI
      await getAccounts();
      await getActiveAccount();
      updateAccountsList();
      updateAccountUI();
      
      // Get balances
      getEthBalance();
      getTokenBalances();
      
      walletActionStatusEl.textContent = `Wallet imported successfully! (${result.accounts} accounts, ${result.importedAccounts} imported keys)`;
      walletActionStatusEl.style.color = '#34a853';
      
      // Switch to the accounts tab
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
  
  // Helper function to handle wallet import file selection
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
        walletActionStatusEl.textContent = 'Error reading wallet file: ' + error.message;
        walletActionStatusEl.style.color = '#ea4335';
        walletActionStatusEl.style.display = 'block';
      }
    };
    
    reader.readAsText(file);
  };
  
  // Create a file input for wallet import
  const createWalletFileInput = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleWalletImportFileSelect);
    document.body.appendChild(fileInput);
    return fileInput;
  };

  // Export private key for active account
  const exportPrivateKey = async () => {
    try {
      if (!cachedPassword) {
        try {
          const password = await promptForPassword('Enter your password to export private key:');
          cachedPassword = password;
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
      
      // Get the private key - FIXED: call wallet_getPrivateKey on background script
      console.log('Requesting private key from background script');
      const privateKey = await sendToBackground({
        method: 'wallet_getPrivateKey',
        params: [{
          password: cachedPassword
        }]
      });
      
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
  
  // Update UI based on current wallet state
  const updateWalletUIState = async () => {
    // Check if wallet is initialized
    const isInitialized = await checkWalletInitialized();
    
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
    const isLocked = await checkWalletLocked();
    
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
        cachedPassword = password;
        
        // Unlock the wallet - this will trigger accountsChanged event to dApps
        await unlockWallet(password);
        
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
  
  // Update account UI with current active account
  const updateAccountUI = (refreshBalances = false) => {
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
  
  // Get accounts list and update UI
  const getAccountsList = async () => {
    try {
      console.log('Getting accounts list and updating UI');
      // Get accounts
      const retrievedAccounts = await getAccounts();
      console.log(`Retrieved ${retrievedAccounts ? retrievedAccounts.length : 0} accounts`);
      
      // Ensure global accounts array is updated
      accounts = retrievedAccounts;
      
      // Update UI with accounts
      updateAccountsList();
      return accounts;
    } catch (error) {
      console.error('Error getting accounts list:', error);
      throw error;
    }
  };

  // Update accounts list UI
  const updateAccountsList = () => {
    console.log('Updating accounts list UI with:', accounts ? accounts.length : 0, 'accounts');
    console.log('Active account index:', activeAccountIndex);
    
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
  
  // Get wallet information
  const getWallet = async () => {
    console.log('Getting wallet information...');
    
    // First, check if wallet is initialized
    const isInitialized = await checkWalletInitialized();
    console.log('Wallet initialized:', isInitialized);
    
    if (!isInitialized) {
      // Show setup UI
      setupContainerEl.style.display = 'block';
      document.querySelector('main').style.display = 'none';
      console.log('Showing wallet setup UI');
      return;
    }
    
    // Hide setup UI, show main UI
    setupContainerEl.style.display = 'none';
    document.querySelector('main').style.display = 'block';
    
    // Check if wallet is locked
    const isLocked = await checkWalletLocked();
    console.log('Wallet locked:', isLocked);
    
    // We'll try to access accounts regardless of locked status
    // The background script now maintains the password in session memory
    // and will automatically unlock the wallet if needed
    
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
      
      // Make sure there's an active account set if we have accounts
      if (accounts && accounts.length > 0 && !currentAccount) {
        console.log('Found accounts but no current account, getting active account');
        try {
          await getActiveAccount();
        } catch (activeError) {
          console.error('Error getting active account:', activeError);
        }
      }
      
      if (!currentAccount && accounts && accounts.length > 0) {
        console.log('Still no current account, manually setting first account as active');
        try {
          await setActiveAccount(0);
          currentAccount = accounts[0];
        } catch (setError) {
          console.error('Error setting active account:', setError);
        }
      }
      
      if (currentAccount) {
        console.log('Active account found:', currentAccount.address);
        walletStatusEl.textContent = currentAccount.name ? 
          `${currentAccount.name} (${currentAccount.type})` : 
          'Wallet connected';
        
        // Make the address element clickable
        accountAddressEl.textContent = formatAddress(currentAccount.address);
        accountAddressEl.style.cursor = 'pointer';
        accountAddressEl.title = 'View on block explorer';
        
        // Get chain ID
        try {
          currentChainId = await sendToBackground({
            method: 'eth_chainId',
            params: []
          });
          
          console.log('Got chain ID:', currentChainId);
          displayChainInfo(currentChainId);
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
        walletStatusEl.textContent = 'No wallet account found';
        
        // Try to create an account if we have a password
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
      walletStatusEl.textContent = 'Error initializing wallet';
      
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
            
            cachedPassword = password;
            await unlockWallet(password);
            await getAccountsList();
            await getActiveAccount();
            updateAccountUI();
            
            walletStatusEl.textContent = 'Recovery successful!';
            recoveryBtn.remove();
          } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
            walletStatusEl.textContent = 'Recovery failed: ' + recoveryError.message;
          }
        });
        
        walletStatusEl.parentNode.appendChild(recoveryBtn);
      }
    }
  };

  // Get or create wallet file input
  let walletFileInput;
  const getWalletFileInput = () => {
    if (!walletFileInput) {
      walletFileInput = createWalletFileInput();
    }
    return walletFileInput;
  };

  // Setup: Create new wallet with newly generated seed phrase
  const setupCreateWallet = async () => {
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
      const walletState = await initializeWallet(password);
      
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
      setupContainerEl.style.display = 'none';
      document.querySelector('main').style.display = 'block';
      
      // Get accounts first, to make sure we have a list of accounts
      await getAccounts();
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
      updateAccountsList();
      
      // Get chain ID
      currentChainId = await sendToBackground({
        method: 'eth_chainId',
        params: []
      });
      
      displayChainInfo(currentChainId);
      
      // Get balances
      getEthBalance();
      await getStoredTokens();
      getTokenBalances();
      updateTokenSelect();
    } catch (error) {
      console.error('Error finalizing wallet setup:', error);
      setupStatusEl.textContent = 'Error: ' + error.message;
      setupStatusEl.style.color = '#ea4335';
      setupStatusEl.style.display = 'block';
    }
  };
  
  // Setup: Show import seed phrase UI
  const setupShowImportUI = () => {
    document.getElementById('setup-password-container').style.display = 'none';
    setupImportPhraseContainerEl.style.display = 'block';
  };
  
  // Setup: Import wallet from seed phrase
  const setupImportWallet = async () => {
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
      await initializeWallet(password, seedPhrase);
      
      // Hide setup UI, show main UI
      setupContainerEl.style.display = 'none';
      document.querySelector('main').style.display = 'block';
      
      // Get accounts first, to make sure we have a list of accounts
      await getAccounts();
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
      updateAccountsList();
      
      // Get chain ID
      currentChainId = await sendToBackground({
        method: 'eth_chainId',
        params: []
      });
      
      displayChainInfo(currentChainId);
      
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

  // Display chain info
  const displayChainInfo = async (chainId) => {
    try {
      // Get chain info from wallet provider
      const chainInfo = await sendToBackground({
        method: 'wallet_getChainInfo',
        params: [chainId]
      });
      
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
      
      chainInfoEl.textContent = chainName;
      
      // Update network select
      populateNetworkSelect();
      networkSelectEl.value = chainId;
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
      
      chainInfoEl.textContent = chainName;
    }
  };
  
  // Populate network select with all available chains
  const populateNetworkSelect = async () => {
    try {
      // Get all chains from storage
      const { userChains } = await browser.storage.local.get('userChains');
      
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
  const updateRemoveNetworkButton = () => {
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

  // Balance refresh timer
  let ethBalanceRefreshTimer = null;
  let lastBalanceRefreshTime = 0;
  const MIN_BALANCE_REFRESH_INTERVAL = 1000; // Minimum time between refreshes in ms
  
  // Get ETH balance
  const getEthBalance = async () => {
    // Check if we've refreshed too recently
    const now = Date.now();
    if (now - lastBalanceRefreshTime < MIN_BALANCE_REFRESH_INTERVAL) {
      console.log('Skipping balance refresh: too soon since last refresh');
      return;
    }
    lastBalanceRefreshTime = now;
    
    // Clear any existing refresh timer to prevent multiple concurrent requests
    if (ethBalanceRefreshTimer) {
      clearTimeout(ethBalanceRefreshTimer);
      ethBalanceRefreshTimer = null;
    }
    
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
      if (!currentAccount || !currentAccount.address) {
        console.error('Cannot get ETH balance: No valid account available after refresh');
        ethBalanceEl.textContent = 'Error: No valid account';
        return;
      }
      
      const balance = await sendToBackground({
        method: 'eth_getBalance',
        params: [currentAccount.address, 'latest']
      });
      
      // Convert from wei to ETH
      const ethBalance = parseInt(balance, 16) / 1e18;
      ethBalanceEl.textContent = `${ethBalance.toFixed(6)} ETH`;
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      
      // More helpful error message based on the error type
      if (error.message?.includes('No accounts found') || error.message?.includes('invalid account index')) {
        ethBalanceEl.textContent = 'Error: Account access issue';
        
        // Try to recover by refreshing accounts, but only once
        if (!ethBalanceRefreshTimer) {
          try {
            console.log('Attempting to recover from account access issue');
            await getAccounts();
            await getActiveAccount();
            updateAccountUI();
            
            // Set a timer to try again after a delay rather than retrying immediately
            // This prevents infinite refresh loops
            ethBalanceRefreshTimer = setTimeout(() => {
              console.log('Retrying balance fetch after recovery wait');
              ethBalanceRefreshTimer = null;
              getEthBalance();
            }, 2000);
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
  const getStoredTokens = async () => {
    try {
      const result = await browser.storage.local.get('tokens');
      tokens = result.tokens || [];
    } catch (error) {
      console.error('Error getting stored tokens:', error);
      tokens = [];
    }
  };

  // Save tokens to storage
  const saveTokens = async () => {
    try {
      await browser.storage.local.set({ tokens });
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  };

  // Show notification message
  const showNotification = (message, isError = false) => {
    const notificationEl = document.getElementById('copied-notification');
    notificationEl.textContent = message;
    notificationEl.style.backgroundColor = isError ? 'rgba(234, 67, 53, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    notificationEl.style.display = 'block';
    
    setTimeout(() => {
      notificationEl.style.display = 'none';
    }, 3000);
  };
  
  // Custom confirm dialog to replace browser's confirm()
  const customConfirm = (message) => {
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

  // Add a token
  const addToken = async () => {
    // First, check the wallet state
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
        tokenName = await callContractMethod(tokenAddress, 'name', []);
      } catch (nameError) {
        console.error('Error getting token name:', nameError);
        tokenName = 'Unknown Token';
      }
      
      try {
        tokenSymbol = await callContractMethod(tokenAddress, 'symbol', []);
      } catch (symbolError) {
        console.error('Error getting token symbol:', symbolError);
        tokenSymbol = 'UNKNOWN';
      }
      
      try {
        tokenDecimals = await callContractMethod(tokenAddress, 'decimals', []);
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
      
      tokens.push(newToken);
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

  // Token balance refresh timer and protection
  let tokenBalanceRefreshTimer = null;
  let lastTokenBalanceRefreshTime = 0;
  const MIN_TOKEN_REFRESH_INTERVAL = 1500; // Minimum time between refreshes in ms
  
  // Get token balances with optional force refresh 
  const getTokenBalances = async (forceRefresh = false) => {
    console.log(`Getting token balances${forceRefresh ? ' (forced refresh)' : ''}`);
    
    // Check if we've refreshed too recently, but allow override with forceRefresh
    const now = Date.now();
    if (!forceRefresh && now - lastTokenBalanceRefreshTime < MIN_TOKEN_REFRESH_INTERVAL) {
      console.log('Skipping token balance refresh: too soon since last refresh');
      return;
    }
    lastTokenBalanceRefreshTime = now;
    
    // Clear any existing refresh timer to prevent multiple concurrent requests
    if (tokenBalanceRefreshTimer) {
      clearTimeout(tokenBalanceRefreshTimer);
      tokenBalanceRefreshTimer = null;
    }
    
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
          
          // Call balanceOf on the token contract
          const balance = await callContractMethod(
            token.address,
            'balanceOf',
            [currentAccount.address]
          );
          
          console.log(`Raw balance for ${token.symbol}:`, balance);
          
          // Convert balance based on decimals
          let formattedBalance;
          
          try {
            // Use BigInt for safe handling of large numbers
            if (balance === '0x0' || balance === '0x') {
              formattedBalance = '0.000000';
            } else {
              console.log(`Formatting balance for ${token.symbol}: ${balance}`);
              
              // Handle BigInt conversion properly
              let balanceBigInt;
              try {
                balanceBigInt = BigInt(balance);
              } catch (bigintError) {
                console.error('Error converting balance to BigInt:', bigintError);
                formattedBalance = 'Error';
                throw bigintError;
              }
              
              console.log(`Balance as BigInt: ${balanceBigInt.toString()}`);
              
              // Convert to decimal string for precision
              const fullNum = balanceBigInt.toString();
              console.log(`Balance as string: ${fullNum}`);
              
              // Apply decimals
              const decimals = token.decimals || 18;
              console.log(`Token decimals: ${decimals}`);
              
              // Format balance with proper decimal handling
              try {
                if (fullNum === '0') {
                  formattedBalance = '0.000000';
                } else if (fullNum.length <= decimals) {
                  // Number is smaller than 1
                  const padded = fullNum.padStart(decimals, '0');
                  formattedBalance = '0.' + padded.slice(0, 6).padEnd(6, '0');
                  console.log(`Small number: padded=${padded}, formatted=${formattedBalance}`);
                } else {
                  // Number is larger than 1
                  const intPart = fullNum.slice(0, fullNum.length - decimals) || '0';
                  const decimalStartPos = Math.max(0, fullNum.length - decimals);
                  const decPart = fullNum.slice(decimalStartPos).slice(0, 6).padEnd(6, '0');
                  formattedBalance = `${intPart}.${decPart}`;
                  console.log(`Large number: intPart=${intPart}, decPart=${decPart}, formatted=${formattedBalance}`);
                }
              } catch (formatError) {
                console.error('Error formatting number parts:', formatError);
                formattedBalance = 'Format error';
                throw formatError;
              }
            }
            
            console.log(`Formatted balance for ${token.symbol}:`, formattedBalance);
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
        if (!tokenBalanceRefreshTimer) {
          try {
            console.log('Attempting to recover from account access issue in token balances');
            await getAccounts();
            await getActiveAccount();
            updateAccountUI();
            
            // Set a timer to try again after a delay rather than retrying immediately
            // This prevents infinite refresh loops
            tokenBalanceRefreshTimer = setTimeout(() => {
              console.log('Retrying token balance fetch after recovery wait');
              tokenBalanceRefreshTimer = null;
              getTokenBalances();
            }, 2000);
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
  const updateTokenSelect = () => {
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

  // Send token or ETH
  const sendToken = async () => {
    try {
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
        // Send ETH - completely revised with safer number handling
        try {
          // Convert ETH to Wei with extra careful handling
          const ethAmount = parseFloat(amount);
          console.log('ETH amount (parsed):', ethAmount);
          
          // Calculate wei value using string operations to avoid floating point issues
          // First multiply by 10^18 to get wei
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
          
          txHash = await sendToBackground({
            method: 'eth_sendTransaction',
            params: [{
              from: currentAccount.address,
              to: recipient,
              value: hexValue
            }, requestId]
          });
        } catch (error) {
          console.error('Error preparing ETH transaction:', error);
          throw new Error(`Failed to prepare ETH transaction: ${error.message}`);
        }
      } else {
        // Send ERC-20 token with improved error handling
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
          
          txHash = await sendToBackground({
            method: 'eth_sendTransaction',
            params: [{
              from: currentAccount.address,
              to: tokenValue,
              data
            }, requestId]
          });
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
      txStatusEl.textContent = 'Error: ' + error.message;
    } finally {
      sendTokenBtn.disabled = false;
    }
  };

  // Sign a message
  const signMessage = async () => {
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
      const signature = await sendToBackground({
        method: 'personal_sign',
        params: [messageHex, requestId, true] // true = skipApproval
      });
      
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
    const chainId = networkSelectEl.value;
    
    if (chainId === currentChainId) {
      return;
    }
    
    try {
      networkStatusEl.innerHTML = '<div class="loading"></div> Switching...';
      switchNetworkBtn.disabled = true;
      
      await sendToBackground({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
      
      currentChainId = chainId;
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

  // Helper: Call a contract method
  const callContractMethod = async (contractAddress, methodName, params) => {
    // First, verify wallet state and account availability
    if (walletLocked) {
      throw new Error('Wallet is locked. Please unlock your wallet first.');
    }
    
    // Make sure we have a valid current account
    if (!currentAccount || !currentAccount.address) {
      // Try to refresh account data if there's none available
      try {
        console.log('No active account detected, attempting to refresh account data');
        await getActiveAccount();
        
        // Check again after refresh
        if (!currentAccount || !currentAccount.address) {
          throw new Error('No active account available. Please check your wallet setup.');
        }
      } catch (accountError) {
        console.error('Error refreshing account data:', accountError);
        throw new Error('Failed to access wallet: No accounts found in wallet');
      }
    }
    
    // Encode function signature and parameters
    const methodSignatures = {
      'name': '0x06fdde03',
      'symbol': '0x95d89b41',
      'decimals': '0x313ce567',
      'balanceOf': '0x70a08231'
    };
    
    if (!methodSignatures[methodName]) {
      throw new Error(`Unsupported contract method: ${methodName}`);
    }
    
    let data = methodSignatures[methodName];
    
    // Add parameters if needed (only handling balanceOf for now)
    if (methodName === 'balanceOf' && params.length > 0) {
      // Pad address to 32 bytes
      const paddedAddress = params[0].substring(2).padStart(64, '0');
      data += paddedAddress;
    }
    
    try {
      // Log what we're doing for debugging
      console.log(`Calling ${methodName} on contract ${contractAddress}`, { data });
      
      // Make the call with better error handling
      const result = await sendToBackground({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data,
          from: currentAccount.address // Explicitly specify the from address
        }, 'latest']
      });
      
      // Log the raw result for debugging
      console.log(`Raw result from ${methodName}:`, result);
      
      // Decode the result based on the method
      switch (methodName) {
        case 'name':
        case 'symbol':
          // Try several methods to decode the result
          console.log(`Decoding ${methodName} from result:`, result);
          
          if (!result || result === '0x' || result.length < 66) {
            console.log(`Empty or invalid result for ${methodName}`);
            return methodName === 'name' ? 'Unknown Token' : 'UNKNOWN';
          }
          
          // Try method 1: Standard dynamic string ABI encoding
          try {
            // The format follows Ethereum ABI encoding for strings
            // First 32 bytes (64 hex chars + '0x') is the offset
            // Next 32 bytes at that offset is the length
            // Then comes the actual string data
            
            // Get the data offset (first 32 bytes)
            const dataOffset = parseInt(result.slice(2, 66), 16);
            console.log(`Offset for ${methodName}: ${dataOffset}`);
            
            if (isNaN(dataOffset) || dataOffset >= result.length / 2) { // Convert to bytes for comparison
              console.warn(`Invalid data offset (${dataOffset}) for ${methodName}`);
              // Try method 2 below instead of immediately returning
            } else {
              // Calculate position in the result where the length is stored
              const lengthPos = 2 + (dataOffset * 2); // 2 for '0x', *2 for hex
              
              if (lengthPos + 64 <= result.length) {
                // Get the string length from the next 32 bytes
                const strLength = parseInt(result.slice(lengthPos, lengthPos + 64), 16);
                console.log(`String length for ${methodName}: ${strLength}`);
                
                if (!isNaN(strLength) && strLength > 0) {
                  // Calculate position of the actual string data
                  const dataPos = lengthPos + 64;
                  
                  if (dataPos + (strLength * 2) <= result.length) {
                    // Extract and decode the string data
                    const hexString = result.slice(dataPos, dataPos + (strLength * 2));
                    const decoded = hexToUtf8String(hexString);
                    console.log(`Decoded ${methodName} (method 1):`, decoded);
                    
                    if (decoded && decoded.length > 0) {
                      return decoded;
                    }
                  }
                }
              }
            }
            
            // If we reach here, method 1 didn't work
            console.log(`Standard ABI decoding failed for ${methodName}, trying alternative method`);
          } catch (error) {
            console.error(`Error in method 1 decoding for ${methodName}:`, error);
          }
          
          // Try method 2: Simple string encoding (some tokens use non-standard encodings)
          try {
            // Some tokens return a simple hex-encoded string without proper ABI encoding
            // Try stripping the 0x prefix and decoding directly
            const rawHex = result.startsWith('0x') ? result.slice(2) : result;
            
            // Remove trailing zeros which might be padding
            const trimmedHex = rawHex.replace(/0+$/, '');
            
            if (trimmedHex.length > 0) {
              const simpleDecoded = hexToUtf8String(trimmedHex);
              console.log(`Decoded ${methodName} (method 2):`, simpleDecoded);
              
              // Check if we got something reasonable
              if (simpleDecoded && simpleDecoded.length > 0 && 
                  // Make sure it looks like a valid token name/symbol
                  /^[a-zA-Z0-9\s\-_\.]+$/.test(simpleDecoded)) {
                return simpleDecoded;
              }
            }
          } catch (error) {
            console.error(`Error in method 2 decoding for ${methodName}:`, error);
          }
          
          // Try method 3: Fixed-length string (some tokens use this format)
          try {
            if (result.length >= 66) {
              // Some tokens store short strings directly in the first 32 bytes
              // Strip any trailing zeros and try to decode
              let fixedHex = result.slice(2, 66);
              fixedHex = fixedHex.replace(/0+$/, '');
              
              if (fixedHex.length > 0 && fixedHex.length % 2 === 0) {
                const fixedDecoded = hexToUtf8String(fixedHex);
                console.log(`Decoded ${methodName} (method 3):`, fixedDecoded);
                
                if (fixedDecoded && fixedDecoded.length > 0 && 
                    // Make sure it looks like a valid token name/symbol
                    /^[a-zA-Z0-9\s\-_\.]+$/.test(fixedDecoded)) {
                  return fixedDecoded;
                }
              }
            }
          } catch (error) {
            console.error(`Error in method 3 decoding for ${methodName}:`, error);
          }
          
          // All methods failed, return default
          console.warn(`All decoding methods failed for ${methodName}`);
          return methodName === 'name' ? 'Unknown Token' : 'UNKNOWN';
        
        case 'decimals':
          try {
            // For decimals (uint8), we expect a 32-byte value
            if (!result || result === '0x' || result.length < 66) {
              console.warn('Invalid result for decimals, using default of 18');
              return 18;
            }
            
            // Parse the hexadecimal value to an integer
            const decimals = parseInt(result, 16);
            return isNaN(decimals) ? 18 : decimals;
          } catch (decodeError) {
            console.error('Error decoding decimals:', decodeError);
            return 18; // Default to 18 if decoding fails
          }
        
        case 'balanceOf':
          try {
            // For balanceOf (uint256), we expect a 32-byte value
            if (!result || result === '0x' || result.length < 66) {
              console.warn('Invalid result for balanceOf, returning 0');
              return '0x0';
            }
            
            // Just return the hex value for conversion later
            return result;
          } catch (decodeError) {
            console.error('Error decoding balance:', decodeError);
            return '0x0'; // Default to 0 if decoding fails
          }
        
        default:
          return result;
      }
    } catch (error) {
      console.error(`Error calling contract method ${methodName}:`, error);
      // Enhance error message for user display
      if (error.message.includes('No accounts found') || error.message.includes('account index')) {
        throw new Error('Failed to access wallet: No accounts found in wallet');
      } else if (error.message.includes('execution reverted')) {
        throw new Error(`Contract error: This may not be a valid ERC-20 token`);
      } else {
        throw error;
      }
    }
  };

  // Helper: Encode ERC20 transfer data
  const encodeERC20TransferData = (to, amount) => {
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

  // Helper: Convert hex to string (improved with UTF-8 support)
  const hexToUtf8String = (hexString) => {
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
  const hexToString = (hex) => {
    return hexToUtf8String(hex);
  };

  // Helper: Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  // Helper: Get explorer URL based on chain
  const getExplorerUrl = async (chainId) => {
    try {
      // Try to get explorer URL from chain object
      const chainInfo = await sendToBackground({
        method: 'wallet_getChainInfo',
        params: [chainId]
      });
      
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

  // Function to open address in block explorer
  const openAddressInExplorer = async () => {
    if (!currentAccount || !currentChainId) return;
    
    try {
      const explorerUrl = await getExplorerUrl(currentChainId);
      const addressUrl = `${explorerUrl}/address/${currentAccount.address}`;
      window.open(addressUrl, '_blank');
    } catch (error) {
      console.error('Error opening address in explorer:', error);
    }
  };

  // Add a new network
  const addNetwork = async () => {
    try {
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
      await sendToBackground({
        method: 'wallet_addEthereumChain',
        params: [addChainParams]
      });
      
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
      currentChainId = chainId;
      networkSelectEl.value = chainId;
      displayChainInfo(chainId);
      
      // Refresh data for the new network
      getEthBalance();
      getTokenBalances();
      updateTokenSelect();
      
    } catch (error) {
      console.error('Error adding network:', error);
      addNetworkStatusEl.textContent = `Error: ${error.message}`;
      addNetworkStatusEl.style.color = '#ea4335';
    } finally {
      addNetworkBtn.disabled = false;
      
      // Hide status after a delay
      setTimeout(() => {
        addNetworkStatusEl.style.display = 'none';
      }, 5000);
    }
  };

  // Remove the selected network
  const removeNetwork = async () => {
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
      await sendToBackground({
        method: 'wallet_removeNetwork',
        params: [chainId]
      });
      
      // Refresh the network list
      await populateNetworkSelect();
      
      // If the current chain was removed, we're now on the default chain
      const newChainId = await sendToBackground({
        method: 'eth_chainId',
        params: []
      });
      
      currentChainId = newChainId;
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

  // Reset wallet - Add this function
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
      walletActionStatusEl.textContent = 'Resetting wallet...';
      walletActionStatusEl.style.color = '#000000';
      walletActionStatusEl.style.display = 'block';
      
      // Call the wallet reset API
      await sendToBackground({
        method: 'wallet_resetWallet',
        params: []
      });
      
      // Clear cached password
      cachedPassword = null;
      
      // Show setup UI, hide main UI
      setupContainerEl.style.display = 'block';
      document.querySelector('main').style.display = 'none';
      
      // Show success message in setup container
      setupStatusEl.textContent = 'Wallet data has been reset. Please set up a new wallet.';
      setupStatusEl.style.color = '#34a853';
      setupStatusEl.style.display = 'block';
      
    } catch (error) {
      console.error('Error resetting wallet:', error);
      walletActionStatusEl.textContent = 'Error: ' + error.message;
      walletActionStatusEl.style.color = '#ea4335';
      walletActionStatusEl.style.display = 'block';
      
      setTimeout(() => {
        walletActionStatusEl.style.display = 'none';
      }, 5000);
    }
  };

  // Event Listeners
  addTokenBtn.addEventListener('click', addToken);
  sendTokenBtn.addEventListener('click', sendToken);
  signMessageBtn.addEventListener('click', signMessage);
  switchNetworkBtn.addEventListener('click', switchNetwork);
  removeNetworkBtn.addEventListener('click', removeNetwork);
  networkSelectEl.addEventListener('change', updateRemoveNetworkButton);
  copyAddressBtn.addEventListener('click', copyAddress);
  accountAddressEl.addEventListener('click', openAddressInExplorer);
  addNetworkBtn.addEventListener('click', addNetwork);
  
  // Account management event listeners
  addAccountBtn.addEventListener('click', addAccountFromSeed);
  exportWalletBtn.addEventListener('click', exportWallet);
  exportPrivateKeyBtn.addEventListener('click', exportPrivateKey);
  importKeyBtn.addEventListener('click', importAccountFromKey);
  
  // Reset wallet event listener
  document.getElementById('reset-wallet').addEventListener('click', resetWallet);
  lockWalletBtn.addEventListener('click', async () => {
    if (walletLocked) {
      try {
        const password = await promptForPassword('Enter your password to unlock the wallet:');
        await unlockWallet(password);
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
      await lockWallet();
      lockWalletBtn.textContent = 'Unlock Wallet';
    }
  });
  
  // Setup event listeners
  createWalletBtn.addEventListener('click', setupCreateWallet);
  restoreWalletBtn.addEventListener('click', setupShowImportUI);
  setupConfirmPhraseBtn.addEventListener('click', setupConfirmPhrase);
  setupImportPhraseBtn.addEventListener('click', setupImportWallet);
  
  // Import wallet file event listener
  document.getElementById('import-wallet-btn').addEventListener('click', () => {
    const fileInput = getWalletFileInput();
    fileInput.click();
  });

  // Initialize
  const initialize = async () => {
    try {
      console.log('Initializing popup...');
      
      // Setup UI elements first to ensure we can show error states
      try {
        await populateNetworkSelect(); // Initialize network dropdown
      } catch (networkError) {
        console.error('Error loading networks:', networkError);
        // Continue with initialization, as this is not critical
      }
      
      try {
        await restoreState(); // Restore the UI state
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
        resetBtn.addEventListener('click', async () => {
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
      
      // Check wallet initialization status
      let isInitialized = false;
      try {
        isInitialized = await checkWalletInitialized();
        console.log('Wallet initialization check result:', isInitialized);
      } catch (initError) {
        console.error('Error checking wallet initialization:', initError);
        showNotification('Error checking wallet state: ' + initError.message, true);
        
        // Show emergency reset button on initialization error
        const resetBtn = document.getElementById('emergency-reset-btn');
        if (resetBtn) {
          resetBtn.style.display = 'inline-block';
        }
      }
      
      if (isInitialized) {
        // Hide setup UI, show main UI
        setupContainerEl.style.display = 'none';
        document.querySelector('main').style.display = 'block';
        
        // Check if wallet is locked
        let isLocked = true;
        let lockCheckError = false;
        try {
          isLocked = await checkWalletLocked();
          console.log('Wallet lock status:', isLocked ? 'locked' : 'unlocked');
        } catch (error) {
          console.error('Error checking wallet lock status during initialization:', error);
          lockCheckError = true;
        }
        
        // Update UI based on lock state
        walletLocked = isLocked;
        
        if (isLocked || lockCheckError) {
          // If there was an error, show emergency reset button
          if (lockCheckError) {
            const resetBtn = document.getElementById('emergency-reset-btn');
            if (resetBtn) {
              resetBtn.style.display = 'inline-block';
            }
          }
          
          // Immediately prompt for password instead of showing locked state first
          try {
            const password = await promptForPassword('Enter your password to unlock the wallet:');
            if (password) {
              cachedPassword = password; // Store the password for future operations
              
              // Unlock the wallet - this will trigger accountsChanged event to dApps
              await unlockWallet(password);
              walletLocked = false;
              lockWalletBtn.textContent = 'Lock Wallet';
              
              // Update UI to show unlocked state
              try {
                // Try to retrieve accounts - do this first so account data is available
                await getAccounts();
                await getActiveAccount();
                await getAccountsList();
                updateAccountUI();
                
                // Now load balances
                getEthBalance();
                getTokenBalances();
              } catch (accountError) {
                console.error('Error retrieving account data after unlock:', accountError);
                showNotification('Error loading accounts after unlock. Try refreshing.', true);
              }
            } else {
              // Only show locked state if user cancels password prompt
              walletStatusEl.textContent = lockCheckError 
                ? 'Error checking wallet status. Try unlocking.'
                : 'Wallet is locked. Please unlock.';
              lockWalletBtn.textContent = 'Unlock Wallet';
            }
          } catch (unlockError) {
            console.error('Error during auto-unlock:', unlockError);
            // Show locked state if there was an error with the password prompt
            walletStatusEl.textContent = lockCheckError 
              ? 'Error checking wallet status. Try unlocking.'
              : 'Wallet is locked. Please unlock.';
            lockWalletBtn.textContent = 'Unlock Wallet';
          }
        } else {
          // Wallet is unlocked, initialize wallet data
          try {
            // Update UI state for unlocked wallet
            walletLocked = false;
            lockWalletBtn.textContent = 'Lock Wallet';
            
            // Try to get wallet data
            await getWallet();
            
            // Try to retrieve accounts and update UI
            try {
              console.log('Wallet unlocked on initialization, refreshing account list');
              await getAccounts();
              await getActiveAccount();
              await getAccountsList();
              updateAccountUI();
              
              // Now load balances
              getEthBalance();
              getTokenBalances();
            } catch (accountError) {
              console.error('Error retrieving account data on startup:', accountError);
              showNotification('Error loading accounts. Try refreshing.', true);
            }
          } catch (walletError) {
            console.error('Error initializing wallet data:', walletError);
            walletStatusEl.textContent = 'Error loading wallet data: ' + walletError.message;
            
            // Show emergency reset button
            const resetBtn = document.getElementById('emergency-reset-btn');
            if (resetBtn) {
              resetBtn.style.display = 'inline-block';
            }
          }
        }
      } else {
        // Show setup UI, hide main UI
        setupContainerEl.style.display = 'block';
        document.querySelector('main').style.display = 'none';
      }
      
      // Initialize the remove button state
      try {
        updateRemoveNetworkButton();
      } catch (btnError) {
        console.error('Error updating remove network button:', btnError);
        // Not critical, continue
      }
      
      console.log('Popup initialization complete');
    } catch (error) {
      console.error('Error during initialization:', error);
      // Show a user-friendly error message
      showNotification('Error initializing wallet: ' + error.message, true);
    }
  };
  
  initialize();
});
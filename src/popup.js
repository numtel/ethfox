// Use chrome as the default and fallback to browser for Firefox
const browserAPI = globalThis.chrome || globalThis.browser;

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
  const exportPkBtn = document.getElementById('export-private-key');
  const privateKeyDisplayEl = document.getElementById('private-key-display');
  const generateNewKeyBtn = document.getElementById('generate-new-key');
  const generateKeyStatusEl = document.getElementById('generate-key-status');
  const importPrivateKeyInput = document.getElementById('import-private-key');
  const importKeyBtn = document.getElementById('import-key-btn');
  const importKeyStatusEl = document.getElementById('import-key-status');
  
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
  let tokens = [];
  let currentChainId = null;

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
      await browserAPI.storage.local.set({ popupState: state });
      console.log('UI state saved:', state);
    } catch (error) {
      console.error('Error saving UI state:', error);
    }
  };
  
  // Restore saved UI state
  const restoreState = async () => {
    try {
      const { popupState } = await browserAPI.storage.local.get('popupState');
      
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
  
  // Function to switch tabs
  const switchToTab = (tabName) => {
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}-tab`);
    
    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
      
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
      browserAPI.runtime.sendMessage(message).then(response => {
        resolve(response);
      }).catch(error => {
        console.error('Runtime error:', error);
        reject(error);
      });
    });
  };

const getWallet = async () => {
    try {
      console.log('Initializing wallet...');
      // Initialize wallet state
      const accounts = await sendToBackground({
        method: 'eth_accounts',
        params: []
      });
      
      console.log('Got accounts:', accounts);
      
      // Handle all possible response formats from Chrome and Firefox
      let hasAccount = false;
      
      if (accounts) {
        if (Array.isArray(accounts) && accounts.length > 0) {
          // Standard array response (Firefox)
          currentAccount = accounts[0];
          hasAccount = true;
        } else if (typeof accounts === 'string') {
          // String response (Chrome)
          currentAccount = accounts;
          hasAccount = true;
        } else if (typeof accounts === 'object' && accounts.address) {
          // Object response with address property
          currentAccount = accounts.address;
          hasAccount = true;
        }
      }
      
      if (hasAccount) {
        walletStatusEl.textContent = 'Wallet connected';
        
        // Make the address element clickable
        accountAddressEl.textContent = formatAddress(currentAccount);
        accountAddressEl.style.cursor = 'pointer';
        accountAddressEl.title = 'View on block explorer';
        
        // Get chain ID
        currentChainId = await sendToBackground({
          method: 'eth_chainId',
          params: []
        });
        
        console.log('Got chain ID:', currentChainId);
        
        displayChainInfo(currentChainId);
        
        // Get balances
        getEthBalance();
        await getStoredTokens();
        getTokenBalances();
        updateTokenSelect();
      } else {
        // No account found, generate one automatically
        walletStatusEl.textContent = 'Creating new wallet...';
        
        try {
          console.log('Generating new key automatically...');
          
          // Request a new key from the wallet provider
          const result = await sendToBackground({
            method: 'wallet_generateNewKey',
            params: []
          });
          
          console.log('Generate key result:', result);
          
          // Handle both object response (Firefox) and string response (Chrome)
          const newAddress = typeof result === 'object' && result.address ? result.address : result;
          
          // Update current account and UI
          currentAccount = newAddress;
          accountAddressEl.textContent = formatAddress(currentAccount);
          walletStatusEl.textContent = 'Wallet connected';
          accountAddressEl.style.cursor = 'pointer';
          accountAddressEl.title = 'View on block explorer';
          
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
          console.error('Error creating new wallet:', error);
          walletStatusEl.textContent = 'Error creating wallet';
        }
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      walletStatusEl.textContent = 'Error initializing wallet';
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
      const { userChains } = await browserAPI.storage.local.get('userChains');
      
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

  // Get ETH balance
  const getEthBalance = async () => {
    if (!currentAccount) return;
    
    try {
      ethBalanceEl.innerHTML = '<div class="loading"></div> Loading...';
      
      const balance = await sendToBackground({
        method: 'eth_getBalance',
        params: [currentAccount, 'latest']
      });
      
      // Convert from wei to ETH
      const ethBalance = parseInt(balance, 16) / 1e18;
      ethBalanceEl.textContent = `${ethBalance.toFixed(6)} ETH`;
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      ethBalanceEl.textContent = 'Error loading ETH balance';
    }
  };

  // Get stored tokens
  const getStoredTokens = async () => {
    try {
      const result = await browserAPI.storage.local.get('tokens');
      tokens = result.tokens || [];
    } catch (error) {
      console.error('Error getting stored tokens:', error);
      tokens = [];
    }
  };

  // Save tokens to storage
  const saveTokens = async () => {
    try {
      await browserAPI.storage.local.set({ tokens });
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  };

  // Add a token
  const addToken = async () => {
    const tokenAddress = tokenAddressInput.value.trim();
    if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
      alert('Please enter a valid ERC-20 token address');
      return;
    }
    
    // Check if token already exists
    if (tokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase())) {
      alert('Token already added');
      return;
    }
    
    try {
      // Get token info
      const tokenName = await callContractMethod(tokenAddress, 'name', []);
      const tokenSymbol = await callContractMethod(tokenAddress, 'symbol', []);
      const tokenDecimals = await callContractMethod(tokenAddress, 'decimals', []);
      
      // Add token to the list
      const newToken = {
        address: tokenAddress,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: parseInt(tokenDecimals),
        chainId: currentChainId
      };
      
      tokens.push(newToken);
      await saveTokens();
      tokenAddressInput.value = '';
      
      // Update balances and select
      getTokenBalances();
      updateTokenSelect();
    } catch (error) {
      console.error('Error adding token:', error);
      alert('Error adding token: ' + error.message);
    }
  };

  // Get token balances
  const getTokenBalances = async () => {
    if (!currentAccount) {
      tokenBalancesEl.textContent = 'No wallet connected';
      return;
    }
    
    const chainTokens = tokens.filter(t => t.chainId === currentChainId);
    
    if (chainTokens.length === 0) {
      tokenBalancesEl.textContent = 'No tokens added for this network';
      return;
    }
    
    tokenBalancesEl.innerHTML = '<div class="loading"></div> Loading tokens...';
    
    try {
      let balancesHtml = '';
      
      for (const token of chainTokens) {
        // Call balanceOf on the token contract
        const balance = await callContractMethod(
          token.address,
          'balanceOf',
          [currentAccount]
        );
        
        // Convert balance based on decimals
        const formattedBalance = (parseInt(balance) / Math.pow(10, token.decimals)).toFixed(6);
        
        balancesHtml += `
          <div class="token-balance">
            <div class="token-symbol">${token.symbol}</div>
            <div>${formattedBalance}</div>
          </div>
        `;
      }
      
      tokenBalancesEl.innerHTML = balancesHtml || 'No tokens found';
    } catch (error) {
      console.error('Error getting token balances:', error);
      tokenBalancesEl.textContent = 'Error loading token balances';
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
        alert('Please enter a valid recipient address');
        return;
      }
      
      // Validate amount with greater precision
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount greater than 0');
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
              from: currentAccount,
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
              from: currentAccount,
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
      alert('Please enter a message to sign');
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
      await navigator.clipboard.writeText(currentAccount);
      const notification = document.getElementById('copied-notification');
      notification.style.display = 'block';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 2000);
    } catch (error) {
      console.error('Error copying address:', error);
    }
  };

  // Export private key (this is for demo purposes)
  const exportPrivateKey = async () => {
    try {
      const { privateKey } = await browserAPI.storage.local.get('privateKey');
      
      if (privateKeyDisplayEl.style.display === 'none') {
        privateKeyDisplayEl.textContent = privateKey;
        privateKeyDisplayEl.style.display = 'block';
        exportPkBtn.textContent = 'Hide Private Key';
      } else {
        privateKeyDisplayEl.style.display = 'none';
        exportPkBtn.textContent = 'Export Private Key';
      }
    } catch (error) {
      console.error('Error exporting private key:', error);
      alert('Error exporting private key');
    }
  };

  // Helper: Call a contract method
  const callContractMethod = async (contractAddress, methodName, params) => {
    // Encode function signature and parameters
    const methodSignatures = {
      'name': '0x06fdde03',
      'symbol': '0x95d89b41',
      'decimals': '0x313ce567',
      'balanceOf': '0x70a08231'
    };
    
    let data = methodSignatures[methodName];
    
    // Add parameters if needed (only handling balanceOf for now)
    if (methodName === 'balanceOf' && params.length > 0) {
      // Pad address to 32 bytes
      const paddedAddress = params[0].substring(2).padStart(64, '0');
      data += paddedAddress;
    }
    
    // Make the call
    const result = await sendToBackground({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data
      }, 'latest']
    });
    
    // Decode the result based on the method
    switch (methodName) {
      case 'name':
      case 'symbol':
        // String decoding - first 32 bytes is the offset, next 32 bytes is length, then the string data
        if (result.length < 128) return '';
        const length = parseInt(result.slice(66, 130), 16);
        if (length === 0) return '';
        return hexToString(result.slice(130, 130 + length * 2));
      
      case 'decimals':
        // uint8 decoding
        return parseInt(result, 16);
      
      case 'balanceOf':
        // uint256 decoding
        return result;
      
      default:
        return result;
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

  // Helper: Convert hex to string
  const hexToString = (hex) => {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      if (code > 0) result += String.fromCharCode(code);
    }
    return result;
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
      const addressUrl = `${explorerUrl}/address/${currentAccount}`;
      window.open(addressUrl, '_blank');
    } catch (error) {
      console.error('Error opening address in explorer:', error);
    }
  };

  // Function to generate a new private key
  const generateNewKey = async () => {
    try {
      generateKeyStatusEl.textContent = 'Generating...';
      generateKeyStatusEl.style.display = 'block';
      generateNewKeyBtn.disabled = true;
      
      // Request a new key from the wallet provider
      const result = await sendToBackground({
        method: 'wallet_generateNewKey',
        params: []
      });
      
      console.log('Generate key result:', result);
      
      // Handle both object response (Firefox) and string response (Chrome)
      const newAddress = typeof result === 'object' && result.address ? result.address : result;
      
      // Show success message with new address
      generateKeyStatusEl.innerHTML = `Success! New address: <strong>${formatAddress(newAddress)}</strong>`;
      generateKeyStatusEl.style.color = '#34a853';
      
      // Update current account and UI
      currentAccount = newAddress;
      accountAddressEl.textContent = formatAddress(currentAccount);
      walletStatusEl.textContent = 'Wallet connected';
      
      // Reset balances
      getEthBalance();
      getTokenBalances();
      
    } catch (error) {
      console.error('Error generating new key:', error);
      generateKeyStatusEl.textContent = `Error: ${error.message}`;
      generateKeyStatusEl.style.color = '#ea4335';
    } finally {
      generateNewKeyBtn.disabled = false;
      // Hide status after a delay
      setTimeout(() => {
        generateKeyStatusEl.style.display = 'none';
      }, 5000);
    }
  };
  
  // Function to import a private key
  const importPrivateKey = async () => {
    try {
      const privateKey = importPrivateKeyInput.value.trim();
      
      if (!privateKey) {
        alert('Please enter a private key');
        return;
      }
      
      importKeyStatusEl.textContent = 'Importing...';
      importKeyStatusEl.style.display = 'block';
      importKeyBtn.disabled = true;
      
      // Request to import the key
      const result = await sendToBackground({
        method: 'wallet_importPrivateKey',
        params: [privateKey]
      });
      
      console.log('Import key result:', result);
      
      // Handle both object response and string response
      const newAddress = typeof result === 'object' && result.address ? result.address : result;
      
      // Show success message
      importKeyStatusEl.innerHTML = `Success! Imported address: <strong>${formatAddress(newAddress)}</strong>`;
      importKeyStatusEl.style.color = '#34a853';
      
      // Update current account and UI
      currentAccount = newAddress;
      accountAddressEl.textContent = formatAddress(currentAccount);
      walletStatusEl.textContent = 'Wallet connected';
      
      // Clear input
      importPrivateKeyInput.value = '';
      
      // Reset balances
      getEthBalance();
      getTokenBalances();
      
    } catch (error) {
      console.error('Error importing private key:', error);
      importKeyStatusEl.textContent = `Error: ${error.message}`;
      importKeyStatusEl.style.color = '#ea4335';
    } finally {
      importKeyBtn.disabled = false;
      // Hide status after a delay
      setTimeout(() => {
        importKeyStatusEl.style.display = 'none';
      }, 5000);
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
      if (!confirm(`Are you sure you want to remove the network "${networkSelectEl.options[networkSelectEl.selectedIndex].text}"?`)) {
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

  // Event Listeners
  addTokenBtn.addEventListener('click', addToken);
  sendTokenBtn.addEventListener('click', sendToken);
  signMessageBtn.addEventListener('click', signMessage);
  switchNetworkBtn.addEventListener('click', switchNetwork);
  removeNetworkBtn.addEventListener('click', removeNetwork);
  networkSelectEl.addEventListener('change', updateRemoveNetworkButton);
  copyAddressBtn.addEventListener('click', copyAddress);
  exportPkBtn.addEventListener('click', exportPrivateKey);
  generateNewKeyBtn.addEventListener('click', generateNewKey);
  importKeyBtn.addEventListener('click', importPrivateKey);
  accountAddressEl.addEventListener('click', openAddressInExplorer);
  addNetworkBtn.addEventListener('click', addNetwork);

  // Initialize
  const initialize = async () => {
    await populateNetworkSelect(); // Initialize network dropdown
    await restoreState(); // Restore the UI state
    await getWallet();   // Initialize wallet connection
    
    // Initialize the remove button state
    updateRemoveNetworkButton();
  };
  
  initialize();
});
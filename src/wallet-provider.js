import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains';

// Use chrome as the default and fallback to browser for Firefox
const browserAPI = globalThis.chrome || globalThis.browser;

// Available chains - will be extended with user-added chains
const chains = {
  '0x1': mainnet,
  '0xaa36a7': sepolia // Sepolia chainId
};

// Get all chains from storage
async function getSavedChains() {
  try {
    const { userChains } = await browserAPI.storage.local.get('userChains');
    return userChains || {};
  } catch (error) {
    console.error('Error getting user chains:', error);
    return {};
  }
}

// Load all chains (built-in + user-added)
async function loadAllChains() {
  const userChains = await getSavedChains();
  return { ...chains, ...userChains };
}

// Default to Sepolia for testing
const DEFAULT_CHAIN_ID = '0xaa36a7';

// Get the current chain from storage or use default
async function getCurrentChain() {
  try {
    const { chainId } = await browserAPI.storage.local.get('chainId');
    const allChains = await loadAllChains();
    return allChains[chainId || DEFAULT_CHAIN_ID] || sepolia;
  } catch (error) {
    console.error('Error getting chain:', error);
    return sepolia;
  }
}

// Set the current chain
async function setCurrentChain(chainId) {
  const allChains = await loadAllChains();
  if (allChains[chainId]) {
    await browserAPI.storage.local.set({ chainId });
    return allChains[chainId];
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Generate a secure random private key
function generatePrivateKey() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Set a private key
async function setPrivateKey(privateKey) {
  try {
    // Validate the private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Ensure it's the correct length
    if (privateKey.length !== 66) { // 0x + 64 hex chars
      throw new Error('Invalid private key length');
    }
    
    // Check that it's a valid hex string
    if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) {
      throw new Error('Invalid private key format');
    }
    
    // Store the private key
    await browserAPI.storage.local.set({ privateKey });
    return privateKeyToAccount(privateKey);
  } catch (error) {
    console.error('Error setting private key:', error);
    throw error;
  }
}

// Get or create a private key from browser storage
async function getOrCreateAccount() {
  try {
    const { privateKey } = await browserAPI.storage.local.get('privateKey');
    if (privateKey) {
      return privateKeyToAccount(privateKey);
    } else {
      // Generate and save a new private key
      const privateKey = generatePrivateKey();
      await browserAPI.storage.local.set({ privateKey });
      return privateKeyToAccount(privateKey);
    }
  } catch (error) {
    console.error('Error accessing wallet:', error);
    throw new Error('Failed to access wallet');
  }
}

// Get a public client for the current chain
async function getPublicClient() {
  const chain = await getCurrentChain();
  return createPublicClient({
    chain,
    transport: http()
  });
}

// Create wallet client with the account for the current chain
async function getWalletClient() {
  const account = await getOrCreateAccount();
  const chain = await getCurrentChain();
  
  return createWalletClient({
    account,
    chain,
    transport: http()
  });
}

// Handle wallet requests
async function handleRequest(method, params) {
  try {
    // Initialize clients
    const walletClient = await getWalletClient();
    const publicClient = await getPublicClient();
    const account = walletClient.account;
    
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        // Always return just the address string for better cross-browser compatibility
        // This way, both Firefox and Chrome will have a consistent result
        return account.address;

      case 'eth_chainId':
        const chainId = await walletClient.getChainId();
        return `0x${chainId.toString(16)}`;
        
      case 'wallet_getChainInfo':
        // Return chain information including block explorer URL
        const requestedChainId = params[0];
        const allChains = await loadAllChains();
        const chain = allChains[requestedChainId];
        if (chain) {
          return {
            chainId: requestedChainId,
            name: chain.name,
            blockExplorers: chain.blockExplorers
          };
        }
        throw new Error(`Chain ${requestedChainId} not supported`);

      case 'eth_sendTransaction':
        // Add special handling for eth_sendTransaction with debugging
        const originalTxParams = params[0];
        const requestId = params[1]; // Optional request ID for identifying approval responses
        
        // Clone the transaction params to avoid modifying the original
        const txParams = { ...originalTxParams };
        
        // Debug transaction parameters - convert BigInt values to strings first
        console.log('Original transaction parameters:', safeStringify(txParams));
        
        try {
          // Get current chain info for displaying network context
          const currentChain = await getCurrentChain();
          
          // Prepare transaction data for approval UI
          let formattedValue = '0';
          let valueInEth = '0';
          
          // Format value if it exists
          if (txParams.value) {
            console.log('Transaction value:', txParams.value);
            console.log('Transaction value type:', typeof txParams.value);
            
            const valueBigInt = BigInt(txParams.value);
            formattedValue = valueBigInt.toString();
            valueInEth = (Number(valueBigInt) / 1e18).toFixed(6); // Convert to ETH for display
            
            // Update txParams with BigInt value for actual sending
            txParams.value = valueBigInt;
          }
          
          // Get gas parameters if not provided
          const publicClient = await getPublicClient();
          
          // 1. GAS ESTIMATION: Only estimate if not provided by caller
          let estimatedGas;
          if (!txParams.gas) {
            try {
              console.log('Estimating gas for transaction...');
              estimatedGas = await publicClient.estimateGas({
                to: txParams.to,
                from: txParams.from,
                value: txParams.value || undefined,
                data: txParams.data || '0x',
                nonce: txParams.nonce ? BigInt(txParams.nonce) : undefined
              });
              
              console.log('Estimated gas:', estimatedGas);
              
              // Add buffer to estimated gas (20% more) to be safe
              const gasWithBuffer = estimatedGas * 120n / 100n;
              txParams.gas = `0x${gasWithBuffer.toString(16)}`;
              console.log('Gas with buffer:', txParams.gas);
            } catch (error) {
              console.error('Gas estimation failed:', error);
              // If estimation fails, use a default gas limit that's reasonable for simple transfers
              if (!txParams.data || txParams.data === '0x') {
                // Simple ETH transfer - use standard 21000 gas
                txParams.gas = '0x5208'; // 21000 in hex
              } else {
                // Contract interaction - use higher default but still reasonable
                txParams.gas = '0x186A0'; // 100,000 in hex
              }
              console.log('Using default gas limit:', txParams.gas);
            }
          }
          
          // 2. GAS PRICE/FEE DATA: If not provided, get from network
          if (!txParams.maxFeePerGas && !txParams.maxPriorityFeePerGas && !txParams.gasPrice) {
            try {
              console.log('Getting fee data from network...');
              const feeData = await publicClient.estimateFeesPerGas();
              console.log('Fee data:', feeData);
              
              // Check if the network supports EIP-1559
              if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                // For EIP-1559 networks
                txParams.maxFeePerGas = `0x${feeData.maxFeePerGas.toString(16)}`;
                txParams.maxPriorityFeePerGas = `0x${feeData.maxPriorityFeePerGas.toString(16)}`;
              } else if (feeData.gasPrice) {
                // For legacy networks
                txParams.gasPrice = `0x${feeData.gasPrice.toString(16)}`;
              }
            } catch (error) {
              console.error('Fee data estimation failed:', error);
              // If fee estimation fails, try to get gas price as fallback
              try {
                const gasPrice = await publicClient.getGasPrice();
                txParams.gasPrice = `0x${gasPrice.toString(16)}`;
                console.log('Using network gas price:', txParams.gasPrice);
              } catch (gasError) {
                console.error('Gas price fetch failed:', gasError);
                // Last resort - use a reasonable default gas price
                txParams.gasPrice = '0x' + (5000000000n).toString(16); // 5 Gwei
                console.log('Using default gas price:', txParams.gasPrice);
              }
            }
          }
          
          // 3. Get and set nonce if not provided
          if (!txParams.nonce) {
            try {
              console.log('Getting nonce for address:', txParams.from);
              const nonce = await publicClient.getTransactionCount({
                address: txParams.from
              });
              txParams.nonce = `0x${nonce.toString(16)}`;
              console.log('Using nonce:', txParams.nonce);
            } catch (error) {
              console.error('Error getting nonce:', error);
              // Nonce is important, but we'll let the node handle it if we can't get it
            }
          }
          
          // Convert any BigInt values to strings for safe serialization
          const safeTxParams = convertBigIntToString(txParams);
          
          // Log the fully prepared transaction parameters
          console.log('Prepared transaction parameters:', safeStringify(safeTxParams));
          
          // Create transaction approval request with estimated gas
          const approvalRequest = {
            id: requestId || `tx-${Date.now()}`,
            type: 'transaction',
            chainId: currentChain.id.toString(16).startsWith('0x') ? 
                    currentChain.id.toString(16) : 
                    `0x${currentChain.id.toString(16)}`,
            txParams: {
              ...safeTxParams,
              value: formattedValue, // Use string representation for approval UI
              gas: safeTxParams.gas || '0x0',
              gasPrice: safeTxParams.gasPrice || undefined,
              maxFeePerGas: safeTxParams.maxFeePerGas || undefined,
              maxPriorityFeePerGas: safeTxParams.maxPriorityFeePerGas || undefined
            },
            metadata: {
              networkName: currentChain.name,
              valueInEth,
              estimatedGasHex: txParams.gas || '0x0',
              estimatedGasDec: txParams.gas ? parseInt(txParams.gas, 16).toString() : '0',
              timestamp: Date.now()
            }
          };
          
          // Store the approval request
          await storeApprovalRequest(approvalRequest);
          
          // Wait for user approval
          const approvalResult = await waitForApproval(approvalRequest.id);
          
          if (!approvalResult.approved) {
            throw new Error('Transaction rejected by user');
          }
          
          // Send the transaction once approved
          console.log('Sending transaction with parameters:', safeStringify(txParams));
          
          // Prepare final transaction parameters for sending
          // viem expects specific types for certain fields
          const finalTxParams = {
            to: txParams.to,
            from: txParams.from,
            data: txParams.data || undefined,
            nonce: txParams.nonce ? parseInt(txParams.nonce, 16) : undefined,
          };
          
          // Handle value (BigInt)
          if (txParams.value) {
            finalTxParams.value = typeof txParams.value === 'bigint' 
              ? txParams.value 
              : BigInt(txParams.value);
          }
          
          // Handle gas (BigInt)
          if (txParams.gas) {
            finalTxParams.gas = typeof txParams.gas === 'bigint'
              ? txParams.gas
              : BigInt(parseInt(txParams.gas, 16));
          }
          
          // Handle fee data (EIP-1559 or legacy)
          if (txParams.maxFeePerGas && txParams.maxPriorityFeePerGas) {
            finalTxParams.maxFeePerGas = typeof txParams.maxFeePerGas === 'bigint'
              ? txParams.maxFeePerGas
              : BigInt(parseInt(txParams.maxFeePerGas, 16));
              
            finalTxParams.maxPriorityFeePerGas = typeof txParams.maxPriorityFeePerGas === 'bigint'
              ? txParams.maxPriorityFeePerGas
              : BigInt(parseInt(txParams.maxPriorityFeePerGas, 16));
          } else if (txParams.gasPrice) {
            finalTxParams.gasPrice = typeof txParams.gasPrice === 'bigint'
              ? txParams.gasPrice
              : BigInt(parseInt(txParams.gasPrice, 16));
          }
          
          console.log('Final transaction parameters:', safeStringify(finalTxParams));
          const txHash = await walletClient.sendTransaction(finalTxParams);
          
          // Clean up the approval request
          await removeApprovalRequest(approvalRequest.id);
          console.log('Transaction sent successfully:', txHash);
          
          return txHash;
        } catch (error) {
          console.error('Transaction failed:', error);
          // Clean up the approval request if it exists
          if (requestId) {
            await removeApprovalRequest(requestId);
          }
          // Format error for better debugging
          throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
        }

      case 'personal_sign':
        try {
          // Get the message and address from params
          const messageHex = params[0];
          const requestId = params[1]; // Optional request ID for identifying approval responses
          const skipApproval = params[2]; // Optional flag to skip approval (for popup-initiated signing)
          
          // For hexadecimal messages, try to decode them to UTF-8 for display
          let messageText = '';
          try {
            // Skip the '0x' prefix when decoding
            const hexString = messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex;
            const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            messageText = new TextDecoder().decode(bytes);
          } catch (e) {
            console.warn('Could not decode message as UTF-8:', e);
            messageText = messageHex; // Fall back to showing the hex
          }
          
          // If skipApproval is not true, go through the normal approval flow
          if (!skipApproval) {
            // Create and store an approval request
            const approvalRequest = {
              id: requestId || `msg-${Date.now()}`,
              type: 'message',
              message: messageHex,
              messageText,
              account: account.address,
              metadata: {
                timestamp: Date.now()
              }
            };
            
            // Request user approval
            await storeApprovalRequest(approvalRequest);
            
            // Wait for user approval
            const approvalResult = await waitForApproval(approvalRequest.id);
            
            if (!approvalResult.approved) {
              throw new Error('Message signing rejected by user');
            }
            
            // Clean up the approval request after approval
            await removeApprovalRequest(approvalRequest.id);
          }
          
          // Now get the private key and sign locally (doesn't use RPC)
          const { privateKey } = await browserAPI.storage.local.get('privateKey');
          if (!privateKey) {
            throw new Error('Private key not found');
          }
          
          // Create a local account from the private key
          const signingAccount = privateKeyToAccount(privateKey);
          
          // Sign the message locally
          const signature = await signingAccount.signMessage({
            message: messageHex
          });
          
          return signature;
        } catch (error) {
          console.error('Error signing message:', error);
          throw new Error(`Message signing failed: ${error.message}`);
        }
        
      case 'eth_signTypedData':
      case 'eth_signTypedData_v4':
        try {
          // Get the typed data parameters
          const address = params[0];
          const typedData = params[1];
          let parsedData;
          
          try {
            // Handle case where data might be a string
            if (typeof typedData === 'string') {
              parsedData = JSON.parse(typedData);
            } else {
              parsedData = typedData;
            }
          } catch (parseError) {
            console.error('Error parsing typed data:', parseError);
            throw new Error('Invalid typed data format');
          }
          
          // Validate that the signer matches our account
          if (address.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('Signer address does not match active account');
          }
          
          const requestId = params[2]; // Optional request ID
          const skipApproval = params[3]; // Optional flag to skip approval
          
          // Format the data for display in the approval UI
          const formattedData = formatTypedDataForDisplay(parsedData);
          
          // If skipApproval is not true, go through the normal approval flow
          if (!skipApproval) {
            // Create and store an approval request
            const approvalRequest = {
              id: requestId || `typed-${Date.now()}`,
              type: 'typedData',
              address,
              typedData: parsedData,
              formattedData,
              account: account.address,
              metadata: {
                timestamp: Date.now(),
                method: method // Store which version of the method was called
              }
            };
            
            // Request user approval
            await storeApprovalRequest(approvalRequest);
            
            // Wait for user approval
            const approvalResult = await waitForApproval(approvalRequest.id);
            
            if (!approvalResult.approved) {
              throw new Error('Signature request rejected by user');
            }
            
            // Clean up the approval request after approval
            await removeApprovalRequest(approvalRequest.id);
          }
          
          // Get the private key for signing
          const { privateKey } = await browserAPI.storage.local.get('privateKey');
          if (!privateKey) {
            throw new Error('Private key not found');
          }
          
          // Create a local account from the private key
          const signingAccount = privateKeyToAccount(privateKey);
          
          // Sign the typed data using viem's signTypedData
          const signature = await signingAccount.signTypedData(parsedData);
          
          return signature;
        } catch (error) {
          console.error('Error signing typed data:', error);
          throw new Error(`Typed data signing failed: ${error.message}`);
        }
        
      case 'wallet_switchEthereumChain':
        const newChainId = params[0].chainId;
        await setCurrentChain(newChainId);
        
        // Emit chain changed event to all content scripts
        await emitEvent('chainChanged', newChainId);
        
        return null;
        
      case 'wallet_addEthereumChain':
        const chainData = params[0];
        const addChainId = chainData.chainId;
        
        // Check if chain already exists in our predefined chains
        const existingChains = await loadAllChains();
        if (existingChains[addChainId]) {
          // If chain already exists, just switch to it
          await setCurrentChain(addChainId);
          return null;
        }
        
        // Validate required chain parameters
        if (!chainData.chainId || !chainData.chainName || !chainData.rpcUrls || chainData.rpcUrls.length === 0) {
          throw new Error('Invalid chain configuration: missing required parameters');
        }
        
        // Create a viem-compatible chain object
        const newChain = {
          id: parseInt(addChainId, 16),
          name: chainData.chainName,
          network: chainData.chainName.toLowerCase().replace(/\s+/g, '-'),
          nativeCurrency: chainData.nativeCurrency || {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: {
            default: { http: chainData.rpcUrls },
            public: { http: chainData.rpcUrls }
          }
        };
        
        // Add block explorer if provided
        if (chainData.blockExplorerUrls && chainData.blockExplorerUrls.length > 0) {
          newChain.blockExplorers = {
            default: {
              name: chainData.chainName + ' Explorer',
              url: chainData.blockExplorerUrls[0]
            }
          };
        }
        
        // Save the new chain to storage
        const { userChains } = await browserAPI.storage.local.get('userChains');
        const updatedUserChains = { ...(userChains || {}) };
        updatedUserChains[addChainId] = newChain;
        await browserAPI.storage.local.set({ userChains: updatedUserChains });
        
        // Switch to the new chain and emit event
        await setCurrentChain(addChainId);
        
        // Emit chain changed event to all content scripts
        await emitEvent('chainChanged', addChainId);
        
        return null;
        
      case 'wallet_importPrivateKey':
        // Import a private key
        try {
          const key = params[0];
          await setPrivateKey(key);
          // Return the new address
          const newAccount = await getOrCreateAccount();
          
          // Just return the address string for better Chrome compatibility
          return newAccount.address;
        } catch (error) {
          console.error('Failed to import private key:', error);
          throw new Error(`Failed to import private key: ${error.message}`);
        }
        
      case 'wallet_generateNewKey':
        // Generate a new private key
        try {
          const newKey = generatePrivateKey();
          await setPrivateKey(newKey);
          // Return the new address
          const newAccount = await getOrCreateAccount();
          
          // In Chrome, complex return objects might not be properly serialized
          // so we'll just return the address as a string to ensure compatibility
          return newAccount.address;
        } catch (error) {
          console.error('Failed to generate new key:', error);
          throw new Error(`Failed to generate new key: ${error.message}`);
        }

      default:
        return publicClient.request({ method, params });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    throw error;
  }
}

// Transaction approval handling

// Store a new approval request in browser storage
async function storeApprovalRequest(request) {
  try {
    // Get existing pending requests
    const { pendingApprovals } = await browserAPI.storage.local.get('pendingApprovals');
    const approvals = pendingApprovals || {};
    
    // Add the new request
    approvals[request.id] = request;
    
    // Save back to storage
    await browserAPI.storage.local.set({ pendingApprovals: approvals });
    
    // Create a popup to request user approval
    try {
      // Check if we're on Firefox for Android (browserAPI.windows is undefined)
      if (typeof browserAPI.windows === 'undefined') {
        // For Firefox Android, open as a tab instead
        await browserAPI.tabs.create({
          url: `/approval.html?id=${request.id}`
        });
      } else {
        // For desktop Firefox, open as a popup window
        await browserAPI.windows.create({
          url: `/approval.html?id=${request.id}`,
          type: 'popup',
          width: 400,
          height: 600,
          focused: true
        });
      }
    } catch (windowError) {
      console.error('Error creating approval window/tab:', windowError);
      // Fallback to opening as a tab if window creation fails
      await browserAPI.tabs.create({
        url: `/approval.html?id=${request.id}`
      });
    }
    
    console.log('Approval request stored and popup/tab created:', request.id);
  } catch (error) {
    console.error('Error storing approval request:', error);
    throw error;
  }
}

// Wait for a specific approval request to be completed
async function waitForApproval(requestId) {
  return new Promise((resolve) => {
    const checkApproval = async () => {
      try {
        const { approvalResults } = await browserAPI.storage.local.get('approvalResults');
        
        if (approvalResults && approvalResults[requestId]) {
          // We have a result
          const result = approvalResults[requestId];
          
          // Clean up the result
          const updatedResults = { ...approvalResults };
          delete updatedResults[requestId];
          await browserAPI.storage.local.set({ approvalResults: updatedResults });
          
          resolve(result);
          return;
        }
        
        // Check again after a short delay
        setTimeout(checkApproval, 500);
      } catch (error) {
        console.error('Error checking approval status:', error);
        // Resolve with rejection in case of error
        resolve({ approved: false, error: error.message });
      }
    };
    
    // Start checking
    checkApproval();
  });
}

// Remove a pending approval request
async function removeApprovalRequest(requestId) {
  try {
    const { pendingApprovals } = await browserAPI.storage.local.get('pendingApprovals');
    
    if (pendingApprovals && pendingApprovals[requestId]) {
      const updatedApprovals = { ...pendingApprovals };
      delete updatedApprovals[requestId];
      await browserAPI.storage.local.set({ pendingApprovals: updatedApprovals });
    }
  } catch (error) {
    console.error('Error removing approval request:', error);
  }
}

// Get all pending approval requests
async function getPendingApprovals() {
  try {
    const { pendingApprovals } = await browserAPI.storage.local.get('pendingApprovals');
    return pendingApprovals || {};
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return {};
  }
}

// Approve or reject a transaction request
async function resolveApproval(requestId, approved) {
  try {
    // Get the pending request
    const { pendingApprovals } = await browserAPI.storage.local.get('pendingApprovals');
    
    if (!pendingApprovals || !pendingApprovals[requestId]) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    // Store the result
    const { approvalResults } = await browserAPI.storage.local.get('approvalResults');
    const results = approvalResults || {};
    
    results[requestId] = { 
      approved, 
      timestamp: Date.now() 
    };
    
    await browserAPI.storage.local.set({ approvalResults: results });
    
    // Clean up the pending request
    const updatedApprovals = { ...pendingApprovals };
    delete updatedApprovals[requestId];
    await browserAPI.storage.local.set({ pendingApprovals: updatedApprovals });
    
    return true;
  } catch (error) {
    console.error('Error resolving approval:', error);
    throw error;
  }
}

// Helper function to convert BigInt values to strings for JSON serialization
function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntToString(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

// Safely stringify objects with BigInt values
function safeStringify(obj, replacer = null, space = 2) {
  return JSON.stringify(convertBigIntToString(obj), replacer, space);
}

// Helper function to format typed data for display in the approval UI
function formatTypedDataForDisplay(typedData) {
  // Deep copy to avoid modifying the original
  const formattedData = JSON.parse(JSON.stringify(typedData));
  
  try {
    // Extract primary details for easier display
    const primaryType = formattedData.primaryType;
    const domain = formattedData.domain;
    
    // Format domain into a readable summary
    let domainSummary = '';
    if (domain.name) domainSummary += `Name: ${domain.name}\n`;
    if (domain.version) domainSummary += `Version: ${domain.version}\n`;
    if (domain.chainId) domainSummary += `Chain ID: ${domain.chainId}\n`;
    if (domain.verifyingContract) domainSummary += `Contract: ${domain.verifyingContract}\n`;
    
    // Format the message data based on primary type
    const messageData = formattedData.message;
    const primaryTypeData = [];
    
    // Format permit-specific data in a readable way if it's a permit
    if (primaryType === 'Permit') {
      if (messageData.owner) primaryTypeData.push(`Owner: ${messageData.owner}`);
      if (messageData.spender) primaryTypeData.push(`Spender: ${messageData.spender}`);
      if (messageData.value) primaryTypeData.push(`Value: ${messageData.value}`);
      if (messageData.nonce) primaryTypeData.push(`Nonce: ${messageData.nonce}`);
      if (messageData.deadline) {
        const deadline = Number(messageData.deadline);
        const date = new Date(deadline * 1000); // Convert from unix timestamp
        primaryTypeData.push(`Deadline: ${date.toLocaleString()} (${messageData.deadline})`);
      }
    } else {
      // For non-permit types, format all fields
      for (const key in messageData) {
        let value = messageData[key];
        // Format arrays or objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        primaryTypeData.push(`${key}: ${value}`);
      }
    }
    
    return {
      domainName: domain.name || 'Unknown Domain',
      domainSummary,
      primaryType,
      messageData: primaryTypeData.join('\n'),
      fullData: safeStringify(typedData, null, 2)
    };
  } catch (error) {
    console.error('Error formatting typed data:', error);
    // Return a simpler format if there's an error
    return {
      domainName: 'Error formatting data',
      domainSummary: '',
      primaryType: typedData.primaryType || 'Unknown',
      messageData: 'Error parsing message data',
      fullData: safeStringify(typedData, null, 2)
    };
  }
}

// Create a utility to emit events to all tabs
async function emitEvent(eventName, data) {
  try {
    const tabs = await browserAPI.tabs.query({});
    // Convert any BigInt values to strings before sending
    const safeData = convertBigIntToString(data);
    
    for (const tab of tabs) {
      browserAPI.tabs.sendMessage(tab.id, {
        event: eventName,
        data: safeData
      }).catch(() => {
        // Ignore errors for tabs that don't have our content script
      });
    }
  } catch (error) {
    console.error(`Error emitting ${eventName} event:`, error);
  }
}

// Remove a network
async function removeNetwork(chainId) {
  try {
    // Can't remove builtin networks
    if (chains[chainId]) {
      throw new Error(`Cannot remove built-in network with chain ID ${chainId}`);
    }
    
    // Get current user chains
    const { userChains } = await browserAPI.storage.local.get('userChains');
    if (!userChains || !userChains[chainId]) {
      throw new Error(`Network with chain ID ${chainId} not found`);
    }
    
    // Get current chain
    const { chainId: currentChainId } = await browserAPI.storage.local.get('chainId');
    
    // Switch to default if removing the active chain
    if (currentChainId === chainId) {
      await browserAPI.storage.local.set({ chainId: DEFAULT_CHAIN_ID });
      await emitEvent('chainChanged', DEFAULT_CHAIN_ID);
    }
    
    // Remove the chain
    const updatedUserChains = { ...userChains };
    delete updatedUserChains[chainId];
    await browserAPI.storage.local.set({ userChains: updatedUserChains });
    
    return true;
  } catch (error) {
    console.error('Error removing network:', error);
    throw error;
  }
}

export default { 
  handleRequest, 
  emitEvent, 
  removeNetwork,
  getPendingApprovals,
  resolveApproval,
  convertBigIntToString,
  safeStringify
};


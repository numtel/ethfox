/**
 * Transaction and message approval functionality
 */

import { formatTypedDataForDisplay } from '../utils/formatting.js';

/**
 * Store a new approval request in browser storage
 * @param {object} request - The approval request
 * @returns {Promise<void>}
 */
export async function storeApprovalRequest(request) {
  try {
    // Get existing pending requests
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    const approvals = pendingApprovals || {};
    
    // Add the new request
    approvals[request.id] = request;
    
    // Save back to storage
    await browser.storage.local.set({ pendingApprovals: approvals });
    
    // Create a popup to request user approval
    try {
      // Check if we're on Firefox for Android (browser.windows is undefined)
      if (typeof browser.windows === 'undefined') {
        // For Firefox Android, open as a tab instead
        await browser.tabs.create({
          url: `/approval.html?id=${request.id}`
        });
      } else {
        // For desktop Firefox, open as a popup window
        await browser.windows.create({
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
      await browser.tabs.create({
        url: `/approval.html?id=${request.id}`
      });
    }
    
    console.log('Approval request stored and popup/tab created:', request.id);
  } catch (error) {
    console.error('Error storing approval request:', error);
    throw error;
  }
}

/**
 * Wait for a specific approval request to be completed
 * @param {string} requestId - The ID of the approval request
 * @returns {Promise<object>} The approval result
 */
export async function waitForApproval(requestId) {
  return new Promise((resolve) => {
    const checkApproval = async () => {
      try {
        const { approvalResults } = await browser.storage.local.get('approvalResults');
        
        if (approvalResults && approvalResults[requestId]) {
          // We have a result
          const result = approvalResults[requestId];
          
          // Clean up the result
          const updatedResults = { ...approvalResults };
          delete updatedResults[requestId];
          await browser.storage.local.set({ approvalResults: updatedResults });
          
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

/**
 * Remove a pending approval request
 * @param {string} requestId - The ID of the approval request
 * @returns {Promise<void>}
 */
export async function removeApprovalRequest(requestId) {
  try {
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    
    if (pendingApprovals && pendingApprovals[requestId]) {
      const updatedApprovals = { ...pendingApprovals };
      delete updatedApprovals[requestId];
      await browser.storage.local.set({ pendingApprovals: updatedApprovals });
    }
  } catch (error) {
    console.error('Error removing approval request:', error);
  }
}

/**
 * Get all pending approval requests
 * @returns {Promise<object>} Object with all pending approval requests
 */
export async function getPendingApprovals() {
  try {
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    return pendingApprovals || {};
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return {};
  }
}

/**
 * Approve or reject a transaction request
 * @param {string} requestId - The ID of the approval request
 * @param {boolean} approved - Whether the request was approved
 * @returns {Promise<boolean>} True if successful
 */
export async function resolveApproval(requestId, approved) {
  try {
    // Get the pending request
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    
    if (!pendingApprovals || !pendingApprovals[requestId]) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    // Store the result
    const { approvalResults } = await browser.storage.local.get('approvalResults');
    const results = approvalResults || {};
    
    results[requestId] = { 
      approved, 
      timestamp: Date.now() 
    };
    
    await browser.storage.local.set({ approvalResults: results });
    
    // Clean up the pending request
    const updatedApprovals = { ...pendingApprovals };
    delete updatedApprovals[requestId];
    await browser.storage.local.set({ pendingApprovals: updatedApprovals });
    
    return true;
  } catch (error) {
    console.error('Error resolving approval:', error);
    throw error;
  }
}

/**
 * Create a transaction approval request
 * @param {object} txParams - Transaction parameters
 * @param {string} chainId - The current chain ID
 * @param {string} requestId - Optional request ID
 * @returns {Promise<object>} The created approval request
 */
export async function createTransactionApprovalRequest(txParams, chainId, networkName, requestId = null) {
  // Format value for display  
  let formattedValue = '0';
  let valueInEth = '0';
  
  // Format value if it exists
  if (txParams.value) {
    const valueBigInt = BigInt(txParams.value);
    formattedValue = valueBigInt.toString();
    valueInEth = (Number(valueBigInt) / 1e18).toFixed(6); // Convert to ETH for display
  }
  
  // Create approval request
  const approvalRequest = {
    id: requestId || `tx-${Date.now()}`,
    type: 'transaction',
    chainId: chainId.startsWith('0x') ? chainId : `0x${chainId.toString(16)}`,
    txParams: {
      ...txParams,
      value: formattedValue // Use string representation for approval UI
    },
    metadata: {
      networkName,
      valueInEth,
      estimatedGasHex: txParams.gas || '0x0',
      estimatedGasDec: txParams.gas ? parseInt(txParams.gas, 16).toString() : '0',
      timestamp: Date.now()
    }
  };
  
  // Store the approval request
  await storeApprovalRequest(approvalRequest);
  
  return approvalRequest;
}

/**
 * Create a message signing approval request
 * @param {string} messageHex - The message to sign in hex format
 * @param {string} address - The address that will sign
 * @param {string} requestId - Optional request ID
 * @returns {Promise<object>} The created approval request
 */
export async function createMessageApprovalRequest(messageHex, address, requestId = null) {
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
  
  // Create the approval request
  const approvalRequest = {
    id: requestId || `msg-${Date.now()}`,
    type: 'message',
    message: messageHex,
    messageText,
    account: address,
    metadata: {
      timestamp: Date.now()
    }
  };
  
  // Store the approval request
  await storeApprovalRequest(approvalRequest);
  
  return approvalRequest;
}

/**
 * Create a typed data signing approval request
 * @param {string} address - The address that will sign
 * @param {object} typedData - The typed data to sign
 * @param {string} method - The EIP-712 method being used
 * @param {string} requestId - Optional request ID
 * @returns {Promise<object>} The created approval request
 */
export async function createTypedDataApprovalRequest(address, typedData, method, requestId = null) {
  // Format the data for display
  const formattedData = formatTypedDataForDisplay(typedData);
  
  // Create the approval request
  const approvalRequest = {
    id: requestId || `typed-${Date.now()}`,
    type: 'typedData',
    address,
    typedData,
    formattedData,
    account: address,
    metadata: {
      timestamp: Date.now(),
      method // Store which version of the method was called
    }
  };
  
  // Store the approval request
  await storeApprovalRequest(approvalRequest);
  
  return approvalRequest;
}
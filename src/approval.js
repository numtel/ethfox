// Transaction approval script
import './buffer-polyfill.js'; // Import buffer polyfill
import walletProvider from './wallet-provider.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const networkBadgeEl = document.getElementById('network-badge');
  const fromAddressEl = document.getElementById('from-address');
  const toAddressEl = document.getElementById('to-address');
  const txValueEl = document.getElementById('tx-value');
  const gasLimitEl = document.getElementById('gas-limit');
  const txDataEl = document.getElementById('tx-data');
  const dataCardEl = document.getElementById('data-card');
  const loadingContainerEl = document.getElementById('loading-container');
  const contentContainerEl = document.getElementById('content-container');
  const rejectBtnEl = document.getElementById('reject-btn');
  const approveBtnEl = document.getElementById('approve-btn');

  // Get the request ID from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('id');

  if (!requestId) {
    showError('No request ID provided');
    return;
  }

  let approvalRequest = null;

  try {
    // Get the approval request details
    const pendingApprovals = await walletProvider.getPendingApprovals();
    approvalRequest = pendingApprovals[requestId];

    if (!approvalRequest) {
      showError('Approval request not found');
      return;
    }

    // Display transaction details
    displayRequestDetails(approvalRequest);

    // Hide loading, show content
    loadingContainerEl.style.display = 'none';
    contentContainerEl.style.display = 'block';

    // Set up event listeners
    rejectBtnEl.addEventListener('click', async () => {
      disableButtons();
      await handleReject();
    });

    approveBtnEl.addEventListener('click', async () => {
      disableButtons();
      await handleApprove();
    });
  } catch (error) {
    console.error('Error loading approval request:', error);
    showError('Error loading approval request: ' + error.message);
  }

  // Display the transaction details in the UI
  function displayRequestDetails(request) {
    // For transaction requests
    if (request.type === 'transaction') {
      // Update page title
      document.title = 'Confirm Transaction';
      
      const { txParams, metadata, chainId } = request;

      // Set network info
      networkBadgeEl.textContent = metadata.networkName || `Chain ID: ${chainId}`;

      // Basic transaction details
      fromAddressEl.textContent = txParams.from;
      toAddressEl.textContent = txParams.to;
      
      // Value in ETH
      if (metadata.valueInEth) {
        txValueEl.textContent = `${metadata.valueInEth} ETH`;
      } else {
        txValueEl.textContent = '0 ETH';
      }

      // Gas limit if provided
      if (txParams.gas) {
        gasLimitEl.textContent = parseInt(txParams.gas, 16).toString();
      } else {
        gasLimitEl.textContent = '21000 (default)';
      }
      
      // Gas price (legacy transactions)
      const gasPriceRowEl = document.getElementById('gas-price-row');
      const gasPriceEl = document.getElementById('gas-price');
      if (txParams.gasPrice) {
        gasPriceRowEl.style.display = 'flex';
        const gasPriceGwei = (parseInt(txParams.gasPrice, 16) / 1e9).toFixed(2);
        gasPriceEl.textContent = `${gasPriceGwei} Gwei`;
      }
      
      // EIP-1559 fee parameters
      const maxFeeRowEl = document.getElementById('max-fee-row');
      const maxFeeEl = document.getElementById('max-fee');
      const priorityFeeRowEl = document.getElementById('priority-fee-row');
      const priorityFeeEl = document.getElementById('priority-fee');
      
      if (txParams.maxFeePerGas) {
        maxFeeRowEl.style.display = 'flex';
        const maxFeeGwei = (parseInt(txParams.maxFeePerGas, 16) / 1e9).toFixed(2);
        maxFeeEl.textContent = `${maxFeeGwei} Gwei`;
      }
      
      if (txParams.maxPriorityFeePerGas) {
        priorityFeeRowEl.style.display = 'flex';
        const priorityFeeGwei = (parseInt(txParams.maxPriorityFeePerGas, 16) / 1e9).toFixed(2);
        priorityFeeEl.textContent = `${priorityFeeGwei} Gwei`;
      }
      
      // Nonce
      const nonceEl = document.getElementById('tx-nonce');
      if (txParams.nonce) {
        nonceEl.textContent = parseInt(txParams.nonce, 16).toString();
      } else {
        nonceEl.textContent = 'Auto';
      }

      // Transaction data if present
      if (txParams.data && txParams.data !== '0x') {
        txDataEl.textContent = txParams.data;
        dataCardEl.style.display = 'block';
      }
    }
    // For message signing requests
    else if (request.type === 'message') {
      // Update page title
      document.title = 'Sign Message';
      document.querySelector('h1').textContent = 'Sign Message';
      
      // Hide network badge as it's not relevant for signing
      networkBadgeEl.style.display = 'none';
      
      // Hide gas row as it's not relevant for signing
      document.getElementById('gas-row').style.display = 'none';
      
      // Update the header
      document.querySelector('.card-header').textContent = 'Message Details';
      
      // Show the message content instead of transaction data
      fromAddressEl.textContent = request.account;
      document.getElementById('to-address').parentNode.style.display = 'none'; // Hide the To field
      
      // Update value row to show the message
      document.querySelector('#value-row .info-label').textContent = 'Message:';
      txValueEl.textContent = request.messageText || request.message;
      txValueEl.style.fontWeight = 'normal';
      txValueEl.style.color = '#333';
      
      // If the message is long, show it in a scrollable area
      if ((request.messageText || request.message).length > 50) {
        txValueEl.style.maxHeight = '60px';
        txValueEl.style.overflow = 'auto';
        txValueEl.style.fontFamily = 'monospace';
        txValueEl.style.fontSize = '12px';
        txValueEl.style.padding = '8px';
        txValueEl.style.backgroundColor = '#f5f5f5';
        txValueEl.style.borderRadius = '4px';
      }
      
      // Show the raw message hex in the data card
      if (request.message !== request.messageText) {
        dataCardEl.style.display = 'block';
        document.querySelector('#data-card .card-header').textContent = 'Raw Message Hex';
        txDataEl.textContent = request.message;
      }
      
      // Update the warning text for signing
      document.querySelector('.tx-warning').innerHTML = `
        <strong>Warning:</strong> Only sign messages from sites you trust.
        Malicious sites can use signed messages to steal your funds or compromise your accounts.
      `;
    }
    // For EIP-712 typed data signing requests
    else if (request.type === 'typedData') {
      // Update page title
      document.title = 'Sign Typed Data';
      document.querySelector('h1').textContent = 'Sign Typed Data';
      
      // Set badge to show the domain name
      networkBadgeEl.textContent = request.formattedData.domainName;
      networkBadgeEl.style.display = 'inline-block';
      
      // Hide gas row as it's not relevant for signing
      document.getElementById('gas-row').style.display = 'none';
      
      // Update the header
      document.querySelector('.card-header').textContent = 'Typed Data Details';
      
      // Show the signer address
      fromAddressEl.textContent = request.account;
      
      // Handle "to" address row
      const toRow = document.getElementById('to-address').parentNode;
      toRow.style.display = 'flex';
      document.querySelector('#to-address').parentNode.querySelector('.info-label').textContent = 'Domain';
      document.getElementById('to-address').textContent = request.formattedData.domainSummary.replace(/\n/g, ' • ');
      
      // Update value row to show the primary type
      document.querySelector('#value-row .info-label').textContent = `Data Type (${request.formattedData.primaryType}):`;
      txValueEl.textContent = request.formattedData.messageData;
      txValueEl.style.fontWeight = 'normal';
      txValueEl.style.color = '#333';
      txValueEl.style.maxHeight = '120px';
      txValueEl.style.overflow = 'auto';
      txValueEl.style.fontFamily = 'monospace';
      txValueEl.style.fontSize = '12px';
      txValueEl.style.padding = '8px';
      txValueEl.style.backgroundColor = '#f5f5f5';
      txValueEl.style.borderRadius = '4px';
      
      // Show the full typed data JSON in the data card
      dataCardEl.style.display = 'block';
      document.querySelector('#data-card .card-header').textContent = 'Full Typed Data';
      txDataEl.textContent = request.formattedData.fullData;
      txDataEl.style.maxHeight = '150px';
      
      // Update the warning text for signing structured data
      document.querySelector('.tx-warning').innerHTML = `
        <strong>Warning:</strong> Signing this data can authorize transactions or changes to your account.
        Only sign data from sites you trust. Structured data signing is often used for token approvals and permits.
      `;
      
      // If this is a permit, add a more specific warning
      if (request.formattedData.primaryType === 'Permit') {
        document.querySelector('.tx-warning').innerHTML += `
          <br><br><strong>ERC20 Permit:</strong> You are signing a permission that will allow the spender 
          to transfer tokens from your account without requiring a separate transaction.
        `;
      }
    }
  }

  // Handle transaction approval
  async function handleApprove() {
    try {
      await walletProvider.resolveApproval(requestId, true);
      window.close();
    } catch (error) {
      console.error('Error approving transaction:', error);
      showError('Error approving transaction: ' + error.message);
      enableButtons();
    }
  }

  // Handle transaction rejection
  async function handleReject() {
    try {
      await walletProvider.resolveApproval(requestId, false);
      window.close();
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      showError('Error rejecting transaction: ' + error.message);
      enableButtons();
    }
  }

  // Helper to disable buttons during processing
  function disableButtons() {
    rejectBtnEl.disabled = true;
    approveBtnEl.disabled = true;
  }

  // Helper to re-enable buttons if there's an error
  function enableButtons() {
    rejectBtnEl.disabled = false;
    approveBtnEl.disabled = false;
  }

  // Helper to show errors
  function showError(message) {
    loadingContainerEl.innerHTML = `
      <div style="color: #ea4335; text-align: center;">
        <div style="margin-bottom: 8px;">Error</div>
        <div>${message}</div>
      </div>
    `;
  }
});
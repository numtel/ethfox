/**
 * Popup State Management
 * Handles global state variables and persistence
 */

// State variables
let currentAccount = null;
let activeAccountIndex = 0;
let accounts = [];
let tokens = [];
let currentChainId = null;
let walletInitialized = false;
let walletLocked = true;
let cachedPassword = null;
let currentActiveTab = null;

// Timer variables
let ethBalanceRefreshTimer = null;
let lastBalanceRefreshTime = 0;
let tokenBalanceRefreshTimer = null;
let lastTokenBalanceRefreshTime = 0;
const MIN_BALANCE_REFRESH_INTERVAL = 1000; // Minimum time between refreshes in ms
const MIN_TOKEN_REFRESH_INTERVAL = 1500;

// Save current UI state
export const saveState = async () => {
  try {
    // Get all tabs and find the active one
    const tabs = document.querySelectorAll('.tab');
    const activeTab = Array.from(tabs).find(t => t.classList.contains('active'))?.dataset.tab || 'assets';
    
    // DOM Elements - Send
    const recipientInput = document.getElementById('recipient');
    const amountInput = document.getElementById('amount');
    const tokenSelectEl = document.getElementById('token-select');
    
    // DOM Elements - Token Management
    const tokenAddressInput = document.getElementById('token-address');
    
    // DOM Elements - Sign
    const messageInput = document.getElementById('message');
    
    // DOM Elements - Settings
    const networkSelectEl = document.getElementById('network-select');
    
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
export const restoreState = async () => {
  try {
    const { popupState } = await browser.storage.local.get('popupState');
    
    if (popupState) {
      console.log('Restoring UI state:', popupState);
      
      // Get UI elements
      const recipientInput = document.getElementById('recipient');
      const amountInput = document.getElementById('amount');
      const tokenSelectEl = document.getElementById('token-select');
      const tokenAddressInput = document.getElementById('token-address');
      const messageInput = document.getElementById('message');
      const networkSelectEl = document.getElementById('network-select');
      
      // Restore active tab
      if (popupState.activeTab) {
        // Import dynamically to avoid circular dependency
        const { switchToTab } = await import('../ui/tabs.js');
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

// Getter/setter functions for state
export const getState = () => ({
  currentAccount,
  activeAccountIndex,
  accounts,
  tokens,
  currentChainId,
  walletInitialized,
  walletLocked,
  cachedPassword,
  currentActiveTab,
  ethBalanceRefreshTimer,
  lastBalanceRefreshTime,
  tokenBalanceRefreshTimer,
  lastTokenBalanceRefreshTime
});

export const setState = (newState) => {
  if (newState.currentAccount !== undefined) currentAccount = newState.currentAccount;
  if (newState.activeAccountIndex !== undefined) activeAccountIndex = newState.activeAccountIndex;
  if (newState.accounts !== undefined) accounts = newState.accounts;
  if (newState.tokens !== undefined) tokens = newState.tokens;
  if (newState.currentChainId !== undefined) currentChainId = newState.currentChainId;
  if (newState.walletInitialized !== undefined) walletInitialized = newState.walletInitialized;
  if (newState.walletLocked !== undefined) walletLocked = newState.walletLocked;
  if (newState.cachedPassword !== undefined) cachedPassword = newState.cachedPassword;
  if (newState.currentActiveTab !== undefined) currentActiveTab = newState.currentActiveTab;
  if (newState.ethBalanceRefreshTimer !== undefined) ethBalanceRefreshTimer = newState.ethBalanceRefreshTimer;
  if (newState.lastBalanceRefreshTime !== undefined) lastBalanceRefreshTime = newState.lastBalanceRefreshTime;
  if (newState.tokenBalanceRefreshTimer !== undefined) tokenBalanceRefreshTimer = newState.tokenBalanceRefreshTimer;
  if (newState.lastTokenBalanceRefreshTime !== undefined) lastTokenBalanceRefreshTime = newState.lastTokenBalanceRefreshTime;
};

export const getRefreshIntervals = () => ({
  MIN_BALANCE_REFRESH_INTERVAL,
  MIN_TOKEN_REFRESH_INTERVAL
});
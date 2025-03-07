/**
 * Tab Management Module
 */
import { getState, setState, saveState } from '../state/index.js';
import { getEthBalance, getTokenBalances } from '../services/wallet.js';

// Function to switch tabs
export const switchToTab = (tabName) => {
  const { currentActiveTab } = getState();
  
  // If already on this tab, do nothing
  if (currentActiveTab === tabName) {
    return;
  }
  
  // Save the previous tab
  const previousTab = currentActiveTab;
  
  // Update current tab
  setState({ currentActiveTab: tabName });
  
  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content > div');
  
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(c => c.classList.remove('active'));
  
  // Add active class to selected tab
  const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const selectedContent = document.getElementById(`${tabName}-tab`);
  
  if (selectedTab && selectedContent) {
    selectedTab.classList.add('active');
    selectedContent.classList.add('active');
    
    // Refresh data only if needed based on the tab
    const { currentAccount, accounts } = getState();
    
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

// Initialize tab listeners
export const initTabs = () => {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchToTab(tabName);
    });
  });
  
  // Set input event listeners for state saving
  const inputElements = [
    document.getElementById('recipient'),
    document.getElementById('amount'),
    document.getElementById('token-select'),
    document.getElementById('token-address'),
    document.getElementById('message'),
    document.getElementById('network-select')
  ];
  
  inputElements.forEach(el => {
    if (el) {
      el.addEventListener('change', saveState);
      el.addEventListener('input', saveState);
    }
  });
  
  // Save state before popup closes
  window.addEventListener('beforeunload', saveState);
};
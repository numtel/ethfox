/**
 * Entry point for the Ethereum provider that's injected into web pages
 */

import { EthereumProvider } from './provider.js';

// Self-invoking function to initialize provider
(function() {
  // Install provider
  const provider = new EthereumProvider();
  window.ethereum = provider;
  
  // Also install Web3.currentProvider for compatibility with older dApps
  if (typeof window.web3 === 'undefined') {
    window.web3 = {
      currentProvider: provider
    };
  }
  
  // Notify page that ethereum provider is available
  window.dispatchEvent(new Event('ethereum#initialized'));
  console.log('[EthWallet] Ethereum provider initialized');
})();
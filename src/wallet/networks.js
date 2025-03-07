/**
 * Network and chain management functionality
 */

import { createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { emitEvent } from '../utils/events.js';

// Available chains - will be extended with user-added chains
export const chains = {
  '0x1': mainnet,
  '0xaa36a7': sepolia // Sepolia chainId
};

// Default to Sepolia for testing
export const DEFAULT_CHAIN_ID = '0xaa36a7';

/**
 * Get all chains from storage
 * @returns {Promise<object>} User-defined chains
 */
export async function getSavedChains() {
  try {
    const { userChains } = await browser.storage.local.get('userChains');
    return userChains || {};
  } catch (error) {
    console.error('Error getting user chains:', error);
    return {};
  }
}

/**
 * Load all chains (built-in + user-added)
 * @returns {Promise<object>} Combined chains object
 */
export async function loadAllChains() {
  const userChains = await getSavedChains();
  return { ...chains, ...userChains };
}

/**
 * Get the current chain from storage or use default
 * @returns {Promise<object>} The current chain object
 */
export async function getCurrentChain() {
  try {
    const { chainId } = await browser.storage.local.get('chainId');
    const allChains = await loadAllChains();
    return allChains[chainId || DEFAULT_CHAIN_ID] || sepolia;
  } catch (error) {
    console.error('Error getting chain:', error);
    return sepolia;
  }
}

/**
 * Set the current chain
 * @param {string} chainId - The chain ID to set
 * @returns {Promise<object>} The chain object
 */
export async function setCurrentChain(chainId) {
  const allChains = await loadAllChains();
  if (allChains[chainId]) {
    await browser.storage.local.set({ chainId });
    return allChains[chainId];
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Remove a network
 * @param {string} chainId - The chain ID to remove
 * @returns {Promise<boolean>} True if successful
 */
export async function removeNetwork(chainId) {
  try {
    // Can't remove builtin networks
    if (chains[chainId]) {
      throw new Error(`Cannot remove built-in network with chain ID ${chainId}`);
    }
    
    // Get current user chains
    const { userChains } = await browser.storage.local.get('userChains');
    if (!userChains || !userChains[chainId]) {
      throw new Error(`Network with chain ID ${chainId} not found`);
    }
    
    // Get current chain
    const { chainId: currentChainId } = await browser.storage.local.get('chainId');
    
    // Switch to default if removing the active chain
    if (currentChainId === chainId) {
      await browser.storage.local.set({ chainId: DEFAULT_CHAIN_ID });
      await emitEvent('chainChanged', DEFAULT_CHAIN_ID);
    }
    
    // Remove the chain
    const updatedUserChains = { ...userChains };
    delete updatedUserChains[chainId];
    await browser.storage.local.set({ userChains: updatedUserChains });
    
    return true;
  } catch (error) {
    console.error('Error removing network:', error);
    throw error;
  }
}

/**
 * Get a public client for the current chain
 * @returns {Promise<object>} The public client instance
 */
export async function getPublicClient() {
  const chain = await getCurrentChain();
  return createPublicClient({
    chain,
    transport: http()
  });
}

/**
 * Add a new Ethereum chain 
 * @param {object} chainData - The chain data to add
 * @returns {Promise<object>} The added chain object
 */
export async function addEthereumChain(chainData) {
  // Validate required chain parameters
  if (!chainData.chainId || !chainData.chainName || !chainData.rpcUrls || chainData.rpcUrls.length === 0) {
    throw new Error('Invalid chain configuration: missing required parameters');
  }
  
  // Create a viem-compatible chain object
  const newChain = {
    id: parseInt(chainData.chainId, 16),
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
  const { userChains } = await browser.storage.local.get('userChains');
  const updatedUserChains = { ...(userChains || {}) };
  updatedUserChains[chainData.chainId] = newChain;
  await browser.storage.local.set({ userChains: updatedUserChains });
  
  return newChain;
}
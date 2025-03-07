/**
 * Utilities for emitting events to extension components
 */

import { convertBigIntToString } from './formatting.js';

/**
 * Emit an event to all open tabs
 * 
 * @param {string} eventName - Name of the event to emit (e.g., 'accountsChanged', 'chainChanged')
 * @param {any} data - Data to send with the event
 * @returns {Promise<void>}
 */
export async function emitEvent(eventName, data) {
  try {
    const tabs = await browser.tabs.query({});
    // Convert any BigInt values to strings before sending
    const safeData = convertBigIntToString(data);
    
    for (const tab of tabs) {
      browser.tabs.sendMessage(tab.id, {
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
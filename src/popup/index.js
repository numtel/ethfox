// Main entry point for popup UI
import { initializeUI } from './ui/init.js';
import { registerEventListeners } from './ui/events.js';

// Wait for page to load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Register all event listeners
    registerEventListeners();
    
    // Initialize the UI
    await initializeUI();
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
});
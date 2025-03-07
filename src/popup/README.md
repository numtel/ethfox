# Popup UI Structure

This directory contains the modularized implementation of the wallet popup UI. The code has been refactored from the original monolithic `popup.js` file into a more maintainable structure.

## Directory Structure

- `/popup/index.js` - The main entry point for the popup UI
- `/popup/state/index.js` - State management (current account, tokens, etc.)
- `/popup/services/`
  - `background.js` - Communication with the background script
  - `wallet.js` - Wallet-specific functionality (balances, accounts, etc.)
- `/popup/ui/`
  - `init.js` - UI initialization and setup
  - `tabs.js` - Tab switching and management
  - `utils.js` - UI utility functions (formatting, notifications, etc.)
  - `events.js` - DOM event listeners and handlers

## Main Components

1. **State Management** - Centralized state store to manage global variables like current account, network, and wallet status

2. **Services**
   - Background communication - Handles messaging with the extension's background script
   - Wallet functionality - Implements wallet-specific operations (accounts, balances, tokens)

3. **UI Components**
   - Initialization - Sets up the UI and handles the wallet state display
   - Tab Management - Handles switching between different UI tabs
   - Event Handling - Registers and manages all DOM event listeners
   - Utilities - Common UI helper functions

## Flow of Operation

1. The popup loads and invokes the initialization process
2. Current state is restored from storage
3. Event listeners are registered for all UI elements
4. The wallet state is checked and appropriate UI is shown (setup or main)
5. Account and network information is loaded and displayed
6. User interactions are handled by appropriate event handlers

This modular structure makes the code more maintainable, easier to test, and simpler to extend with new features.
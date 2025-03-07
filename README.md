# Ethereum Wallet Extension for Firefox

<img src="public/ethfox2.96.png" alt="EthFox Logo" width="96" height="96">

A Firefox extension that implements an Ethereum wallet, providing the `window.ethereum` object to web applications. Compatible with Firefox for Android.

> [!WARNING]
> **This wallet is for TESTNET PURPOSES ONLY!** It is not recommended for use with real funds on mainnet. Use only for development and testing.

## Project Structure

The codebase is organized into the following directories:

```
src/
├── utils/          # Utility functions used throughout the codebase
│   ├── buffer.js   # Buffer polyfill for browser compatibility
│   ├── crypto.js   # Encryption/decryption utilities
│   ├── events.js   # Event handling utilities
│   └── formatting.js # Formatting utilities for addresses, transactions, etc.
│
├── wallet/         # Core wallet functionality
│   ├── core.js     # Wallet initialization, locking/unlocking
│   ├── accounts.js # Account creation, management, and signing
│   ├── networks.js # Network/chain management
│   ├── approvals.js # Transaction and message approval handling
│   └── transactions.js # Transaction creation and sending
│
├── content-scripts/ # Scripts injected into web pages
│   └── ethereum-provider/ # Ethereum provider implementation for web pages
│       └── bridge.js  # Communication bridge between page and extension
│
├── page-scripts/    # Scripts that run in the web page context
│   └── ethereum-provider/ # Ethereum provider injected into web pages
│       ├── provider.js # EIP-1193 compliant provider implementation
│       └── index.js   # Entry point for the injected provider
│
└── background.js    # Background script for the extension

## Screenshots

<div align="center">
  <img src="screenshots/popup.png" alt="Wallet Popup" width="250" />
  <img src="screenshots/tx.png" alt="Transaction Approval" width="250" />
  <img src="screenshots/sig.png" alt="Message Signing" width="250" />
</div>

## Features

- Provides Ethereum wallet functionality through the `window.ethereum` API
- Supports multiple chains including Mainnet and Sepolia
- Multiple account management with seed phrase recovery
- Encrypted private key storage with password protection
- Supports common Ethereum methods including:
  - `eth_requestAccounts`
  - `eth_accounts`
  - `eth_chainId`
  - `eth_sendTransaction`
  - `personal_sign`
  - `eth_signTypedData` and `eth_signTypedData_v4` (EIP-712)
  - Chain switching with `wallet_switchEthereumChain`
  
## Extension UI Features

The extension popup interface provides:

- BIP-39/44 seed phrase generation and HD wallet derivation
- Multiple account management
- Password-encrypted key storage
- Wallet backup and restore functionality
- Account importing from seed phrase or private key
- ETH balance display
- ERC-20 token tracking
- Token sending capabilities
- Message signing
- Network switching and management
- Firefox for Android compatibility

## Security Features

- Password-based encryption using Web Crypto API
- Automatic wallet locking
- Seed phrase generation for secure key management
- Encrypted wallet export/import
- Sandboxed approval windows for transactions and signatures

## Development Setup

1. Install dependencies:
   ```
   npm install
   ```
   or 
   ```
   yarn
   ```

2. Build the extension:
   ```
   npm run build
   ```
   or
   ```
   yarn build
   ```

3. Package the extension for Firefox:
   ```
   npm run web-ext
   ```
   or
   ```
   yarn web-ext
   ```

## Testing on Desktop Firefox

1. Open Firefox
2. In the address bar, navigate to: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select any file in the `dist` directory (like `manifest.json`)
5. The extension should now be loaded and visible in the toolbar

## Testing on Firefox for Android

1. Enable debugging on your Android device
2. Connect your device to your computer via USB
3. In Firefox on your computer, navigate to `about:debugging#/runtime/this-firefox`
4. Click "Connect" under "Remote Debugging"
5. Select your device from the list
6. Click "Load Temporary Add-on..." and select the web-ext-artifacts ZIP file created by the web-ext command
7. The extension should now be installed on your Android device

## Building for Production

To create a production-ready package for submission to the Firefox Add-ons store:

```
npm run web-ext
```

This will create a ZIP file in the `web-ext-artifacts` directory that you can submit to the Firefox Add-ons store.

## Wallet Backup and Recovery

This wallet implements BIP-39 and BIP-44 standards for HD wallet derivation:
- BIP-39: Mnemonic seed phrase generation (12 or 24 words)
- BIP-44: Hierarchical deterministic wallet paths (m/44'/60'/0'/0/X)

Make sure to:
1. Securely back up your seed phrase
2. Never share your seed phrase or private keys with anyone
3. Use a strong password for wallet encryption

## Troubleshooting

If you encounter a Content Security Policy error when opening the extension popup, make sure:
1. The `popup.js` file is included in the `/dist` directory
2. The manifest.json has the proper CSP directive
3. The index.html references the popup.js file correctly

## License

MIT
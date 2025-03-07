# Ethereum Wallet Extension Test DApp

This is a simple web application for testing the Ethereum wallet extension. It demonstrates various Ethereum wallet operations:

- Connecting to the wallet
- Viewing ETH balance
- Adding and tracking ERC-20 tokens
- Sending ERC-20 tokens
- Signing messages
- Switching between Ethereum networks (Mainnet and Sepolia)

## How to Use

1. Make sure the Ethereum wallet extension is installed in Firefox
2. Run the following command from the project root:

```bash
npm run serve-dapp
```

3. Your browser will open automatically with the test DApp loaded
4. Connect your wallet by clicking the "Connect Wallet" button
5. Test the wallet functionality:
   - View your ETH balance
   - Add ERC-20 tokens using their contract addresses
   - View ERC-20 token balances
   - Send ERC-20 tokens to another address
   - Sign messages
   - Switch between Ethereum Mainnet and Sepolia Testnet

## For Sepolia Testing

For a smooth testing experience on Sepolia, you can add these ERC-20 tokens:

- **USDC (Sepolia)**: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- **WETH (Sepolia)**: 0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92
- **DAI (Sepolia)**: 0x68194a729C2450ad26072b3D33ADaCbcef39D574

You may need Sepolia ETH to perform transactions. You can get some from a Sepolia faucet like:
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/

## Notes

- All ERC-20 token data is stored in your browser's localStorage
- The DApp automatically connects to your wallet if it was previously connected
- Network switching is only supported for Ethereum Mainnet and Sepolia Testnet in this example
(async () => {
  class EthereumProvider {
    constructor() {
      // Standard properties required by EIP-1193
      this.isMetaMask = true; // Many dApps check for MetaMask specifically
      this.isMattletFox = true; // Our custom identifier
      this.isEthereumProvider = true;
      this._chainId = null;
      this._selectedAddress = null;
      this._connected = false;
      this._network = null;
      this._networkVersion = null;
      this._handlers = new Map();
      this._listeners = {
        'chainChanged': new Set(),
        'accountsChanged': new Set(),
        'connect': new Set(),
        'disconnect': new Set(),
        'message': new Set(),
        'notification': new Set(),
        // Legacy web3 events
        'networkChanged': new Set(),
      };
      
      // Listen for messages from the content script
      window.addEventListener('message', (event) => {
        if (event.source !== window || !event.data || !event.data.type) return;
        
        if (event.data.type === 'FROM_EXTENSION') {
          const { id, result, error, event: eventName, data: eventData } = event.data.message;
          
          // Handle RPC responses
          if (id && this._handlers.has(id)) {
            const { resolve, reject } = this._handlers.get(id);
            if (error) {
              reject(new Error(error));
            } else {
              // Update internal state based on responses
              if (id.startsWith('internal_')) {
                if (id.includes('chainId') && result) {
                  const newChainId = result;
                  if (this._chainId !== newChainId) {
                    this._chainId = newChainId;
                    this._networkVersion = parseInt(newChainId, 16).toString();
                    this._emitEvent('chainChanged', this._chainId);
                    this._emitEvent('networkChanged', this._networkVersion); // Legacy event
                  }
                }
                if (id.includes('accounts') && Array.isArray(result) && result.length > 0) {
                  const newAddress = result[0];
                  if (this._selectedAddress !== newAddress) {
                    const oldAddress = this._selectedAddress;
                    this._selectedAddress = newAddress;
                    this._emitEvent('accountsChanged', result);
                    
                    // If we didn't have an address before, we're now connected
                    if (!oldAddress && newAddress) {
                      this._connected = true;
                      this._emitEvent('connect', { chainId: this._chainId });
                    }
                  }
                }
              }
              resolve(result);
            }
            this._handlers.delete(id);
          }
          
          // Handle events from extension
          if (eventName && this._listeners[eventName]) {
            // Also update internal state based on events
            if (eventName === 'chainChanged' && eventData) {
              this._chainId = eventData;
              this._networkVersion = parseInt(eventData, 16).toString();
            } else if (eventName === 'accountsChanged' && Array.isArray(eventData)) {
              this._selectedAddress = eventData[0] || null;
            }
            
            this._emitEvent(eventName, eventData);
          }
        }
      });
      
      // Initialize provider state when injected
      this._initializeState();
    }
    
    // Internal helper to emit events to all listeners
    _emitEvent(eventName, data) {
      if (this._listeners[eventName]) {
        this._listeners[eventName].forEach(listener => {
          try {
            listener(data);
          } catch (err) {
            console.error(`Error in ${eventName} listener:`, err);
          }
        });
      }
    }
    
    // Initialize provider state by fetching chainId and accounts
    async _initializeState() {
      try {
        // Get chain ID
        this._chainId = await this.request({ 
          method: 'eth_chainId',
          _internalId: 'internal_init_chainId'
        });
        
        if (this._chainId) {
          this._networkVersion = parseInt(this._chainId, 16).toString();
        }
        
        // Get accounts
        const accounts = await this.request({ 
          method: 'eth_accounts',
          _internalId: 'internal_init_accounts'
        });
        
        if (accounts && accounts.length > 0) {
          this._selectedAddress = accounts[0];
          this._connected = true;
          // Emit connect event after a short delay to ensure listeners are set up
          setTimeout(() => {
            this._emitEvent('connect', { chainId: this._chainId });
            this._emitEvent('accountsChanged', accounts);
          }, 50);
        }
      } catch (error) {
        console.error('Error initializing provider state:', error);
      }
    }
    
    // Required EIP-1193 method
    async request(args) {
      if (!args || typeof args !== 'object') {
        throw new Error('Ethereum.request requires a valid request object.');
      }
      
      const { method, params = [], _internalId } = args;
      
      if (!method || typeof method !== 'string') {
        throw new Error('Ethereum.request requires a valid method string.');
      }
      
      return new Promise((resolve, reject) => {
        const id = _internalId || (Date.now().toString(36) + Math.random().toString(36).substring(2));
        
        this._handlers.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'FROM_PAGE',
          message: { id, method, params }
        }, '*');
      });
    }
    
    // Legacy methods required by some dApps
    async enable() {
      return this.request({ method: 'eth_requestAccounts' });
    }
    
    async send(methodOrPayload, paramsOrCallback) {
      // Handle different calling conventions
      if (typeof methodOrPayload === 'string') {
        // send(method, params)
        return this.request({
          method: methodOrPayload,
          params: Array.isArray(paramsOrCallback) ? paramsOrCallback : []
        });
      } else if (typeof methodOrPayload === 'object' && methodOrPayload !== null) {
        // send(payload)
        if (typeof paramsOrCallback === 'function') {
          // send(payload, callback)
          this.request({
            method: methodOrPayload.method,
            params: methodOrPayload.params || []
          }).then(
            result => paramsOrCallback(null, { result, id: methodOrPayload.id, jsonrpc: '2.0' }),
            error => paramsOrCallback(error, null)
          );
          return null;
        } else {
          // send(payload) with promise return
          return this.request({
            method: methodOrPayload.method,
            params: methodOrPayload.params || []
          }).then(result => ({
            result,
            id: methodOrPayload.id || 1,
            jsonrpc: '2.0'
          }));
        }
      }
      throw new Error('Unsupported send signature');
    }
    
    // Standard event methods
    on(eventName, listener) {
      if (typeof listener !== 'function') {
        throw new Error('Listener must be a function');
      }
      
      if (this._listeners[eventName]) {
        this._listeners[eventName].add(listener);
        
        // Special case for connect event - if we're already connected, emit immediately
        if (eventName === 'connect' && this._connected) {
          setTimeout(() => {
            try {
              listener({ chainId: this._chainId });
            } catch (error) {
              console.error('Error in connect listener:', error);
            }
          }, 0);
        }
        
        // For accountsChanged, emit current accounts if we have them
        if (eventName === 'accountsChanged' && this._selectedAddress) {
          setTimeout(() => {
            try {
              listener([this._selectedAddress]);
            } catch (error) {
              console.error('Error in accountsChanged listener:', error);
            }
          }, 0);
        }
      }
    }
    
    addListener(eventName, listener) {
      return this.on(eventName, listener);
    }
    
    removeListener(eventName, listener) {
      if (this._listeners[eventName]) {
        this._listeners[eventName].delete(listener);
      }
    }
    
    // Additional compatibility methods
    sendAsync(payload, callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      
      this.request({
        method: payload.method,
        params: payload.params || []
      }).then(
        result => callback(null, { result, id: payload.id || 1, jsonrpc: '2.0' }),
        error => callback(error, null)
      );
    }
    
    // Getters for internal state (read-only)
    get chainId() {
      return this._chainId;
    }
    
    get networkVersion() {
      return this._networkVersion;
    }
    
    get selectedAddress() {
      return this._selectedAddress;
    }
    
    get isConnected() {
      return this._connected;
    }
  }

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


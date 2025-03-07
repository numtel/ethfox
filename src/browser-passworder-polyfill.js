// This is a simplified version of the browser-passworder package
// to avoid the Buffer-related issues in a browser context

import { Buffer } from 'buffer';

// We will use SubtleCrypto for encryption/decryption
const subtle = window.crypto.subtle;

// Constants
const ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// Utility to convert password to an encryption key
async function keyFromPassword(password) {
  // Create a password buffer
  const passwordBuffer = typeof password === 'string' 
    ? new TextEncoder().encode(password)
    : password;
  
  // Generate a salt
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  // Derive key from password
  const key = await subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const derivedKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 10000,
      hash: 'SHA-256',
    },
    key,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  );
  
  return { derivedKey, salt };
}

// Encrypt function
async function encrypt(password, data) {
  // Special case for null password (for dev/testing only)
  if (password === null) {
    return JSON.stringify({
      version: 'x-Eth-MPC-0.0.1',
      data: typeof data === 'object' ? JSON.stringify(data) : String(data)
    });
  }
  
  // Convert data to string if it's not already
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  
  // Convert data to buffer
  const dataBuffer = new TextEncoder().encode(dataString);
  
  // Generate IV
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Generate key from password
  const { derivedKey, salt } = await keyFromPassword(password);
  
  // Encrypt data
  const encryptedBuffer = await subtle.encrypt(
    {
      name: ALGORITHM.name,
      iv,
    },
    derivedKey,
    dataBuffer
  );
  
  // Convert to Base64
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encryptedB64 = arrayBufferToBase64(encryptedArray);
  const ivB64 = arrayBufferToBase64(iv);
  const saltB64 = arrayBufferToBase64(salt);
  
  // Return the encrypted data with metadata
  return JSON.stringify({
    algorithm: ALGORITHM.name,
    iv: ivB64,
    salt: saltB64,
    data: encryptedB64,
  });
}

// Decrypt function
async function decrypt(password, encrypted) {
  // Handle null password (for decrypting previously unlocked data)
  if (password === null) {
    try {
      return JSON.parse(encrypted);
    } catch (e) {
      // If it's not valid JSON, return as is
      return encrypted;
    }
  }
  
  try {
    // Parse the encrypted data
    const encryptedData = JSON.parse(encrypted);

    // For backward compatibility with existing encrypted data
    if (encryptedData.version === 'x-Eth-MPC-0.0.1') {
      // Simulate the behavior for this format
      console.log('Using compatibility mode for existing data format');
      try {
        // Just parse the data (assuming it's already decrypted if we're here)
        return JSON.parse(encryptedData.data);
      } catch (e) {
        return encryptedData.data;
      }
    }
    
    // Get the iv, salt, and data
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const salt = base64ToArrayBuffer(encryptedData.salt);
    const data = base64ToArrayBuffer(encryptedData.data);
    
    // Generate key from password and salt
    const keyMaterial = await subtle.importKey(
      'raw',
      typeof password === 'string' ? new TextEncoder().encode(password) : password,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      ALGORITHM,
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await subtle.decrypt(
      {
        name: ALGORITHM.name,
        iv,
      },
      key,
      data
    );
    
    // Convert to string
    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    
    // Parse if it was originally an object
    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    // If there was an error, return it
    throw new Error('Incorrect password');
  }
}

// Utility functions for Base64 conversion
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Export the API
export default {
  encrypt,
  decrypt,
};
// Polyfill for Buffer to work with browser-passworder
import { Buffer as BufferPackage } from 'buffer';

// Create a proper global Buffer if it doesn't exist
if (typeof window !== 'undefined') {
  // Make sure Buffer exists and has the proper methods
  window.Buffer = BufferPackage;
  window.Buffer.from = BufferPackage.from;
  window.Buffer.alloc = BufferPackage.alloc;
  window.Buffer.allocUnsafe = BufferPackage.allocUnsafe;
  window.Buffer.isBuffer = BufferPackage.isBuffer;
}

// For Node.js/CommonJS compatibility in case it's used in that context
if (typeof global !== 'undefined' && typeof global.Buffer === 'undefined') {
  global.Buffer = BufferPackage;
}

export default BufferPackage;
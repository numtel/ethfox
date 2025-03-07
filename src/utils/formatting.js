/**
 * Utility functions for formatting data
 */

/**
 * Converts BigInt values to strings for JSON serialization
 * @param {*} obj - The object to convert
 * @returns {*} The converted object
 */
export function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntToString(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Safely stringify objects with BigInt values
 * @param {object} obj - The object to stringify
 * @param {Function|null} replacer - Optional replacer function
 * @param {number} space - Indentation spaces
 * @returns {string} JSON string
 */
export function safeStringify(obj, replacer = null, space = 2) {
  return JSON.stringify(convertBigIntToString(obj), replacer, space);
}

/**
 * Formats an Ethereum address for display by shortening it
 * @param {string} address - Full Ethereum address
 * @returns {string} Shortened address (e.g., 0x1234...5678)
 */
export function formatAddress(address) {
  if (!address) return '';
  
  if (address.length <= 10) return address;
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formats typed data for display in the approval UI
 * @param {object} typedData - The typed data to format
 * @returns {object} Formatted data for the UI
 */
export function formatTypedDataForDisplay(typedData) {
  // Deep copy to avoid modifying the original
  const formattedData = JSON.parse(JSON.stringify(typedData));
  
  try {
    // Extract primary details for easier display
    const primaryType = formattedData.primaryType;
    const domain = formattedData.domain;
    
    // Format domain into a readable summary
    let domainSummary = '';
    if (domain.name) domainSummary += `Name: ${domain.name}\n`;
    if (domain.version) domainSummary += `Version: ${domain.version}\n`;
    if (domain.chainId) domainSummary += `Chain ID: ${domain.chainId}\n`;
    if (domain.verifyingContract) domainSummary += `Contract: ${domain.verifyingContract}\n`;
    
    // Format the message data based on primary type
    const messageData = formattedData.message;
    const primaryTypeData = [];
    
    // Format permit-specific data in a readable way if it's a permit
    if (primaryType === 'Permit') {
      if (messageData.owner) primaryTypeData.push(`Owner: ${messageData.owner}`);
      if (messageData.spender) primaryTypeData.push(`Spender: ${messageData.spender}`);
      if (messageData.value) primaryTypeData.push(`Value: ${messageData.value}`);
      if (messageData.nonce) primaryTypeData.push(`Nonce: ${messageData.nonce}`);
      if (messageData.deadline) {
        const deadline = Number(messageData.deadline);
        const date = new Date(deadline * 1000); // Convert from unix timestamp
        primaryTypeData.push(`Deadline: ${date.toLocaleString()} (${messageData.deadline})`);
      }
    } else {
      // For non-permit types, format all fields
      for (const key in messageData) {
        let value = messageData[key];
        // Format arrays or objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        primaryTypeData.push(`${key}: ${value}`);
      }
    }
    
    return {
      domainName: domain.name || 'Unknown Domain',
      domainSummary,
      primaryType,
      messageData: primaryTypeData.join('\n'),
      fullData: safeStringify(typedData, null, 2)
    };
  } catch (error) {
    console.error('Error formatting typed data:', error);
    // Return a simpler format if there's an error
    return {
      domainName: 'Error formatting data',
      domainSummary: '',
      primaryType: typedData.primaryType || 'Unknown',
      messageData: 'Error parsing message data',
      fullData: safeStringify(typedData, null, 2)
    };
  }
}
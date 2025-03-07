import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define server port
const PORT = 8080;

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    // Set CORS headers to allow any origin 
    // (needed for Firefox extension content script to work properly)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Get the requested file path
    let filePath = join(__dirname, 'example-dapp', req.url === '/' ? 'index.html' : req.url);
    
    // Determine content type based on file extension
    let contentType = 'text/html';
    const ext = filePath.split('.').pop().toLowerCase();
    
    switch (ext) {
      case 'js':
        contentType = 'application/javascript';
        break;
      case 'css':
        contentType = 'text/css';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
    }
    
    // Read and serve the file
    const content = await readFile(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File Not Found');
  }
});

// Start server
server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Example DApp server running at ${url}`);
  console.log('Make sure your Firefox extension is loaded before testing!');
  
  // Open browser automatically
  try {
    open(url);
  } catch (error) {
    console.error('Failed to open browser automatically:', error);
    console.log(`Please open ${url} in your browser manually.`);
  }
});
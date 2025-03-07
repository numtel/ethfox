import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        approval: 'approval.html',
        'content-script': resolve(__dirname, 'src/content-scripts/ethereum-provider/bridge.js'),
        'injected': resolve(__dirname, 'src/page-scripts/ethereum-provider/index.js'),
        'background': resolve(__dirname, 'src/background.js'),
        'popup': resolve(__dirname, 'src/popup/index.js'),
        'approval-js': resolve(__dirname, 'src/approval.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      // Ensure proper path resolution for imported modules
      '@': resolve(__dirname, 'src'),
      buffer: 'buffer'
    }
  },
  define: {
    // Fix for browser-passworder Buffer dependency
    'globalThis.Buffer': 'globalThis.Buffer',
    'global.Buffer': 'globalThis.Buffer',
    'process.env.NODE_DEBUG': 'false',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  }
});


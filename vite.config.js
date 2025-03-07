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
        'content-script': resolve(__dirname, 'src/content-script.js'),
        'injected': resolve(__dirname, 'src/injected-script.js'),
        'background': resolve(__dirname, 'src/background.js'),
        'popup': resolve(__dirname, 'src/popup.js'),
        'approval-js': resolve(__dirname, 'src/approval.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      // Ensure proper path resolution for imported modules
      '@': resolve(__dirname, 'src')
    }
  }
});


import { copyFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Copy manifest.json to dist directory
console.log('Copying manifest.json to dist directory...');
copyFileSync(
  resolve('./manifest.json'),
  resolve('./dist/manifest.json')
);

// Copy popup.js to dist directory
console.log('Copying popup.js to dist directory...');
copyFileSync(
  resolve('./src/popup.js'),
  resolve('./dist/popup.js')
);

// Copy logo files to dist directory
console.log('Copying logo files to dist directory...');
const logoSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512];
logoSizes.forEach(size => {
  const filename = `ethfox${size}.png`;
  copyFileSync(
    resolve(`./public/${filename}`),
    resolve(`./dist/${filename}`)
  );
});

console.log('Post-build process completed.');
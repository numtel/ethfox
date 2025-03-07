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
const logoSizes = [24, 96, 256, 512];
logoSizes.forEach(size => {
  const filename = `ethfox2.${size}.png`;
  copyFileSync(
    resolve(`./public/${filename}`),
    resolve(`./dist/${filename}`)
  );
});

console.log('Post-build process completed.');

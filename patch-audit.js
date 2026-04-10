const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(process.cwd(), '.open-next');

if (!fs.existsSync(targetDir)) {
  console.error('Error: .open-next directory not found.');
  process.exit(1);
}

console.log('Patching files in .open-next...');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Patch 1: Remove .open-next/ prefix
    const oldContent = content;
    content = content.replace(/\.open-next\//g, '');
    
    // Patch 2: Reconcile triple-dot node_modules
    content = content.replace(/\.\.\/\.\.\/\.\.\/node_modules/g, '../../node_modules');
    
    if (content !== oldContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Patched: ${filePath}`);
    }
  }
});

console.log('Patching complete.');

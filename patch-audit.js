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
    content = content.replace(/\.open-next\//g, '');
    
    // Patch 2: Reconcile triple-dot node_modules
    content = content.replace(/\.\.\/\.\.\/\.\.\/node_modules/g, '../../node_modules');
    
    // Patch 3: Root-relative path fix for _worker.js specifically
    if (filePath.endsWith('_worker.js')) {
         content = content.replace(/"\.open-next\//g, '"./');
    }

    // Patch 4: Syntax Bomb Defusal (import.meta.url)
    if (content.includes('import.meta.url ??=')) {
        console.log(`Defusing Syntax Bomb in ${filePath}...`);
        content = content.replace(/import\.meta\.url\s*\?\?=\s*[^;]+;/g, '// import.meta.url assignment removed for Edge stability');
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

// REAL Diagnostic Injection - Targeted for _worker.js
const workerPath = path.join(targetDir, '_worker.js');
if (fs.existsSync(workerPath)) {
    let content = fs.readFileSync(workerPath, 'utf8');
    if (!content.includes('CATCH_ALL_ERROR')) {
        console.log('Injecting Diagnostic & Middleware Safety into _worker.js...');
        
        // Wrap middleware/request handler in a try/catch
        content = content.replace(
            /(const\s+reqOrResp\s*=\s*await\s+)(\w+)(\(request,\s*env,\s*ctx\);)/,
            'let reqOrResp; try { reqOrResp = await $2(request, env, ctx); } catch (e) { console.error("Middleware/Mux Error:", e); reqOrResp = request; }'
        );

        // Wrap the final server handler call
        content = content.replace(
            /(return\s+)(\w+)(\(reqOrResp,\s*env,\s*ctx,\s*request\.signal\);)/,
            'try { return await $2(reqOrResp, env, ctx, request.signal); } catch (e) { return new Response("CATCH_ALL_ERROR: " + e.message + "\\nStack: " + e.stack, { status: 500 }); }'
        );
        
        fs.writeFileSync(workerPath, content, 'utf8');
    }
}

console.log('Patching complete.');

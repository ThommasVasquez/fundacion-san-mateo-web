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
        
        // Wrap middlewareHandler in a try/catch
        content = content.replace(
            /const\s+reqOrResp\s*=\s*await\s+middlewareHandler\(request,\s*env,\s*ctx\);/,
            'let reqOrResp; try { reqOrResp = await middlewareHandler(request, env, ctx); } catch (e) { console.error("Middleware Error:", e); reqOrResp = request; }'
        );

        // Wrap the dynamic import call specifically
        content = content.replace(
            /return\s+handler\(reqOrResp,\s*env,\s*ctx,\s*request\.signal\);/,
            'try { return await handler(reqOrResp, env, ctx, request.signal); } catch (e) { return new Response("CATCH_ALL_ERROR: " + e.message + "\\nStack: " + e.stack, { status: 500 }); }'
        );
        
        fs.writeFileSync(workerPath, content, 'utf8');
    }
}

console.log('Patching complete.');

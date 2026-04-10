const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
    console.log('--- STARTING ATOMIC PRODUCTION CONSOLIDATION ---');

    const openNextDir = path.join(process.cwd(), '.open-next');
    const serverDefaultDir = path.join(openNextDir, 'server-functions', 'default');
    const entryPoint = path.join(openNextDir, 'worker.js');
    const outfile = path.join(openNextDir, '_worker.js');

    if (!fs.existsSync(entryPoint)) {
        console.error('Error: .open-next/worker.js not found. Run opennextjs-cloudflare build first.');
        process.exit(1);
    }

    // Comprehensive list of Node.js and Cloudflare built-ins to remain external
    const externals = [
        'node:*', 
        'cloudflare:*',
        'async_hooks', 'fs', 'path', 'os', 'url', 'vm', 'util', 'buffer', 'crypto', 'stream', 
        'module', 'http', 'https', 'zlib', 'events', 'net', 'tls', 'querystring', 'string_decoder', 'diagnostics_channel'
    ];

    // Step 1: Atomic Bundling with esbuild (Unminified for Template Literal Preservation)
    console.log('Step 1: Bundling worker into a single file...');
    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        outfile: outfile,
        format: 'esm',
        target: 'esnext',
        minify: false,
        platform: 'node',
        external: externals,
        loader: {
            '.wasm': 'binary',
            '.bin': 'binary'
        },
        banner: {
            js: '/* ATOMIC_PRODUCTION_BUNDLE_VERIFIED */',
        },
        logLevel: 'info',
    });

    // Step 2: Syntax Bomb Defusal
    console.log('Step 2: Defusing potential syntax bombs...');
    let content = fs.readFileSync(outfile, 'utf8');
    content = content.replace(/import\.meta\.url\s*\?\?=\s*[^;]+;/g, '// import.meta.url assignment removed');
    fs.writeFileSync(outfile, content, 'utf8');

    // Step 3: Full Directory Promotion
    console.log('Step 3: Promoting entire server function directory to root...');
    const copyRecursiveSync = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
            const s = path.join(src, file);
            const d = path.join(dest, file);
            if (fs.statSync(s).isDirectory()) {
                if (file !== 'node_modules') copyRecursiveSync(s, d);
            } else {
                fs.copyFileSync(s, d);
            }
        });
    };
    copyRecursiveSync(serverDefaultDir, openNextDir);

    // Step 4: Asset Flattening
    console.log('Step 4: Flattening assets into root...');
    const assetsDir = path.join(openNextDir, 'assets');
    if (fs.existsSync(assetsDir)) {
        copyRecursiveSync(assetsDir, openNextDir);
    }

    console.log('--- ATOMIC PRODUCTION CONSOLIDATION COMPLETE ---');
}

build().catch(err => {
    console.error('Build Error:', err);
    process.exit(1);
});

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
    console.log('--- STARTING TOTAL ATOMIC CONSOLIDATION (INLINED) ---');

    const openNextDir = path.join(process.cwd(), '.open-next');
    const serverDefaultDir = path.join(openNextDir, 'server-functions', 'default');
    const entryPoint = path.join(openNextDir, 'worker.js');
    const outfile = path.join(openNextDir, '_worker.js');

    if (!fs.existsSync(entryPoint)) {
        console.error('Error: .open-next/worker.js not found. Run opennextjs-cloudflare build first.');
        process.exit(1);
    }

    // Step 1: Read all critical manifests for inlining
    console.log('Step 1: Reading manifests for inlining...');
    const manifests = {};
    const manifestFiles = [
        '.next/routes-manifest.json',
        '.next/prerender-manifest.json',
        '.next/build-manifest.json',
        '.next/middleware-manifest.json',
        '.next/server/pages-manifest.json',
        '.next/server/app-paths-manifest.json'
    ];

    manifestFiles.forEach(relPath => {
        const fullPath = path.join(serverDefaultDir, relPath);
        if (fs.existsSync(fullPath)) {
            console.log(`  - Inlining: ${relPath}`);
            manifests[relPath] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
    });

    // Step 2: Atomic Bundling with esbuild
    console.log('Step 2: Bundling worker...');
    const externals = [
        'node:*', 'cloudflare:*', 'async_hooks', 'fs', 'path', 'os', 'url', 'vm', 'util', 'buffer', 'crypto', 'stream'
    ];

    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        outfile: outfile,
        format: 'esm',
        target: 'esnext',
        minify: false,
        platform: 'node',
        external: externals,
        loader: { '.wasm': 'binary', '.bin': 'binary' },
        banner: {
            js: `/* TOTAL_ATOMIC_BUNDLE_v48 */\nconst __NEXT_INLINED_MANIFESTS = ${JSON.stringify(manifests)};`,
        },
        logLevel: 'info',
    });

    // Step 3: Post-processing & Polyfill Bypass
    console.log('Step 3: Defusing bombs and bypassing filesystem...');
    let content = fs.readFileSync(outfile, 'utf8');
    
    // Defuse syntax bombs
    content = content.replace(/import\.meta\.url\s*\?\?=\s*[^;]+;/g, '// defused');
    
    // OPTIONAL: We could monkey-patch fs.readFileSync here, but let's try the bundle first.
    
    fs.writeFileSync(outfile, content, 'utf8');

    // Step 4: Asset Sync (Remaining Assets)
    console.log('Step 4: Syncing static assets...');
    const assetsDir = path.join(openNextDir, 'assets');
    const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
            const s = path.join(src, file);
            const d = path.join(dest, file);
            if (fs.statSync(s).isDirectory()) copyDir(s, d);
            else fs.copyFileSync(s, d);
        });
    };
    if (fs.existsSync(assetsDir)) copyDir(assetsDir, openNextDir);

    console.log('--- TOTAL ATOMIC CONSOLIDATION COMPLETE ---');
}

build().catch(err => {
    console.error('Build Error:', err);
    process.exit(1);
});

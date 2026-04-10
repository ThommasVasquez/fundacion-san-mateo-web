const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
    console.log('--- STARTING TOTAL ATOMIC REDIRECTION (v50) ---');

    const openNextDir = path.join(process.cwd(), '.open-next');
    const serverDefaultDir = path.join(openNextDir, 'server-functions', 'default');
    const entryPoint = path.join(openNextDir, 'worker.js');
    const outfile = path.join(openNextDir, '_worker.js');

    if (!fs.existsSync(entryPoint)) {
        console.error('Error: .open-next/worker.js not found.');
        process.exit(1);
    }

    // Step 1: Read manifests for inlining
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
            manifests[relPath] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
    });

    // Step 2: Create the Monkey-Patch Banner
    const banner = `
/* TOTAL_ATOMIC_v50_REDIRECTION */
const __NEXT_INLINED = ${JSON.stringify(manifests)};
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

// Helper to resolve relative manifest paths
const getInlined = (p) => {
    for (const key of Object.keys(__NEXT_INLINED)) {
        if (p.endsWith(key)) return JSON.stringify(__NEXT_INLINED[key]);
    }
    return null;
};

// Monkey-patch Synchronous FS
const origReadFileSync = fs.readFileSync;
fs.readFileSync = (p, opt) => {
    const data = getInlined(p.toString());
    if (data) return opt === 'utf8' || opt?.encoding === 'utf8' ? data : Buffer.from(data);
    return origReadFileSync(p, opt);
};

// Monkey-patch Asynchronous FS
const origReadFile = fsp.readFile;
fsp.readFile = async (p, opt) => {
    const data = getInlined(p.toString());
    if (data) return opt === 'utf8' || opt?.encoding === 'utf8' ? data : Buffer.from(data);
    return origReadFile(p, opt);
};

// Map original promises
fs.promises.readFile = fsp.readFile;
`;

    // Step 3: Bundle with esbuild
    const externals = ['node:*', 'cloudflare:*'];
    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        outfile: outfile,
        format: 'esm',
        target: 'esnext',
        minify: false,
        platform: 'node',
        external: externals,
        banner: { js: banner },
        loader: { '.wasm': 'binary', '.bin': 'binary' },
    });

    // Step 4: Final Syntax Defusing
    let content = fs.readFileSync(outfile, 'utf8');
    content = content.replace(/import\.meta\.url\s*\?\?=\s*[^;]+;/g, '// defused');
    fs.writeFileSync(outfile, content, 'utf8');

    console.log('--- REDIRECTION CONSOLIDATION COMPLETE ---');
}

build().catch(err => {
    console.error('Build Error:', err);
    process.exit(1);
});

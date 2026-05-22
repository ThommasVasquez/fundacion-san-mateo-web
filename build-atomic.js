const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
    const openNextDir = path.join(process.cwd(), '.open-next');
    const serverDir = path.join(openNextDir, 'server-functions', 'default');
    const manifests = {};
    const files = ['.next/routes-manifest.json', '.next/prerender-manifest.json', '.next/build-manifest.json'];

    files.forEach(f => {
        const p = path.join(serverDir, f);
        if (fs.existsSync(p)) manifests[f] = JSON.parse(fs.readFileSync(p, 'utf8'));
    });

    const bannerCode = `
        const __NEXT_INLINED = ${JSON.stringify(manifests)};
        import { Buffer } from 'node:buffer';
        import fs from 'node:fs';
        (function() {
            try {
                const orig = fs.readFileSync;
                Object.defineProperty(fs, 'readFileSync', {
                    value: function(p, opt) {
                        const s = String(p || '');
                        for (const k in __NEXT_INLINED) {
                            if (s.endsWith(k)) {
                                const d = JSON.stringify(__NEXT_INLINED[k]);
                                return opt === 'utf8' || opt?.encoding === 'utf8' ? d : Buffer.from(d);
                            }
                        }
                        return orig.apply(this, arguments);
                    },
                    configurable: true
                });
            } catch (e) {}
        })();
    `;

    await esbuild.build({
        entryPoints: [path.join(openNextDir, 'worker.js')],
        bundle: true,
        outfile: path.join(openNextDir, '_worker.js'),
        format: 'esm',
        target: 'esnext',
        external: ['node:*', 'cloudflare:*', 'async_hooks', 'fs', 'path', 'os', 'url', 'vm', 'util', 'http', 'https', 'buffer', 'crypto', 'stream', 'module', 'timers', 'zlib', 'querystring', 'timers/promises'],
        loader: { '.wasm': 'binary' },
        banner: { js: bannerCode },
        minify: true,
    });
    console.log('--- SERVIDOR REFORZADO ---');
}
build().catch(err => { console.error(err); process.exit(1); });

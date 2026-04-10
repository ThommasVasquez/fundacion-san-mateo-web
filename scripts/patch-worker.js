const fs = require('fs');
const path = require('path');

const workerPath = path.resolve('.open-next/assets/_worker.js');
let content = fs.readFileSync(workerPath, 'utf8');

const injection = `
        if (env.ASSETS) { 
            const response = await env.ASSETS.fetch(request); 
            if (response.status !== 404) return response; 
        }
`;

content = content.replace('async fetch(request, env, ctx) {', `async fetch(request, env, ctx) {${injection}`);

fs.writeFileSync(workerPath, content);
console.log('Successfully injected asset fallback into _worker.js');

const fs = require('fs');

function loadEnv(path) {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });
}

loadEnv('.env.local');

async function checkBridge() {
    const url = process.env.COMPUTE_BRIDGE_URL;
    const key = process.env.COMPUTE_BRIDGE_API_KEY;

    console.log(`Testing Bridge: ${url}`);

    try {
        const start = Date.now();
        const res = await fetch(`${url}/health`, {
            headers: { 'x-bridge-api-key': key }
        });
        const status = res.status;
        const text = await res.text();
        console.log(`Response: ${status} | Latency: ${Date.now() - start}ms`);
        console.log(`Raw: ${text}`);
    } catch (err) {
        console.log(`BRIDGE_CHECK_FAILED: ${err.message}`);
    }
}

checkBridge();

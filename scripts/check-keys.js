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

async function checkOpenRouter() {
    const key = process.env.OPENROUTER_API_KEY;
    console.log("Testing OpenRouter Key...");
    try {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: { Authorization: `Bearer ${key}` }
        });
        const data = await res.json();
        console.log("SUCCESS: OpenRouter is active.");
        console.log(`Balance: $${data.data?.usage || 0}`);
    } catch (err) {
        console.log(`OpenRouter FAILED: ${err.message}`);
    }
}

async function checkComposio() {
    const key = process.env.COMPOSIO_API_KEY;
    console.log("Testing Composio Key...");
    try {
        const res = await fetch("https://backend.composio.dev/api/v1/users/me", {
            headers: { 'x-api-key': key }
        });
        const data = await res.json();
        if (data.id) {
            console.log("SUCCESS: Composio is active.");
        } else {
            console.log("Composio FAILED: No user data returned.");
        }
    } catch (err) {
        console.log(`Composio FAILED: ${err.message}`);
    }
}

async function run() {
    await checkOpenRouter();
    await checkComposio();
}

run();

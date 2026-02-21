const express = require('express');
const Docker = require('dockerode');
const crypto = require('crypto');
const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(express.json());

const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;
if (!BRIDGE_API_KEY) {
    console.error("CRITICAL: BRIDGE_API_KEY environment variable is not set!");
    process.exit(1);
}

// Middleware for API Key verification
const auth = (req, res, next) => {
    const apiKey = req.headers['x-bridge-api-key'];
    if (apiKey !== BRIDGE_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.post('/provision', auth, async (req, res) => {
    const { userId, agentSlug, username } = req.body;

    // This logic should mirror src/lib/docker/provisioner.ts
    // FOR NOW: We just implement the API skeleton.
    console.log(`Provisioning request for ${userId} (${agentSlug})`);

    try {
        // implementation of provisionContainer would go here
        // For initial setup, we can even re-use the logic from the main repo
        res.status(501).json({ error: 'Provisioning logic not yet implemented in bridge. Use docker socket directly for now.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Compute Bridge listening on port ${PORT}`);
});

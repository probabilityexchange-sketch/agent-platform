# Randi Compute Bridge

This is a small API that runs on your AWS EC2 instance to allow the Randi web platform (running on Vercel) to manage Docker containers securely.

## Setup Instructions

1. **SSH into your EC2 instance.**
2. **Ensure Node.js and Docker are installed.**
3. **Copy this `bridge/` directory to your EC2.**
4. **Install dependencies:**
   ```bash
   npm install express dockerode
   ```
5. **Set up Environment Variables:**
   Create a `.env` file or export the following variables:
   - `BRIDGE_API_KEY`: A strong random string (must match `COMPUTE_BRIDGE_API_KEY` on Vercel).
   - `PORT`: The port to listen on (default 3001).
6. **Start the bridge:**
   ```bash
   node server.js
   ```
   *(Recommended: Use `pm2` to keep it running)*

## Security Note

- Ensure the port (e.g., 3001) is open in your **AWS Security Group** but restricted to Vercel IP ranges if possible, or at least secured by the API Key.
- For production, it is highly recommended to run this behind an Nginx proxy with SSL.

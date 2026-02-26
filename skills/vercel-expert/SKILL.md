---
name: vercel-expert
description: "Provides expert guidance for deploying and managing applications on Vercel. Use for tasks involving deployments, environment variables, serverless/edge functions, vercel.json configuration, Next.js on Vercel, preview deployments, and the Vercel CLI."
---

# Vercel Expert Skill

This skill equips Manus with the expertise to deploy, configure, and manage applications on the Vercel platform.

## Core Workflow

### 1. Understand the Deployment Goal
Clarify the task: new deployment, config change, debugging a failed build, or managing environment variables?

### 2. Project Configuration (`vercel.json`)
```json
{
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/:path*" }],
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "X-Content-Type-Options", "value": "nosniff" }] }]
}
```

### 3. Environment Variables
```bash
vercel env add MY_SECRET_KEY production
vercel env pull .env.local
```
Variables can be scoped to `production`, `preview`, and `development`.

### 4. Serverless and Edge Functions
- **Serverless Functions:** Files in `/api` are auto-deployed as serverless functions (Node.js).
- **Edge Middleware:** `middleware.ts` at the root runs on the Edge Network — ideal for auth checks and redirects.

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token");
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
```

### 5. Deployment Commands
```bash
vercel          # Deploy to preview
vercel --prod   # Deploy to production
vercel logs <deployment-url>   # View build/runtime logs
```

### 6. Debugging Failed Builds
1. Check build logs in the Vercel dashboard or via `vercel logs`.
2. Ensure all build-time environment variables are set.
3. Verify build command and output directory match your framework.
4. Use the Vercel MCP server (`manus-mcp-cli tool list --server vercel`) to programmatically fetch deployment details.

## Key Resources
- **Reference:** `/home/ubuntu/skills/vercel-expert/references/reference.md`
- **Vercel MCP:** `manus-mcp-cli tool list --server vercel`

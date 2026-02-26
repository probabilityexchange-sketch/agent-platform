---
name: supabase-expert
description: "Provides expert guidance for developing with Supabase. Use for tasks involving Supabase Auth (RLS, JWT), Postgres, Realtime, Edge Functions, Storage, and the Supabase client libraries (JS/TS) and CLI."
---

# Supabase Expert Skill

This skill equips Manus with the expertise to build, deploy, and manage applications using the Supabase platform. It provides a comprehensive workflow for handling authentication, database operations, real-time subscriptions, serverless functions, and storage.

## Core Workflow

When a task requires interacting with Supabase, follow this structured workflow.

### 1. Understand the Goal & Initialize Client

First, clarify the specific goal (e.g., "fetch user data," "subscribe to database changes," "upload a file"). Then, ensure a Supabase client is initialized. In a JavaScript/TypeScript environment, this is the first step.

```typescript
import { createClient } from '@supabase/supabase-js'

// Ensure these are loaded from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. Authentication and Row Level Security (RLS)

Authentication is the gateway to all other Supabase services. RLS is critical for security.

*   **Auth Strategy:** Determine the required authentication method: email/password, OAuth (Google, GitHub), or magic links. Use the `supabase.auth` methods (`signUp`, `signInWithPassword`, `signInWithOAuth`, `signInWithOtp`).
*   **RLS Policies:** **Never disable RLS on public tables.** Always define and enable RLS policies in the Supabase dashboard or via SQL migrations. Policies should be specific and grant the minimum necessary permissions.
    *   **Example Policy (Users can only see their own profiles):**
        ```sql
        CREATE POLICY "Users can view their own profile."
        ON profiles FOR SELECT
        USING (auth.uid() = id);
        ```
*   **JWT Management:** The Supabase client handles JWTs automatically. For server-side operations or API routes, retrieve the user's JWT from the request and use it to create a service role client or verify the user's session.

### 3. Database Operations (Supabase Postgres)

Use the PostgREST interface provided by the client library for database interactions.

*   **Querying Data:** Use the `.from('table_name')` syntax with `.select()`, `.insert()`, `.update()`, and `.delete()`.
*   **Joins:** Use the `foreign_table(column1, column2)` syntax within a `select` query to perform joins.
*   **RPCs:** For complex queries or business logic, create and call PostgreSQL functions using `supabase.rpc('function_name', { args })`.
*   **Migrations:** For schema changes, use the Supabase CLI to create and apply migrations (`supabase db diff`, `supabase migration new`, `supabase db push`). Do not make schema changes directly in the dashboard for production projects.

### 4. Real-time Subscriptions

Use Supabase Realtime to build live features.

*   **Creating Channels:** Create a channel with `supabase.channel('channel_name')`.
*   **Subscribing to Changes:** Subscribe to database changes (`postgres_changes`), presence events, or broadcast messages.
    ```javascript
    const channel = supabase.channel('realtime-chat');

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      console.log('New message:', payload.new);
    }).subscribe();
    ```
*   **Important:** Ensure RLS policies are enabled for tables with real-time subscriptions to prevent unauthorized data access.

### 5. Edge Functions

For serverless logic, use Deno-based Edge Functions.

*   **Development:** Use the Supabase CLI to create, serve, and deploy functions (`supabase functions new`, `supabase functions serve`, `supabase deploy`).
*   **Secrets:** Manage secrets using `supabase secrets set`. Access them via `Deno.env.get('SECRET_NAME')`.
*   **CORS:** Configure CORS headers within the function's response to allow access from your frontend application.

### 6. Storage

Use Supabase Storage for managing files, images, and other large objects.

*   **Buckets & Policies:** Create storage buckets and define access policies (e.g., public read, authenticated read/write). Policies are crucial for securing user-uploaded content.
*   **File Operations:** Use `supabase.storage.from('bucket_name').upload()` and `download()`.
*   **Signed URLs:** Generate time-limited signed URLs with `createSignedUrl()` for secure, temporary access to private files.

## Key Resources

*   **Comprehensive Reference:** For detailed information on all concepts, APIs, and SDKs, read the main reference document:
    `/home/ubuntu/skills/supabase-expert/references/reference.md`
*   **Supabase CLI:** Use the `supabase` CLI for local development, migrations, and deployments.
*   **Supabase MCP:** When available, use the `manus-mcp-cli tool list --server supabase` to see available managed operations.

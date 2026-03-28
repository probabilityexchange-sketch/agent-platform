interface OpenVikingConfig {
  serverUrl: string;
  apiKey: string;
}

interface RecallMemoriesOptions {
  userId: string;
  query: string;
  limit?: number;
}

interface CommitSessionOptions {
  userId: string;
  sessionId: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

interface RegisterToolOptions {
  toolName: string;
  description: string;
  instructions: string;
}

interface ListUserMemoriesOptions {
  userId: string;
  limit?: number;
}

interface OpenVikingResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_TIMEOUT_MS = 5000;

export class MemoryClient {
  private config: OpenVikingConfig;
  private timeoutMs: number;

  constructor(config: OpenVikingConfig, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.config = config;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<OpenVikingResponse<T>> {
    const url = `${this.config.serverUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: `Request timeout after ${this.timeoutMs}ms` };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async recallMemories(options: RecallMemoriesOptions): Promise<OpenVikingResponse<string>> {
    const { userId, query, limit = DEFAULT_LIMIT } = options;

    const result = await this.request<{ context: string }>('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        scope: `viking://user/${userId}/`,
        limit,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.context || '' };
  }

  async recallAgentMemories(query: string): Promise<OpenVikingResponse<string>> {
    const result = await this.request<{ context: string }>('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        scope: 'viking://agent/randi/',
        limit: 5,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.context || '' };
  }

  async commitSession(options: CommitSessionOptions): Promise<OpenVikingResponse<void>> {
    const { userId, sessionId, messages } = options;

    return this.request<void>('/session/commit', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        sessionId,
        messages,
      }),
    });
  }

  async registerTool(options: RegisterToolOptions): Promise<OpenVikingResponse<void>> {
    const { toolName, description, instructions } = options;
    const uri = `viking://agent/randi/skills/${toolName.toLowerCase()}.md`;
    const content = `# ${toolName}\n\n${description}\n\n## Instructions\n\n${instructions}`;

    return this.request<void>('/store', {
      method: 'POST',
      body: JSON.stringify({
        uri,
        content,
      }),
    });
  }

  async listUserMemories(options: ListUserMemoriesOptions): Promise<OpenVikingResponse<string[]>> {
    const { userId, limit = DEFAULT_LIMIT } = options;

    const result = await this.request<{ uris: string[] }>('/list', {
      method: 'POST',
      body: JSON.stringify({
        scope: `viking://user/${userId}/`,
        limit,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.uris || [] };
  }

  async healthCheck(): Promise<OpenVikingResponse<boolean>> {
    const result = await this.request<{ status: string }>('/health', {
      method: 'GET',
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.status === 'ok' };
  }
}

let memoryClientInstance: MemoryClient | null = null;

export function getMemoryClient(): MemoryClient {
  if (memoryClientInstance) {
    return memoryClientInstance;
  }

  const serverUrl = process.env.OPENVIKING_SERVER_URL;
  const apiKey = process.env.OPENVIKING_API_KEY;

  if (!serverUrl || !apiKey) {
    throw new Error(
      'OpenViking not configured: OPENVIKING_SERVER_URL and OPENVIKING_API_KEY must be set'
    );
  }

  memoryClientInstance = new MemoryClient({ serverUrl, apiKey });
  return memoryClientInstance;
}

export function isMemoryConfigured(): boolean {
  return !!(process.env.OPENVIKING_SERVER_URL && process.env.OPENVIKING_API_KEY);
}

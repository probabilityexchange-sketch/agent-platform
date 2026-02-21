import { ProvisionResult } from "@/lib/docker/provisioner";

export interface BridgeConfig {
    baseUrl: string;
    apiKey: string;
}

export class ComputeBridgeClient {
    private config: BridgeConfig;

    constructor(config: BridgeConfig) {
        this.config = config;
    }

    async provision(
        userId: string,
        agentSlug: string,
        username: string
    ): Promise<ProvisionResult> {
        const res = await fetch(`${this.config.baseUrl}/provision`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Bridge-API-Key": this.config.apiKey,
            },
            body: JSON.stringify({ userId, agentSlug, username }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Bridge provisioning failed");
        }

        return res.json();
    }

    async stop(dockerId: string): Promise<void> {
        const res = await fetch(`${this.config.baseUrl}/containers/${dockerId}/stop`, {
            method: "POST",
            headers: {
                "X-Bridge-API-Key": this.config.apiKey,
            },
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Bridge failed to stop container");
        }
    }

    async remove(dockerId: string): Promise<void> {
        const res = await fetch(`${this.config.baseUrl}/containers/${dockerId}`, {
            method: "DELETE",
            headers: {
                "X-Bridge-API-Key": this.config.apiKey,
            },
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Bridge failed to remove container");
        }
    }
}

let bridgeClient: ComputeBridgeClient | null = null;

export function getComputeBridge(): ComputeBridgeClient | null {
    if (bridgeClient) return bridgeClient;

    const baseUrl = process.env.COMPUTE_BRIDGE_URL;
    const apiKey = process.env.COMPUTE_BRIDGE_API_KEY;

    if (!baseUrl || !apiKey) {
        return null;
    }

    bridgeClient = new ComputeBridgeClient({ baseUrl, apiKey });
    return bridgeClient;
}

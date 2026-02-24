export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  internalPort: number;
  tokensPerHour: number;
  requiredTier: string;
  memoryLimit: bigint;
  cpuLimit: bigint;
  pidLimit: number;
  active: boolean;
}

export interface AgentCatalogItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  tokensPerHour: number;
  requiredTier: string;
  active: boolean;
}

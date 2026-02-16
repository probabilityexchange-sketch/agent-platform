import { agentZeroConfig } from "./agent-zero";
import { openClawConfig } from "./openclaw";

export interface AgentContainerConfig {
  image: string;
  internalPort: number;
  env: Record<string, string>;
  volumes: Record<string, string>;
  memoryLimit: number;
  cpuLimit: number;
  pidLimit: number;
  command?: string[];
}

export type AgentConfigFactory = (opts: {
  subdomain: string;
  password: string;
  domain: string;
}) => AgentContainerConfig;

const agentRegistry: Record<string, AgentConfigFactory> = {
  "agent-zero": agentZeroConfig,
  openclaw: openClawConfig,
  // Map seeded agents to agent-zero config
  "research-assistant": agentZeroConfig,
  "code-assistant": agentZeroConfig,
  "productivity-agent": agentZeroConfig,
};

export function getAgentConfig(slug: string): AgentConfigFactory | undefined {
  return agentRegistry[slug];
}

export function listAgentSlugs(): string[] {
  return Object.keys(agentRegistry);
}

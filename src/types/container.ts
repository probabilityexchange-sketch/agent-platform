export type ContainerStatus =
  | "PROVISIONING"
  | "RUNNING"
  | "STOPPING"
  | "STOPPED"
  | "EXPIRED"
  | "ERROR";

export interface ContainerInfo {
  id: string;
  dockerId: string | null;
  subdomain: string;
  agentId: string;
  agentName: string;
  status: ContainerStatus;
  url: string | null;
  password: string | null;
  tokensUsed: number;
  expiresAt: string;
  createdAt: string;
}

export interface ProvisionRequest {
  agentId: string;
  hours: number;
}

export interface ProvisionResponse {
  containerId: string;
  url: string;
  password: string | null;
  expiresAt: string;
}

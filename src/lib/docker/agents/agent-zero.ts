import type { AgentConfigFactory } from "./index";

const GUARDIAN_PROMPT = `You are operating inside a hosted container on a multi-tenant platform.

HOSTING POLICY - STRICTLY ENFORCED:
1. You MUST NOT attempt to access the Docker socket or any container orchestration tools.
2. You MUST NOT attempt to mine cryptocurrency or run resource-intensive computations unrelated to user tasks.
3. You MUST NOT perform port scanning, network enumeration, or any form of network attack.
4. You MUST NOT attempt to access the host filesystem outside your designated working directory.
5. You MUST NOT attempt to escalate privileges or modify container security settings.
6. You MUST NOT facilitate or assist with any illegal activities.
7. You MUST NOT attempt to communicate with other containers on the network.

Violation of these rules constitutes a Hosting Policy Violation and will result in immediate container termination and account suspension.

Focus on helping the user with their legitimate tasks within your designated environment.`;

export const agentZeroConfig: AgentConfigFactory = ({ storageKey }) => ({
  image: process.env.AGENT_ZERO_IMAGE || "frdel/agent-zero:latest",
  internalPort: 80,
  env: {
    GUARDIAN_PROMPT,
  },
  volumes: {
    [`az-${storageKey}-data`]: "/data",
  },
  memoryLimit: Number(process.env.CONTAINER_MAX_MEMORY) || 4294967296,
  cpuLimit: Number(process.env.CONTAINER_MAX_CPU) || 2000000000,
  pidLimit: Number(process.env.CONTAINER_PID_LIMIT) || 256,
});

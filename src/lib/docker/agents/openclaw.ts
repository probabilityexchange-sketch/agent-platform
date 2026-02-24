import type { AgentConfigFactory } from "./index";

export const openClawConfig: AgentConfigFactory = ({
  password,
  storageKey,
}) => ({
  image: process.env.OPENCLAW_IMAGE || "openclaw/openclaw:latest",
  internalPort: 8080,
  env: {
    PASSWORD: password,
  },
  volumes: {
    [`oc-${storageKey}-data`]: "/app/data",
  },
  memoryLimit: Number(process.env.CONTAINER_MAX_MEMORY) || 4294967296,
  cpuLimit: Number(process.env.CONTAINER_MAX_CPU) || 2000000000,
  pidLimit: Number(process.env.CONTAINER_PID_LIMIT) || 256,
});

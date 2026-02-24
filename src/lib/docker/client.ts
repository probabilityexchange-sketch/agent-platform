import Docker from "dockerode";

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
const DOCKER_HOST = process.env.DOCKER_HOST;

const globalForDocker = globalThis as unknown as {
  dockerClient: Docker | undefined;
};

function createDockerClient(): Docker {
  if (DOCKER_HOST) {
    const parsed = new URL(DOCKER_HOST);
    const protocol = parsed.protocol === "https:" ? "https" : "http";
    const port = parsed.port
      ? Number(parsed.port)
      : protocol === "https"
        ? 2376
        : 2375;

    return new Docker({
      protocol,
      host: parsed.hostname,
      port,
    });
  }

  return new Docker({ socketPath: DOCKER_SOCKET });
}

export const docker =
  globalForDocker.dockerClient ?? createDockerClient();

if (process.env.NODE_ENV !== "production") {
  globalForDocker.dockerClient = docker;
}

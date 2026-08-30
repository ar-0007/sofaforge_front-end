import "./core/loadEnv";
import { createServer } from "http";
import { createApp } from "./app";

/**
 * API_PORT is the local-development port; PORT is what a host (Render, a PaaS,
 * Docker) injects. An env var that exists but is empty is treated as absent —
 * `??` alone would hand `parseInt` an empty string, and the process would die
 * on `NaN` before it ever bound a socket.
 */
function resolvePort(): number {
  for (const value of [process.env.API_PORT, process.env.PORT]) {
    const port = Number.parseInt((value ?? "").trim(), 10);
    if (Number.isInteger(port) && port >= 0 && port < 65536) return port;
  }
  return 4000;
}

const port = resolvePort();

// 0.0.0.0, not localhost: a container's health check reaches the process from
// outside its own loopback interface.
const server = createServer(createApp());
server.listen(port, "0.0.0.0", () => {
  console.log(`[api] listening on port ${port}`);
});

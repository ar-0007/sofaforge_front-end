import "./core/loadEnv";
import { createServer } from "http";
import { createApp } from "./app";

const port = parseInt(process.env.API_PORT ?? process.env.PORT ?? "4000", 10);

const server = createServer(createApp());
server.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}/`);
});

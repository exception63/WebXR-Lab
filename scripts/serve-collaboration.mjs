import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { resolve } from "node:path";
import { WebSocket, WebSocketServer } from "ws";

const projectRoot = resolve(import.meta.dirname, "..");
const port = Number.parseInt(process.env.WEBXR_LAB_COLLAB_PORT ?? "8444", 10);
const server = createServer(
  {
    key: readFileSync(resolve(projectRoot, ".certs", "server-key.pem")),
    cert: readFileSync(resolve(projectRoot, ".certs", "server.pem")),
  },
  (request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify({ ok: true, peers: webSocketServer.clients.size }));
      return;
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  },
);
const webSocketServer = new WebSocketServer({
  noServer: true,
  maxPayload: 4096,
  perMessageDeflate: false,
});

let state = {
  revision: 0,
  colorIndex: 0,
  energy: 0,
  lastActor: "none",
  updatedAt: 0,
};

function statePayload() {
  return JSON.stringify({ type: "state", ...state });
}

function broadcastState() {
  const payload = statePayload();
  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

webSocketServer.on("connection", (socket) => {
  socket.send(statePayload());
  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      return;
    }
    try {
      const message = JSON.parse(data.toString());
      if (
        message?.type !== "resonate" ||
        typeof message.actor !== "string" ||
        message.actor.length < 1 ||
        message.actor.length > 32
      ) {
        return;
      }
      state = {
        revision: state.revision + 1,
        colorIndex: (state.colorIndex + 1) % 6,
        energy: Math.min(1, state.energy * 0.62 + 0.46),
        lastActor: message.actor,
        updatedAt: Date.now(),
      };
      broadcastState();
    } catch {
      // Invalid messages are ignored without affecting other room peers.
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  const requestUrl = new URL(request.url ?? "/", "https://webxr-lab.local");
  if (requestUrl.pathname !== "/room") {
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    webSocketServer.emit("connection", webSocket, request);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`WebXR-Lab collaboration room is ready on wss://0.0.0.0:${port}/room`);
});

function stop() {
  for (const client of webSocketServer.clients) {
    client.close(1001, "server-shutdown");
  }
  webSocketServer.close(() => server.close(() => process.exit(0)));
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

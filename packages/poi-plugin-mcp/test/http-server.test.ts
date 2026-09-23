import { afterEach, describe, expect, it } from "vitest";
import { SnapshotStore } from "../src/snapshot.js";
import { startPoiHttpServer } from "../src/http-server.js";

const running: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(running.splice(0).map((server) => server.close()));
});

describe("Poi Streamable HTTP MCP", () => {
  it("exposes minimal liveness metadata without MCP authentication", async () => {
    const store = new SnapshotStore();
    const server = await startPoiHttpServer(store, { port: 0, token: "secret" });
    running.push(server);

    const response = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, online: true, snapshot_version: 0 });
    expect(body).not.toHaveProperty("resources");
    expect(body).not.toHaveProperty("ships");
    expect(body).not.toHaveProperty("equipment");
  });

  it("rejects unauthenticated MCP requests and accepts initialize with the bearer token", async () => {
    const server = await startPoiHttpServer(new SnapshotStore(), { port: 0, token: "secret" });
    running.push(server);
    const url = `http://127.0.0.1:${server.port}/mcp`;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    const unauthorized = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body,
    });
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch(url, {
      method: "POST",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-03-26",
      },
      body,
    });
    expect(authorized.status).toBe(200);
    const response = await authorized.json() as { result?: { serverInfo?: { name?: string } } };
    expect(response.result?.serverInfo?.name).toBe("kancolle-poi-mcp");
  });
});

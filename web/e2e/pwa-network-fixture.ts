import { createServer, request as upstreamRequest } from "node:http";
import type { AddressInfo } from "node:net";

import { test as base } from "@playwright/test";

type NetworkControl = {
  origin: string;
  failures: Map<string, number>;
  stalls: Set<string>;
  workerRevision: number;
};

// Navigation preload is not reliably intercepted by Playwright page routes.
// This local proxy injects failures into the worker's real network requests.
export const test = base.extend<{ network: NetworkControl }>({
  network: async ({ baseURL }, runWithNetwork) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:3100");
    const control: NetworkControl = { origin: "", failures: new Map(), stalls: new Set(), workerRevision: 0 };
    const server = createServer((req, res) => {
      const path = new URL(req.url!, "http://localhost").pathname;
      if (control.stalls.has(path)) return;
      const failure = control.failures.get(path);
      if (failure) {
        res.writeHead(failure, { "content-type": "text/html", "cache-control": "no-store" });
        res.end("<h1>Upstream unavailable</h1>");
        return;
      }
      // Stop synthetic authentication callbacks before they can contact Supabase.
      if (path === "/auth/callback") {
        res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
        res.end("<h1>Test callback</h1>");
        return;
      }
      const upstream = upstreamRequest({
        hostname: origin.hostname, port: origin.port, path: req.url, method: req.method,
        headers: { ...req.headers, "accept-encoding": "identity" },
      }, (reply) => {
        if (path === "/sw.js") {
          const chunks: Buffer[] = [];
          reply.on("data", (chunk: Buffer) => chunks.push(chunk));
          reply.on("end", () => {
            res.writeHead(reply.statusCode!, { "content-type": "application/javascript", "cache-control": "no-store" });
            res.end(`${Buffer.concat(chunks).toString()}\n// test revision ${control.workerRevision}\n`);
          });
        } else {
          res.writeHead(reply.statusCode!, reply.headers);
          reply.pipe(res);
        }
      });
      upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      res.on("close", () => upstream.destroy());
      req.pipe(upstream);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    control.origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try { await runWithNetwork(control); } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  },
});

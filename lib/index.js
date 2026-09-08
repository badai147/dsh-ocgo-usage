/**
 * dsh-ocgo-usage — host (node) half.
 *
 * Exposes `/api/ocgo-usage` on the DSH web server: reads the OpenCode Go API
 * key from DSH's own provider configuration (~/.dsh/.credentials.yaml, then
 * the OPENCODE_GO_API_KEY environment variable) and proxies GET
 * https://opencode.ai/zen/go/v1/usage. The key never leaves the host process
 * or the browser.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import https from "node:https";

/** Read the opencode-go API key from DSH provider configuration. */
function readKey() {
  const home = homedir();
  try {
    const cred = readFileSync(join(home, ".dsh", ".credentials.yaml"), "utf8");
    const m = /OPENCODE_GO_API_KEY:\s*(\S+)/.exec(cred);
    if (m) return m[1].trim();
  } catch {}
  return process.env.OPENCODE_GO_API_KEY || null;
}

/** GET the usage endpoint; resolves with the raw JSON text. */
function fetchUsage(key) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "opencode.ai",
        path: "/zen/go/v1/usage",
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "User-Agent": "dsh-ocgo-usage/1.0",
        },
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export const inject = ["webServer"];

export function apply(ctx) {
  ctx.webServer.register({
    kind: "exact",
    path: "/api/ocgo-usage",
    handler: async (req, res) => {
      const respond = (payload) => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(payload));
      };
      try {
        const key = readKey();
        if (!key) return respond({ error: "opencode-go api key not found" });
        let parsed;
        try {
          parsed = JSON.parse(await fetchUsage(key));
        } catch (e) {
          return respond({ error: String((e && e.message) || e) });
        }
        if (!parsed || parsed.error) return respond({ error: (parsed && parsed.error) || "usage failed" });
        const u = parsed.usage;
        const pick = (k) => {
          const x = u && u[k];
          return x
            ? {
                status: x.status || null,
                percent: typeof x.percent === "number" ? x.percent : null,
                resetsAt: x.resetsAt || null,
              }
            : null;
        };
        respond({ rolling: pick("rolling"), weekly: pick("weekly"), monthly: pick("monthly") });
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: String((e && e.message) || e) }));
      }
    },
  });
}
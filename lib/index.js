/**
 * dsh-ocgo-usage — host (node) half.
 *
 * Exposes `/api/ocgo-usage` on the DSH web server: reads the OpenCode Go API
 * key from DSH's own provider configuration (~/.dsh/.ocg-state.json, then
 * ~/.dsh/.credentials.yaml, then the OPENCODE_GO_API_KEY environment
 * variable) and proxies GET https://opencode.ai/zen/go/v1/usage. The key
 * never leaves the host process or a command line — python reads it from the
 * file itself.
 */
const FETCH_CMD = [
  "python3 - <<'PY'",
  "import json, os, re, urllib.request",
  'home = os.path.expanduser("~")',
  "key = None",
  "try:",
  '    key = json.load(open(os.path.join(home, ".dsh", ".ocg-state.json"))).get("apiKey")',
  "except Exception:",
  "    pass",
  "if not key:",
  "    try:",
  '        m = re.search(r"OPENCODE_GO_API_KEY:\\s*(\\S+)", open(os.path.join(home, ".dsh", ".credentials.yaml")).read())',
  "        if m: key = m.group(1).strip()",
  "    except Exception:",
  "        pass",
  "if not key:",
  '    key = os.environ.get("OPENCODE_GO_API_KEY")',
  "if not key:",
  '    print(json.dumps({"error": "opencode-go api key not found"}))',
  "    raise SystemExit(0)",
  'req = urllib.request.Request("https://opencode.ai/zen/go/v1/usage", headers={"Authorization": "Bearer " + key, "User-Agent": "dsh-ocgo-usage/1.0"})',
  "try:",
  "    with urllib.request.urlopen(req, timeout=15) as resp:",
  '        print(resp.read().decode("utf-8"))',
  "except Exception as exc:",
  '    print(json.dumps({"error": str(exc)}))',
  "PY",
].join("\n")

export const inject = ["webServer", "shell"];

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
        const spec = ctx.shell.resolve({ command: FETCH_CMD, timeoutMs: 20000, stdoutMaxBytes: 30000 });
        const run = await ctx.shell.run(spec);
        const text = (run && run.stdout && run.stdout.text) || "";
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          return respond({ error: "usage: unexpected response" });
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
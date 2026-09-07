import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
const CAMPAIGN = "vision-demo-camp";
const dir = path.join(process.cwd(), "creative-assets", "campaigns", CAMPAIGN, "output");
mkdirSync(dir, { recursive: true });
copyFileSync("creative-assets/fixtures/visual/low-contrast.png", path.join(dir, "render.png"));
const child = spawn("npx", ["tsx", "creative-assets/src/mcp/server.ts"], { shell: true, stdio: ["pipe", "pipe", "pipe"] });
let buf = "";
child.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id === 1) console.log("INIT:", msg.result?.serverInfo?.name);
    if (msg.id === 2) console.log("TOOLS(" + msg.result?.tools?.length + "):", msg.result?.tools?.map((t) => t.name).join(","));
    if (msg.id === 3) {
      const out = JSON.parse(msg.result?.content?.[0]?.text ?? "{}");
      console.log("FP:", out.fingerprint);
      console.log("SCORE:", out.report?.overallScore, out.report?.status, "applied:", out.report?.applied?.join("+"));
      console.log("ISSUES:", out.report?.issues?.map((i) => `${i.id}[${i.severity}]`).join(", "));
      console.log("CATS:", Object.entries(out.report?.categories ?? {}).filter(([, c]) => c.max > 0).map(([k, c]) => `${k}=${c.score}/${c.max}(${c.source})`).join(" "));
      child.kill();
      process.exit(0);
    }
  }
});
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } } }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n");
child.stdin.write(JSON.stringify({
  jsonrpc: "2.0", id: 3, method: "tools/call",
  params: {
    name: "critique_composition",
    arguments: {
      compositionPlan: {
        canvas: { width: 1080, height: 1350 },
        brandId: "bafut",
        layers: [
          { type: "image", role: "background", asset: "stadium", bleed: true },
          { type: "text", role: "headline", content: "TORNEO 2026", position: "top-left", colorFromBrand: "paper" },
          { type: "text", role: "cta", content: "INSCRIPCIONES", position: "bottom-left", colorFromBrand: "flood" },
        ],
        assets: [{ id: "stadium", role: "background", query: "stadium night" }],
      },
      brandId: "bafut",
      campaignId: CAMPAIGN,
      iteration: 1,
      renderedImagePath: path.join(dir, "render.png"),
      includeVisualAnalysis: true,
    },
  },
}) + "\n");
setTimeout(() => { child.kill(); process.exit(1); }, 90000);

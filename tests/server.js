// Minimal static server that mimics the parts of Cloudflare Pages the site relies on:
// - headers from ../_headers are applied
// - "/" serves index.html
// - unknown paths return ../404.html with status 404
// Only top-level site files are served, never the test tooling.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8788);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
};

// _headers format: an unindented path pattern, then indented "Name: value" lines.
function loadHeaderRules() {
  const rules = [];
  let current = null;
  for (const line of fs.readFileSync(path.join(ROOT, "_headers"), "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(":");
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

function matches(pattern, urlPath) {
  const escaped = pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp("^" + escaped.join(".*") + "$").test(urlPath);
}

const rules = loadHeaderRules();
const siteFiles = new Set(
  fs.readdirSync(ROOT).filter((f) => !f.startsWith(".") && !f.startsWith("_") && TYPES[path.extname(f)])
);

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const name = urlPath === "/" ? "index.html" : urlPath.slice(1);
    const found = siteFiles.has(name);
    const file = found ? name : "404.html";

    for (const rule of rules) {
      if (matches(rule.pattern, urlPath)) {
        for (const [key, value] of Object.entries(rule.headers)) res.setHeader(key, value);
      }
    }
    res.setHeader("Content-Type", TYPES[path.extname(file)]);
    res.writeHead(found ? 200 : 404);
    res.end(fs.readFileSync(path.join(ROOT, file)));
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}`));

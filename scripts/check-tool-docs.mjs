import { readFileSync } from "node:fs";

const sourceFiles = [
  "packages/poi-plugin-mcp/src/mcp-server.ts",
  "packages/kancolle-data-mcp/src/index.ts",
];
const registered = sourceFiles.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/server\.tool\(\s*["']([^"']+)["']/g)].map((match) => match[1]);
});
const docs = readFileSync("docs/MCP_TOOLS.md", "utf8");
const documented = [...docs.matchAll(/^###\s+([a-z][a-z0-9_]*)\s*$/gm)].map((match) => match[1]);
const duplicates = registered.filter((name, index) => registered.indexOf(name) !== index);
const missingDocs = registered.filter((name) => !documented.includes(name));
const staleDocs = documented.filter((name) => !registered.includes(name));

if (duplicates.length || missingDocs.length || staleDocs.length) {
  console.error("MCP tool documentation mismatch");
  if (duplicates.length) console.error(`Duplicate registrations: ${[...new Set(duplicates)].join(", ")}`);
  if (missingDocs.length) console.error(`Missing documentation: ${missingDocs.join(", ")}`);
  if (staleDocs.length) console.error(`Documented but unregistered: ${staleDocs.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`MCP tool docs match ${registered.length} registered tools.`);
}

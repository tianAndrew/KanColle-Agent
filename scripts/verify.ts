/**
 * verify.ts — build + test + structural acceptance checks.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  // Calling npm.ps1 from PowerShell fails on machines with the default
  // execution policy. npm.cmd is the portable Windows entry point.
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  execSync(`${executable} ${cmd}`, {
    stdio: "inherit",
    cwd: root,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}

const tools = [
  // Poi
  "poi_status",
  "poi_get_overview",
  "poi_query_ships",
  "poi_query_equipment",
  "poi_query_fleet_assets",
  "poi_get_fleets",
  "poi_get_quests",
  "poi_get_inventory",
  "poi_get_operations",
  // Data
  "kc_search",
  "kc_get",
  "kc_query",
  "kc_quest_graph",
  "kc_quest_progress",
  "kc_ship_remodel",
  "kc_equipment_rules",
  "kc_air_power",
  "kc_improvement",
  "kc_map_guide",
  "kc_data_status",
];

console.log("== KanColle Agent verify ==");

// structural
const files = [
  "packages/shared/src/refs.ts",
  "packages/shared/src/result.ts",
  "packages/shared/src/types.ts",
  "packages/kancolle-data-mcp/src/index.ts",
  "packages/kancolle-data-mcp/src/tools.ts",
  "packages/kancolle-data-mcp/src/improvement-tools.ts",
  "packages/kancolle-data-mcp/src/improvement-data.ts",
  "packages/poi-plugin-mcp/src/plugin.ts",
  "packages/poi-plugin-mcp/src/tools.ts",
  ".agents/skills/kancolle-main/SKILL.md",
  ".agents/skills/progression-planner/SKILL.md",
  "opencode.jsonc",
  "docs/MCP_TOOLS.md",
  "config/kancolle.json",
];
for (const f of files) {
  if (!existsSync(join(root, f))) {
    console.error(`STRUCT FAIL missing ${f}`);
    process.exit(1);
  }
}
console.log(`STRUCT OK: ${files.length} key files present`);
console.log(`TOOL CONTRACT: ${tools.length} MCP tools defined in design`);

run("run build");
run("run typecheck");
run("test");
run("run check:tool-docs");

console.log("\nVERIFY PASS");

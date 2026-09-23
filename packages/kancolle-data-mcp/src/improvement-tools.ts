import {
  dataAmbiguous,
  dataError,
  dataNotFound,
  dataOk,
  dataPartial,
  parseRef,
  type DataResult,
  type MasterEquipment,
  type MasterShip,
} from "@kancolle-agent/shared";
import type { MemoryIndex } from "./index-memory.js";
import type { ToolContext } from "./tools.js";
import { searchAll } from "./index-memory.js";
import { tokyoWeekday, type ImprovementRecord } from "./improvement-data.js";

type ResolverContext = { index: MemoryIndex };
export type ImprovementToolContext = Pick<ToolContext, "index" | "improvements">;

function exactKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function resolveExact<T extends MasterShip | MasterEquipment>(
  ctx: ResolverContext,
  input: string,
  kind: "ship" | "equipment",
): T | T[] | null {
  const parsed = parseRef(input);
  const table = kind === "ship" ? ctx.index.shipsById : ctx.index.equipmentById;
  if (parsed?.type === kind) return (table.get(Number(parsed.id)) as T | undefined) ?? null;
  if (/^\d+$/.test(input)) return (table.get(Number(input)) as T | undefined) ?? null;
  const names = kind === "ship" ? ctx.index.shipsByName : ctx.index.equipmentByName;
  const direct = (names.get(exactKey(input)) ?? []) as T[];
  if (direct.length === 1) return direct[0];
  if (direct.length > 1) return direct;
  const hits = searchAll(ctx.index, input, 10, [kind]).filter(hit => hit.score === 100);
  const matches = hits.map(hit => table.get(Number(hit.ref.split(":")[1]))).filter((value): value is T => Boolean(value));
  return matches.length === 1 ? matches[0] : matches.length ? matches : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function kcImprovement(
  ctx: ImprovementToolContext,
  args: {
    equipment?: string; equipment_ids?: number[]; assistant_ship?: string; owned_ship_ids?: number[];
    weekday?: number; date?: string; all_days?: boolean; include_costs?: boolean; limit?: number;
  },
): DataResult<unknown> {
  const dataset = ctx.improvements;
  if (!dataset) return dataPartial([], ["improvement_dataset"]);
  if (args.date && !isValidDate(args.date)) return dataError("invalid_date", "date must be a valid YYYY-MM-DD calendar date");
  if (args.all_days && (args.weekday !== undefined || args.date !== undefined)) {
    return dataError("conflicting_date_filters", "all_days cannot be combined with weekday or date");
  }
  if (args.date !== undefined && args.weekday !== undefined) {
    return dataError("conflicting_date_filters", "provide either date or weekday, not both");
  }

  let equipmentId: number | undefined;
  if (args.equipment) {
    const resolved = resolveExact<MasterEquipment>(ctx, args.equipment, "equipment");
    if (Array.isArray(resolved)) return dataAmbiguous(resolved.map(item => ({ ref: `equipment:${item.id}`, name: item.name, type: "equipment", score: 100 })));
    if (!resolved) return dataNotFound(["equipment"]);
    equipmentId = resolved.id;
  }
  let assistantShipId: number | undefined;
  if (args.assistant_ship) {
    const resolved = resolveExact<MasterShip>(ctx, args.assistant_ship, "ship");
    if (Array.isArray(resolved)) return dataAmbiguous(resolved.map(ship => ({ ref: `ship:${ship.id}`, name: ship.name, type: "ship", score: 100 })));
    if (!resolved) return dataNotFound(["assistant_ship"]);
    assistantShipId = resolved.id;
  }

  let weekday: number | null = null;
  try { weekday = args.all_days ? null : (args.weekday ?? tokyoWeekday(args.date)); }
  catch (error) { return dataError("invalid_date", error instanceof Error ? error.message : String(error)); }
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return dataError("invalid_weekday", "weekday must be 0 (Sunday) through 6 (Saturday)");
  }

  const equipmentIds = args.equipment_ids === undefined ? null : new Set(args.equipment_ids);
  const ownedShipIds = args.owned_ship_ids === undefined ? null : new Set(args.owned_ship_ids);
  let records = dataset.records.filter(record => {
    if (equipmentId !== undefined && record.equipment_id !== equipmentId) return false;
    if (equipmentIds && !equipmentIds.has(record.equipment_id)) return false;
    if (weekday !== null && !record.weekdays.includes(weekday)) return false;
    if (assistantShipId !== undefined && !record.assistant_ships.some(ship => ship.ship_id === assistantShipId)) return false;
    if (ownedShipIds && record.assistant_required && !record.assistant_ships.some(ship => ownedShipIds.has(ship.ship_id))) return false;
    return true;
  });
  const total = records.length;
  records = records.slice(0, Math.min(200, Math.max(1, args.limit ?? 50)));
  const canonicalEquipment = (id: number, sourceName: string) => {
    const item = ctx.index.equipmentById.get(id);
    return { ref: `equipment:${id}`, name: item?.name ?? sourceName, source_name: sourceName };
  };
  const canonicalShip = (id: number, sourceName: string) => {
    const ship = ctx.index.shipsById.get(id);
    return { ref: `ship:${id}`, name: ship?.name ?? sourceName, source_name: sourceName };
  };
  const stage = (value: ImprovementRecord["stages"]["low"]) => value ? {
    ...value,
    consumables: value.consumables.map(item => ({ ...canonicalEquipment(item.equipment_id, item.source_name), amount: item.amount })),
  } : null;
  const items = records.map(record => {
    const assistants = record.assistant_ships.map(ship => canonicalShip(ship.ship_id, ship.source_name));
    return {
      equipment: canonicalEquipment(record.equipment_id, record.source_name),
      upgrade_to: record.upgrade_to ? canonicalEquipment(record.upgrade_to.equipment_id, record.upgrade_to.source_name) : null,
      weekdays: record.weekdays,
      weekday_names: record.weekdays.map(day => dataset.meta.weekday_names[day]),
      assistant_required: record.assistant_required,
      assistant_ships: assistants,
      ...(ownedShipIds ? { usable_assistant_ships: assistants.filter(ship => ownedShipIds.has(Number(ship.ref.split(":")[1]))) } : {}),
      ...(args.include_costs === false ? {} : { resources: record.resources, stages: {
        low: stage(record.stages.low), high: stage(record.stages.high), upgrade: stage(record.stages.upgrade),
      } }),
    };
  });
  return dataOk({ total, returned: items.length, weekday,
    weekday_name: weekday === null ? null : dataset.meta.weekday_names[weekday],
    timezone: dataset.meta.timezone, source: dataset.meta.source, fetched_at: dataset.meta.fetched_at, items,
    notes: ["Assistant ships use exact master ship IDs and exact remodel forms.", "weekday uses Tokyo time: 0=Sunday through 6=Saturday."],
  });
}

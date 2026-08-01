import * as XLSX from "xlsx";
import { format, isValid, parse, parseISO } from "date-fns";

import { defaultLeadSourceId, resolveLeadSources } from "@/lib/pipeline/lead-sources";
import { resolveLeadStages } from "@/lib/pipeline/lead-stages";
import { getEmployeeFullName } from "@/lib/week";
import type {
  CompanySettings,
  Employee,
  LeadFormValues,
  LeadSource,
  LeadStatus,
} from "@/types";

/** Template / accepted column headers (first match wins). */
export const LEAD_IMPORT_FIELDS = [
  {
    key: "client_name",
    label: "Client",
    aliases: ["client", "client name", "company", "company name", "account"],
    required: true,
  },
  {
    key: "title",
    label: "Title",
    aliases: ["title", "project", "project name", "lead", "lead name", "opportunity"],
  },
  {
    key: "contact_name",
    label: "Contact",
    aliases: ["contact", "contact name", "name", "primary contact"],
  },
  {
    key: "contact_email",
    label: "Email",
    aliases: ["email", "contact email", "e-mail"],
  },
  {
    key: "contact_phone",
    label: "Phone",
    aliases: ["phone", "contact phone", "mobile", "cell"],
  },
  {
    key: "address",
    label: "Address",
    aliases: ["address", "site address", "job address", "location"],
  },
  {
    key: "source",
    label: "Source",
    aliases: ["source", "lead source", "origin"],
  },
  {
    key: "status",
    label: "Status",
    aliases: ["status", "stage", "pipeline stage"],
  },
  {
    key: "expected_value",
    label: "Expected value",
    aliases: ["expected value", "value", "amount", "estimate", "budget"],
  },
  {
    key: "probability",
    label: "Probability",
    aliases: ["probability", "prob", "win probability", "likelihood"],
  },
  {
    key: "next_follow_up_date",
    label: "Next follow-up",
    aliases: ["next follow-up", "follow up", "follow-up", "followup", "next follow up"],
  },
  {
    key: "created_date",
    label: "Created date",
    aliases: ["created date", "created", "created at", "date created", "lead date"],
  },
  {
    key: "owner",
    label: "Owner",
    aliases: ["owner", "owner name", "assigned to", "salesperson", "lead owner"],
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["notes", "note", "comments", "comment"],
  },
] as const;

export type LeadImportFieldKey = (typeof LEAD_IMPORT_FIELDS)[number]["key"];

export interface LeadImportRowResult {
  rowNumber: number;
  values?: LeadFormValues;
  error?: string;
  warnings: string[];
}

export interface LeadImportParseResult {
  rows: LeadImportRowResult[];
  validCount: number;
  errorCount: number;
  headersFound: string[];
  missingRequired: string[];
}

export interface LeadImportContext {
  settings: CompanySettings;
  employees: Employee[];
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date && isValid(value)) return format(value, "yyyy-MM-dd");
  return String(value).trim();
}

function parseAmount(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : undefined;
  }
  const cleaned = cellToString(value).replace(/[$,\s]/g, "");
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function parseProbability(value: unknown): number | undefined {
  const amount = parseAmount(value);
  if (amount == null) return undefined;
  const pct = amount > 1 && amount <= 100 ? amount : amount <= 1 ? amount * 100 : amount;
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return undefined;
  return Math.round(pct);
}

/** Excel serial date (days since 1899-12-30) or common string formats → yyyy-mm-dd. */
export function parseImportDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;

  if (value instanceof Date && isValid(value)) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // SheetJS may leave Excel serials as numbers.
    const parseDateCode = XLSX.SSF?.parse_date_code;
    if (typeof parseDateCode === "function") {
      const parsed = parseDateCode(value);
      if (parsed) {
        const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        if (isValid(date)) return format(date, "yyyy-MM-dd");
      }
    }
  }

  const raw = cellToString(value);
  if (!raw) return undefined;

  const isoAttempt = parseISO(raw.length === 10 ? `${raw}T12:00:00` : raw);
  if (isValid(isoAttempt) && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return format(isoAttempt, "yyyy-MM-dd");
  }

  for (const pattern of ["M/d/yyyy", "MM/dd/yyyy", "M-d-yyyy", "MM-dd-yyyy", "d/M/yyyy", "yyyy/MM/dd"]) {
    const parsed = parse(raw, pattern, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }

  return undefined;
}

function mapColumnIndexes(headers: string[]): {
  map: Partial<Record<LeadImportFieldKey, number>>;
  missingRequired: string[];
} {
  const normalized = headers.map(normalizeHeader);
  const map: Partial<Record<LeadImportFieldKey, number>> = {};

  for (const field of LEAD_IMPORT_FIELDS) {
    const aliases = [field.label, ...field.aliases].map(normalizeHeader);
    const index = normalized.findIndex((header) => aliases.includes(header));
    if (index >= 0) map[field.key] = index;
  }

  const missingRequired = LEAD_IMPORT_FIELDS.filter(
    (field) => "required" in field && field.required && map[field.key] == null,
  ).map((field) => field.label);

  return { map, missingRequired };
}

function resolveSource(
  raw: string,
  settings: CompanySettings,
): { value: LeadSource; warning?: string } {
  const sources = resolveLeadSources(settings);
  const fallback = defaultLeadSourceId(settings) as LeadSource;
  if (!raw.trim()) return { value: fallback };

  const needle = raw.trim().toLowerCase();
  const byId = sources.find((s) => s.id.toLowerCase() === needle);
  if (byId) return { value: byId.id as LeadSource };
  const byLabel = sources.find((s) => s.label.toLowerCase() === needle);
  if (byLabel) return { value: byLabel.id as LeadSource };

  return {
    value: fallback,
    warning: `Unknown source “${raw}” — used ${sources.find((s) => s.id === fallback)?.label ?? fallback}.`,
  };
}

function resolveStatus(
  raw: string,
  settings: CompanySettings,
): { value: LeadStatus; warning?: string } {
  const stages = resolveLeadStages(settings);
  const fallback = (stages.find((s) => s.kind === "open")?.id ?? stages[0]?.id ?? "new") as LeadStatus;
  if (!raw.trim()) return { value: fallback };

  const needle = raw.trim().toLowerCase();
  const byId = stages.find((s) => s.id.toLowerCase() === needle);
  if (byId) return { value: byId.id as LeadStatus };
  const byLabel = stages.find((s) => s.label.toLowerCase() === needle);
  if (byLabel) return { value: byLabel.id as LeadStatus };

  return {
    value: fallback,
    warning: `Unknown status “${raw}” — used ${stages.find((s) => s.id === fallback)?.label ?? fallback}.`,
  };
}

function resolveOwner(
  raw: string,
  employees: Employee[],
): { value?: string; warning?: string } {
  if (!raw.trim()) return {};
  const needle = raw.trim().toLowerCase();
  const active = employees.filter((e) => e.active);

  const byEmail = active.find((e) => e.email?.trim().toLowerCase() === needle);
  if (byEmail) return { value: byEmail.id };

  const byName = active.find((e) => getEmployeeFullName(e).toLowerCase() === needle);
  if (byName) return { value: byName.id };

  const partial = active.filter((e) => getEmployeeFullName(e).toLowerCase().includes(needle));
  if (partial.length === 1) return { value: partial[0]!.id };

  return { warning: `Owner “${raw}” not matched — left unassigned.` };
}

function getCell(row: unknown[], index: number | undefined): unknown {
  if (index == null) return undefined;
  return row[index];
}

/**
 * Parse the first sheet of an Excel/CSV workbook into lead form values.
 */
export function parseLeadImportWorkbook(
  data: ArrayBuffer,
  context: LeadImportContext,
): LeadImportParseResult {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      validCount: 0,
      errorCount: 1,
      headersFound: [],
      missingRequired: ["Client"],
    };
  }

  const sheet = workbook.Sheets[sheetName]!;
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (matrix.length === 0) {
    return {
      rows: [],
      validCount: 0,
      errorCount: 0,
      headersFound: [],
      missingRequired: ["Client"],
    };
  }

  const headerRow = (matrix[0] ?? []).map((cell) => cellToString(cell));
  const { map, missingRequired } = mapColumnIndexes(headerRow);
  const headersFound = headerRow.filter(Boolean);

  if (missingRequired.length > 0) {
    return {
      rows: [
        {
          rowNumber: 1,
          error: `Missing required column(s): ${missingRequired.join(", ")}. Download the template for the expected headers.`,
          warnings: [],
        },
      ],
      validCount: 0,
      errorCount: 1,
      headersFound,
      missingRequired,
    };
  }

  const rows: LeadImportRowResult[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (let i = 1; i < matrix.length; i++) {
    const rawRow = matrix[i] ?? [];
    const rowNumber = i + 1;
    const warnings: string[] = [];

    const isBlank = rawRow.every((cell) => cellToString(cell) === "");
    if (isBlank) continue;

    const clientName = cellToString(getCell(rawRow, map.client_name));
    if (!clientName) {
      errorCount += 1;
      rows.push({
        rowNumber,
        error: "Client is required.",
        warnings,
      });
      continue;
    }

    const sourceResult = resolveSource(cellToString(getCell(rawRow, map.source)), context.settings);
    if (sourceResult.warning) warnings.push(sourceResult.warning);

    const statusResult = resolveStatus(cellToString(getCell(rawRow, map.status)), context.settings);
    if (statusResult.warning) warnings.push(statusResult.warning);

    const ownerResult = resolveOwner(cellToString(getCell(rawRow, map.owner)), context.employees);
    if (ownerResult.warning) warnings.push(ownerResult.warning);

    const followUpRaw = getCell(rawRow, map.next_follow_up_date);
    const createdRaw = getCell(rawRow, map.created_date);
    const followUp = parseImportDate(followUpRaw);
    const created = parseImportDate(createdRaw);
    if (cellToString(followUpRaw) && !followUp) {
      warnings.push(`Could not parse follow-up date “${cellToString(followUpRaw)}”.`);
    }
    if (cellToString(createdRaw) && !created) {
      warnings.push(`Could not parse created date “${cellToString(createdRaw)}”.`);
    }

    const values: LeadFormValues = {
      client_name: clientName,
      title: cellToString(getCell(rawRow, map.title)) || undefined,
      contact_name: cellToString(getCell(rawRow, map.contact_name)) || undefined,
      contact_email: cellToString(getCell(rawRow, map.contact_email)) || undefined,
      contact_phone: cellToString(getCell(rawRow, map.contact_phone)) || undefined,
      address: cellToString(getCell(rawRow, map.address)) || undefined,
      source: sourceResult.value,
      status: statusResult.value,
      expected_value: parseAmount(getCell(rawRow, map.expected_value)),
      probability: parseProbability(getCell(rawRow, map.probability)),
      next_follow_up_date: followUp,
      created_date: created,
      owner_employee_id: ownerResult.value,
      notes: cellToString(getCell(rawRow, map.notes)) || undefined,
    };

    validCount += 1;
    rows.push({ rowNumber, values, warnings });
  }

  return { rows, validCount, errorCount, headersFound, missingRequired: [] };
}

/** Build a downloadable .xlsx template with the expected headers and one example row. */
export function buildLeadImportTemplateWorkbook(settings: CompanySettings): ArrayBuffer {
  const headers = LEAD_IMPORT_FIELDS.map((field) => field.label);
  const sources = resolveLeadSources(settings);
  const stages = resolveLeadStages(settings);
  const example = [
    "Acme Landscapes",
    "Backyard renovation",
    "Jane Smith",
    "jane@acme.com",
    "555-0100",
    "123 Main St",
    sources[0]?.label ?? "Referral",
    stages.find((s) => s.kind === "open")?.label ?? "New",
    85000,
    50,
    format(new Date(), "yyyy-MM-dd"),
    format(new Date(), "yyyy-MM-dd"),
    "",
    "Imported from spreadsheet",
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function downloadLeadImportTemplate(settings: CompanySettings): void {
  const buffer = buildLeadImportTemplateWorkbook(settings);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lead-import-template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

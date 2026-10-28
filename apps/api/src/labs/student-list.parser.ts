
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import path from "node:path";

export type StudentListParseResult = {
  emails: string[];
  invalidRows: Array<{
    row: number;
    reason: string;
  }>;
};

const EMAIL_PATTERN = /^[^\s@]+@mitsgwl\.ac\.in$/i;

export function normalizeStudentEmail(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const email = String(value).trim().toLowerCase();

  return EMAIL_PATTERN.test(email) ? email : null;
}

function parseRows(rows: unknown[][]): StudentListParseResult {
  const emails: string[] = [];
  const invalidRows: StudentListParseResult["invalidRows"] = [];
  const seen = new Set<string>();

  if (rows.length === 0) {
    return {
      emails,
      invalidRows: [{ row: 1, reason: "File contains no rows" }],
    };
  }

  // Accept either an "email" header or a simple one-column list.
  const firstCell = String(rows[0]?.[0] ?? "").trim().toLowerCase();
  const hasHeader = firstCell === "email" || firstCell === "student email";
  const startIndex = hasHeader ? 1 : 0;

  for (let index = startIndex; index < rows.length; index++) {
    const rowNumber = index + 1;
    const row = rows[index] ?? [];
    const emailValue = row[0];

    if (row.every((cell) => String(cell ?? "").trim() === "")) {
      continue;
    }

    if (row.length > 1 && row.slice(1).some(
      (cell) => String(cell ?? "").trim() !== ""
    )) {
      invalidRows.push({
        row: rowNumber,
        reason: "Each row must contain only one email address",
      });
      continue;
    }

    const email = normalizeStudentEmail(emailValue);

    if (!email) {
      invalidRows.push({
        row: rowNumber,
        reason: "Use a college email ID ending in @mitsgwl.ac.in",
      });
      continue;
    }

    if (seen.has(email)) {
      invalidRows.push({
        row: rowNumber,
        reason: "Duplicate email in file",
      });
      continue;
    }

    seen.add(email);
    emails.push(email);
  }

  return { emails, invalidRows };
}

export async function parseStudentList(
  buffer: Buffer,
  originalFilename: string
): Promise<StudentListParseResult> {
  const extension = path.extname(originalFilename).toLowerCase();

  if (extension === ".csv") {
    const records = parse(buffer, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as unknown[][];

    return parseRows(records);
  }

  if (extension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();

    const excelBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    await workbook.xlsx.load(excelBuffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return {
        emails: [],
        invalidRows: [{ row: 1, reason: "Workbook contains no worksheets" }],
      };
    }

    const rows: unknown[][] = [];

    worksheet.eachRow({ includeEmpty: true }, (row) => {
        const emailValue = row.getCell(1).value;

        rows.push([
            typeof emailValue === "object" && emailValue !== null && "text" in emailValue
            ? String(emailValue.text)
            : emailValue,

            ]);
        });

    return parseRows(rows);
  }

  throw new Error("Only CSV and XLSX files are supported");
}

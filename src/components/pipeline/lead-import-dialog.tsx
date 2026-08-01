"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import {
  downloadLeadImportTemplate,
  parseLeadImportWorkbook,
  type LeadImportParseResult,
} from "@/lib/pipeline/lead-import";
import { formatProjectAmount } from "@/lib/project-format";
import { cn } from "@/lib/utils";

interface LeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadImportDialog({ open, onOpenChange }: LeadImportDialogProps) {
  const { settings, employees, addLead } = useScheduling();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<LeadImportParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setParseError(null);
    setImporting(false);
    setImportMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File | null) => {
    setImportMessage(null);
    setParseError(null);
    setParsed(null);
    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseLeadImportWorkbook(buffer, { settings, employees });
      setParsed(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that file.");
    }
  };

  const handleImport = () => {
    if (!parsed || parsed.validCount === 0) return;
    setImporting(true);
    setImportMessage(null);

    let imported = 0;
    for (const row of parsed.rows) {
      if (!row.values) continue;
      addLead(row.values);
      imported += 1;
    }

    setImporting(false);
    setImportMessage(`Imported ${imported} lead${imported === 1 ? "" : "s"}.`);
    setTimeout(() => handleOpenChange(false), 700);
  };

  const previewRows = parsed?.rows.filter((row) => row.values).slice(0, 8) ?? [];
  const errorRows = parsed?.rows.filter((row) => row.error) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx). The first sheet should include a Client column. Download
            the template for the full list of supported headers.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadLeadImportTemplate(settings)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {fileName ? (
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              {fileName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No file selected yet.</p>
          )}

          {parseError ? <p className="text-sm text-red-600">{parseError}</p> : null}

          {parsed ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                  {parsed.validCount} ready
                </span>
                {parsed.errorCount > 0 ? (
                  <span className="rounded-md bg-red-50 px-2 py-1 text-red-800">
                    {parsed.errorCount} with errors
                  </span>
                ) : null}
              </div>

              {errorRows.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-800">
                  {errorRows.slice(0, 6).map((row) => (
                    <li key={row.rowNumber}>
                      Row {row.rowNumber}: {row.error}
                    </li>
                  ))}
                  {errorRows.length > 6 ? (
                    <li>…and {errorRows.length - 6} more</li>
                  ) : null}
                </ul>
              ) : null}

              {previewRows.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Row</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.values?.title?.trim() || row.values?.client_name}
                            {row.values?.title?.trim() ? (
                              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                {row.values.client_name}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>{row.values?.contact_name || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatProjectAmount(row.values?.expected_value)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "max-w-[180px] truncate text-xs",
                              row.warnings.length > 0 ? "text-amber-800" : "text-muted-foreground",
                            )}
                            title={row.warnings.join(" ")}
                          >
                            {row.warnings.length > 0 ? row.warnings[0] : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsed.validCount > previewRows.length ? (
                    <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Showing {previewRows.length} of {parsed.validCount} valid rows.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {importMessage ? (
            <p className="text-sm text-emerald-800">{importMessage}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!parsed || parsed.validCount === 0 || importing}
            onClick={handleImport}
          >
            {importing
              ? "Importing…"
              : parsed?.validCount
                ? `Import ${parsed.validCount} lead${parsed.validCount === 1 ? "" : "s"}`
                : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

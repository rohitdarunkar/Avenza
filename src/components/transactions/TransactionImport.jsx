import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import "../../pages/transaction-import.css";

const MAX_IMPORT_ROWS = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return normalizedAliases.some((alias) =>
      normalized === alias ||
      (alias.length >= 6 && normalized.startsWith(alias)) ||
      (alias.length >= 7 && normalized.includes(alias))
    );
  });
}

function formatDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const candidate = new Date(y, m - 1, d);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) ||
      candidate.getFullYear() !== y || candidate.getMonth() !== m - 1 || candidate.getDate() !== d) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = XLSX.SSF.parse_date_code(value);
    return date ? formatDateParts(date.y, date.m, date.d) : "";
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s|$)/);
  if (iso) return formatDateParts(iso[1], iso[2], iso[3]);

  const numericDate = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s|$)/);
  if (numericDate) {
    const first = Number(numericDate[1]);
    const second = Number(numericDate[2]);
    const year = numericDate[3].length === 2 ? `20${numericDate[3]}` : numericDate[3];
    // Prefer Indian DD/MM/YYYY, but recognize unambiguous MM/DD/YYYY dates.
    let day = first;
    let month = second;
    if (first <= 12 && second > 12) {
      month = first;
      day = second;
    }
    return formatDateParts(year, month, day);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let text = String(value ?? "").trim();
  if (!text) return NaN;
  const negativeByBrackets = /^\(.*\)$/.test(text);
  text = text.replace(/[₹$€£,\s]/g, "").replace(/\((.*)\)/, "$1").replace(/(?:DR|CR)$/i, "");
  const amount = Number(text);
  if (!Number.isFinite(amount)) return NaN;
  return negativeByBrackets ? -Math.abs(amount) : amount;
}

function mapRows(rawRows) {
  if (!rawRows.length || rawRows.length < 2) {
    throw new Error("The file must contain a header row and at least one transaction.");
  }

  const headers = rawRows[0].map((header) => String(header ?? "").trim());
  const dateCol = findColumn(headers, [
    "date", "transactiondate", "transactiondt", "txndate", "valuedate",
    "posteddate", "postingdate", "bookingdate", "transdate",
  ]);
  const nameCol = findColumn(headers, [
    "name", "description", "details", "transactiondetails", "transactiondescription",
    "narration", "merchant", "payee", "particulars", "remarks", "remark",
    "transactionremarks", "beneficiary", "transactionparticulars",
  ]);
  const amountCol = findColumn(headers, [
    "amount", "transactionamount", "txnamount", "value", "total",
    "debitcreditamount", "withdrawaldepositamount",
  ]);
  const debitCol = findColumn(headers, [
    "debit", "debitamount", "withdrawal", "withdrawals", "withdrawalamount",
    "paidout", "moneyout", "amountdebited", "dramount", "debitinr",
  ]);
  const creditCol = findColumn(headers, [
    "credit", "creditamount", "deposit", "deposits", "depositamount",
    "paidin", "moneyin", "amountcredited", "cramount", "creditinr",
  ]);
  const typeCol = findColumn(headers, [
    "type", "transactiontype", "drcr", "debitcredit", "transactionindicator", "transactionmode",
  ]);
  const categoryCol = findColumn(headers, [
    "category", "expensecategory", "typecategory", "transactioncategory",
  ]);
  const notesCol = findColumn(headers, [
    "notes", "note", "memo", "reference", "refno", "referenceno",
    "chequeno", "checkno", "utr", "utrno", "transactionid",
  ]);

  if (dateCol < 0 || nameCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
    throw new Error("I couldn't identify the required columns. Include Date/Transaction Date, Description/Narration/Particulars, and Amount—or separate Debit and Credit columns.");
  }

  const valid = [];
  const invalid = [];
  rawRows.slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .forEach((row, index) => {
      const date = parseDate(row[dateCol]);
      const name = String(row[nameCol] ?? "").trim();
      const debit = debitCol >= 0 ? parseAmount(row[debitCol]) : NaN;
      const credit = creditCol >= 0 ? parseAmount(row[creditCol]) : NaN;
      const rawAmount = amountCol >= 0 ? parseAmount(row[amountCol]) : NaN;
      const typeText = typeCol >= 0 ? String(row[typeCol] ?? "").trim().toLowerCase() : "";
      const amountText = amountCol >= 0 ? String(row[amountCol] ?? "").trim().toLowerCase() : "";
      const directionText = `${typeText} ${amountText}`;
      let amount;
      let type;

      if (creditCol >= 0 && Number.isFinite(credit) && credit !== 0) {
        amount = Math.abs(credit);
        type = "income";
      } else if (debitCol >= 0 && Number.isFinite(debit) && debit !== 0) {
        amount = Math.abs(debit);
        type = "expense";
      } else if (Number.isFinite(rawAmount)) {
        amount = Math.abs(rawAmount);
        type = /\b(income|credit|deposit|salary|refund|received|paid\s*in|cr)\b/.test(directionText)
          ? "income"
          : "expense";
      }

      if (!name || !date || !Number.isFinite(amount) || amount <= 0 || !type) {
        invalid.push({ rowNumber: index + 2, reason: "Missing description/date or invalid amount." });
        return;
      }

      const suppliedCategory = categoryCol >= 0 ? String(row[categoryCol] ?? "").trim() : "";
      const category = suppliedCategory || (type === "income" ? "Income" : "Other");
      valid.push({
        name: name.slice(0, 160),
        amount,
        type,
        category: category.slice(0, 80),
        date,
        notes: notesCol >= 0 ? String(row[notesCol] ?? "").trim().slice(0, 500) : "",
        sourceRow: index + 2,
      });
    });

  if (!valid.length) throw new Error("No valid transactions were found. Check the column names and date/amount values.");
  if (valid.length > MAX_IMPORT_ROWS) {
    throw new Error(`This file contains ${valid.length} valid transactions. Please split it into files with no more than ${MAX_IMPORT_ROWS} transactions each, then import each file separately.`);
  }
  return { transactions: valid, invalid, totalRows: valid.length };
}

function transactionKey(row) {
  return [
    String(row.name || row.description || "").trim().toLowerCase(),
    Number(row.amount),
    String(row.date || "").slice(0, 10),
    row.type === "income" ? "income" : "expense",
  ].join("|");
}

function isDuplicate(row, existing) {
  const key = transactionKey(row);
  return existing.some((item) => transactionKey(item) === key);
}

function getInFileDuplicateRows(rows) {
  const seen = new Set();
  const duplicateRows = new Set();
  rows.forEach((row) => {
    const key = transactionKey(row);
    if (seen.has(key)) duplicateRows.add(row.sourceRow);
    else seen.add(key);
  });
  return duplicateRows;
}

export default function TransactionImport({ transactions = [], onImport, onBack }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const inFileDuplicateRows = useMemo(() => getInFileDuplicateRows(rows), [rows]);
  const existingDuplicateKeys = useMemo(
    () => new Set(rows.filter((row) => isDuplicate(row, transactions)).map(transactionKey)),
    [rows, transactions]
  );
  const duplicatesCount = existingDuplicateKeys.size + inFileDuplicateRows.size;
  const readyRows = rows.filter((row) =>
    !skipDuplicates || (!existingDuplicateKeys.has(transactionKey(row)) &&
      !inFileDuplicateRows.has(row.sourceRow))
  );

  const loadFile = async (file) => {
    setError("");
    setSuccess("");
    setRows([]);
    setInvalidRows([]);
    setFileName("");
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(extension)) {
      setError("Please choose a CSV or Excel file (.csv, .xlsx, .xls). PDF bank statements and scanned images aren't supported yet.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("This file is larger than 10 MB. Please choose a smaller file.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("No worksheet was found in this file.");
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: "" });
      const parsed = mapRows(rawRows);
      setRows(parsed.transactions);
      setInvalidRows(parsed.invalid);
      setFileName(file.name);
    } catch (parseError) {
      setError(parseError?.message || "Couldn't read this file. Please check its format and try again.");
    }
  };

  const submitImport = async () => {
    if (!readyRows.length) {
      setError("There are no new transactions to import after duplicate checking.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await onImport(readyRows.map(({ sourceRow, ...row }) => row));
      const importedCount = result ?? readyRows.length;
      setSuccess(`Successfully imported ${importedCount} transaction${importedCount === 1 ? "" : "s"}.`);
      setRows([]);
      setInvalidRows([]);
      setFileName("");
    } catch (importError) {
      setError(importError?.message || "Import failed. No transactions were confirmed as imported. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="avimport-page">
      <div className="avimport-header">
        <div>
          <span className="avimport-eyebrow">AVENZA WORKSPACE</span>
          <h1>Import transactions</h1>
          <p>Bring in your existing financial activity and review it before saving.</p>
        </div>
        {onBack && <button className="avimport-back" type="button" onClick={onBack}>Back to overview</button>}
      </div>

      <div className="avimport-security">
        <CheckCircle2 size={18} />
        <span>Your import is saved only to your signed-in Avenza account. Review the preview before confirming.</span>
      </div>

      <section
        className={`avimport-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files?.[0]); }}
      >
        <div className="avimport-upload-icon"><Upload size={24} /></div>
        <h2>Choose a CSV or Excel file</h2>
        <p>Supported: .csv, .xlsx and .xls · Up to 10 MB · Up to 100 transactions per import</p>
        <label className="avimport-select">
          <FileSpreadsheet size={17} /> Select file
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(event) => { loadFile(event.target.files?.[0]); event.target.value = ""; }}
          />
        </label>
        <span className="avimport-drop-hint">or drag and drop your file here</span>
      </section>

      {error && (
        <div className="avimport-alert error" role="alert">
          <AlertCircle size={18} /><span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      {success && <div className="avimport-alert success" role="status"><CheckCircle2 size={18} /><span>{success}</span></div>}

      {fileName && rows.length > 0 && (
        <section className="avimport-preview">
          <div className="avimport-preview-heading">
            <div><h2>Review import</h2><p>{fileName}</p></div>
            <span>{rows.length} rows ready</span>
          </div>
          <label className="avimport-duplicate-toggle">
            <input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} />
            Skip matching transactions already saved or repeated within this file
            <strong>{duplicatesCount} possible duplicate{duplicatesCount === 1 ? "" : "s"}</strong>
          </label>
          {invalidRows.length > 0 && <p className="avimport-warning">Skipped {invalidRows.length} invalid row{invalidRows.length === 1 ? "" : "s"} while reading the file.</p>}
          <div className="avimport-table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const duplicate = existingDuplicateKeys.has(transactionKey(row)) ||
                    inFileDuplicateRows.has(row.sourceRow);
                  return (
                    <tr key={`${row.sourceRow}-${row.name}-${row.date}`}>
                      <td>{row.date}</td><td>{row.name}</td><td>{row.category}</td>
                      <td><span className={`avimport-type ${row.type}`}>{row.type}</span></td>
                      <td>₹{row.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td>{duplicate ? <span className="avimport-duplicate">Possible duplicate</span> : <span className="avimport-valid">Ready</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="avimport-footer">
            <span>{readyRows.length} transaction{readyRows.length === 1 ? "" : "s"} will be saved</span>
            <button type="button" className="avimport-confirm" onClick={submitImport} disabled={busy || readyRows.length === 0}>
              {busy ? "Importing…" : `Import ${readyRows.length} transaction${readyRows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      )}

      <div className="avimport-help">
        <strong>Column tips</strong>
        <p>
          Use a header row with Date/Transaction Date, Description/Narration/Particulars and Amount.
          Separate Debit and Credit columns are also supported. Optional columns include Category,
          Type and Notes. Indian DD/MM/YYYY dates and common ISO dates are supported.
        </p>
      </div>
    </main>
  );
}
 
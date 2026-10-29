import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Save, Copy, Trash2, Sheet, X, FileSpreadsheet, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import "./spreadsheet-workspace.css";

const makeSheet = (name = "Sheet1", headers = ["Column A", "Column B", "Column C"], rows = []) => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  name,
  headers,
  rows,
});
const makeWorkbook = (name, sheets) => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, sheets, activeSheetId: sheets[0]?.id, updatedAt: new Date().toISOString() });
const safeName = (value) => String(value || "Untitled").replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";

export default function SpreadsheetWorkspace({ user = null, onBack }) {
  const storageKey = `avenza-spreadsheets-v1-${user?.uid || "guest"}`;
  const [workbooks, setWorkbooks] = useState([]);
  const [activeWorkbookId, setActiveWorkbookId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [mergeTarget, setMergeTarget] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [mergeMapping, setMergeMapping] = useState({});
  const fileRef = useRef(null);
  const columnMenuRef = useRef(null);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [expanded, setExpanded] = useState(false);
  
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  useEffect(() => {
    if (!showColumnMenu) return undefined;
    const handleOutsidePointerDown = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setShowColumnMenu(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showColumnMenu]);

  useEffect(() => {
    if (!expanded) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved) && saved.length) {
        setWorkbooks(saved);
        setActiveWorkbookId(saved[0].id);
      } else {
        const initial = makeWorkbook("My spreadsheet", [makeSheet()]);
        setWorkbooks([initial]);
        setActiveWorkbookId(initial.id);
      }
    } catch {
      const initial = makeWorkbook("My spreadsheet", [makeSheet()]);
      setWorkbooks([initial]); setActiveWorkbookId(initial.id);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const savedView = JSON.parse(localStorage.getItem(`${storageKey}-view`) || "{}");
      setColumnWidths(savedView.columnWidths || {});
      setRowHeights(savedView.rowHeights || {});
      setHiddenColumns(savedView.hiddenColumns || {});
    } catch {
      setColumnWidths({});
      setRowHeights({});
      setHiddenColumns({});
    }
  }, [storageKey]);

  const activeWorkbook = workbooks.find((book) => book.id === activeWorkbookId) || null;
  const activeSheet = activeWorkbook?.sheets.find((sheet) => sheet.id === activeWorkbook.activeSheetId) || activeWorkbook?.sheets[0] || null;
  const hiddenForActiveSheet = activeSheet ? (hiddenColumns[activeSheet.id] || []) : [];
  const visibleColumnIndexes = activeSheet ? activeSheet.headers.map((_, index) => index).filter((index) => !hiddenForActiveSheet.includes(index)) : [];
  const updateWorkbook = (updater) => {
    setWorkbooks((prev) => prev.map((book) => book.id === activeWorkbookId ? { ...updater(book), updatedAt: new Date().toISOString() } : book));
    setDirty(true); setMessage("Unsaved changes");
  };
  const updateSheet = (updater) => updateWorkbook((book) => ({ ...book, sheets: book.sheets.map((sheet) => sheet.id === activeSheet?.id ? updater(sheet) : sheet) }));
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(workbooks)); localStorage.setItem(`${storageKey}-view`, JSON.stringify({ columnWidths, rowHeights, hiddenColumns })); setDirty(false); setMessage("Workbook and display preferences saved in this browser"); }
    catch { setMessage("Could not save locally. Export a copy to keep your changes."); }
  };
  const newWorkbook = () => {
    if (dirty && !window.confirm("You have unsaved changes. Create a workbook anyway?")) return;
    const book = makeWorkbook("Untitled workbook", [makeSheet()]);
    setWorkbooks((prev) => [book, ...prev]); setActiveWorkbookId(book.id); setDirty(false); setMessage("New workbook created");
  };
  const readFile = async (file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
      const sheets = parsed.SheetNames.map((sheetName) => {
        const matrix = XLSX.utils.sheet_to_json(parsed.Sheets[sheetName], { header: 1, defval: "", raw: false, blankrows: true });
        const width = Math.max(1, ...matrix.map((row) => row.length));
        const headersRaw = (matrix[0] || []).slice();
        while (headersRaw.length < width) headersRaw.push("");
        const headers = headersRaw.map((h, i) => String(h ?? "").trim() || `Column ${i + 1}`);
        const rows = matrix.slice(1).map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""));
        return makeSheet(sheetName, headers, rows);
      });
      const imported = makeWorkbook(file.name.replace(/\.(xlsx?|csv)$/i, ""), sheets.length ? sheets : [makeSheet()]);
      // Always ask how to import. The user can choose a new workbook or merge
      // into any currently open workbook; never silently import over the current sheet.
      setPendingImport(imported);
      setMergeTarget("choose");
      setMergeMapping({ target: activeWorkbook?.id || workbooks[0]?.id || "" });
    } catch (error) { setMessage(`Could not read file: ${error?.message || "unsupported format"}`); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const appendAsNew = () => {
    if (!pendingImport) return;
    setWorkbooks((prev) => [pendingImport, ...prev]); setActiveWorkbookId(pendingImport.id); setPendingImport(null); setMergeTarget(null); setDirty(true); setMessage("Imported as a new workbook. Save to keep it in this browser.");
  };
  const mergeInto = (targetId) => {
    if (!pendingImport || !targetId) return;
    const sourceSheet = pendingImport.sheets[0];
    setWorkbooks((prev) => prev.map((book) => {
      if (book.id !== targetId) return book;
      const targetSheet = book.sheets.find((s) => s.id === book.activeSheetId) || book.sheets[0];
      const headers = [...targetSheet.headers];
      sourceSheet.headers.forEach((h) => { if (!headers.includes(h)) headers.push(h); });
      const targetRows = targetSheet.rows.map((row) => headers.map((h) => { const oldIndex = targetSheet.headers.indexOf(h); return oldIndex >= 0 ? row[oldIndex] ?? "" : ""; }));
      const sourceRows = sourceSheet.rows.map((row) => headers.map((h) => { const oldIndex = sourceSheet.headers.indexOf(h); return oldIndex >= 0 ? row[oldIndex] ?? "" : ""; }));
      return { ...book, sheets: book.sheets.map((s) => s.id === targetSheet.id ? { ...s, headers, rows: [...targetRows, ...sourceRows] } : s), updatedAt: new Date().toISOString() };
    }));
    setActiveWorkbookId(targetId); setPendingImport(null); setMergeTarget(null); setDirty(true); setMessage("Rows merged into the selected sheet. Review and save the workbook.");
  };
  const addRow = () => updateSheet((s) => ({ ...s, rows: [...s.rows, Array(s.headers.length).fill("")] }));
  const addColumn = () => updateSheet((s) => ({ ...s, headers: [...s.headers, `Column ${s.headers.length + 1}`], rows: s.rows.map((row) => [...row, ""]) }));
  const deleteRow = (index) => updateSheet((s) => ({ ...s, rows: s.rows.filter((_, i) => i !== index) }));
  const deleteColumn = (index) => {
    if (!activeSheet || activeSheet.headers.length <= 1) { setMessage("A sheet must keep at least one column."); return; }
    updateSheet((s) => ({ ...s, headers: s.headers.filter((_, i) => i !== index), rows: s.rows.map((r) => r.filter((_, i) => i !== index)) }));
  };
  const toggleColumnVisibility = (columnIndex) => {
    if (!activeSheet) return;
    const current = hiddenColumns[activeSheet.id] || [];
    const next = current.includes(columnIndex) ? current.filter((index) => index !== columnIndex) : [...current, columnIndex];
    // Keep at least one column visible so the worksheet remains usable.
    if (next.length >= activeSheet.headers.length) {
      setMessage("At least one column must remain visible.");
      return;
    }
    setHiddenColumns((previous) => ({ ...previous, [activeSheet.id]: next }));
    setDirty(true);
    setMessage("Column visibility changed. Save to keep this preference.");
  };
  const showAllColumns = () => {
    if (!activeSheet) return;
    setHiddenColumns((previous) => ({ ...previous, [activeSheet.id]: [] }));
    setDirty(true);
    setMessage("All columns are visible. Save to keep this preference.");
  };

  const exportFile = (format) => {
    if (!activeWorkbook) return;
    const wb = XLSX.utils.book_new();
    activeWorkbook.sheets.forEach((s) => {
      const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]);
      XLSX.utils.book_append_sheet(wb, ws, safeName(s.name).slice(0, 31) || "Sheet1");
    });
    const base = safeName(activeWorkbook.name);
    if (format === "json") {
      const blob = new Blob([JSON.stringify(activeWorkbook, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${base}.json`; a.click(); URL.revokeObjectURL(url);
    } else if (format === "csv") {
      const ws = XLSX.utils.aoa_to_sheet([activeSheet.headers, ...activeSheet.rows]);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${base}-${safeName(activeSheet.name)}.csv`; a.click(); URL.revokeObjectURL(url);
    } else XLSX.writeFile(wb, `${base}.xlsx`);
    setMessage(format === "csv" ? "Downloaded active sheet as CSV" : `Downloaded workbook as ${format.toUpperCase()}`);
  };
  const addSheet = () => {
    const sheet = makeSheet(`Sheet${(activeWorkbook?.sheets.length || 0) + 1}`);
    updateWorkbook((book) => ({ ...book, sheets: [...book.sheets, sheet], activeSheetId: sheet.id }));
  };
  const renameSheet = (sheet) => {
    const name = window.prompt("Worksheet name", sheet.name);
    if (!name?.trim()) return;
    updateWorkbook((book) => ({ ...book, sheets: book.sheets.map((s) => s.id === sheet.id ? { ...s, name: name.trim().slice(0, 31) } : s) }));
  };
  const renameWorkbook = () => {
    const name = window.prompt("Workbook name", activeWorkbook?.name || "Untitled workbook");
    if (name?.trim()) updateWorkbook((book) => ({ ...book, name: name.trim() }));
  };
  const setCell = (rowIndex, colIndex, value) => updateSheet((s) => ({ ...s, rows: s.rows.map((row, i) => i === rowIndex ? row.map((cell, j) => j === colIndex ? value : cell) : row) }));
  const setHeader = (index, value) => updateSheet((s) => ({ ...s, headers: s.headers.map((h, i) => i === index ? value : h) }));

  if (!activeWorkbook || !activeSheet) return <main className={`sheet-workspace${expanded ? " sheet-workspace-expanded" : ""}`}><p>Loading spreadsheet workspace…</p></main>;
  return <main className={`sheet-workspace${expanded ? " sheet-workspace-expanded" : ""}`}>
    <header className="sheet-topbar"><div className="sheet-brand"><span className="sheet-brand-icon"><FileSpreadsheet size={20}/></span><div><h1>Spreadsheet workspace</h1><p>Keep and edit your files separately from financial transactions.</p></div></div><div className="sheet-top-actions">
      <button className="sheet-btn" onClick={() => { const widths = {}; activeSheet.headers.forEach((header, col) => { const longest = Math.max(String(header ?? "").length, ...activeSheet.rows.map((row) => String(row[col] ?? "").length)); widths[`${activeSheet.id}-${col}`] = Math.max(120, Math.min(480, longest * 8 + 42)); }); setColumnWidths((current) => ({ ...current, ...widths })); setMessage("Columns auto-fitted to their contents."); }} title="Automatically fit columns to their contents">Auto-fit columns</button>
      <button className="sheet-btn" onClick={() => setExpanded((value) => !value)} title={expanded ? "Exit expanded workspace" : "Expand workspace"}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {expanded ? "Exit expand" : "Expand"}</button>
      <button className="sheet-btn" onClick={() => fileRef.current?.click()}><ArrowUpFromLine size={16}/> Import file</button><button className="sheet-btn primary" onClick={save}><Save size={16}/> Save</button><button className="sheet-btn" onClick={() => exportFile("xlsx")}><ArrowDownToLine size={16}/> Export</button></div></header>
    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => readFile(e.target.files?.[0])}/>
    <section className="sheet-workbook-row"><div className="sheet-workbook-select"><label htmlFor="sheet-workbook">Workbook</label><select id="sheet-workbook" value={activeWorkbook.id} onChange={(e) => { if (dirty && !window.confirm("Switch workbooks with unsaved changes?")) return; setActiveWorkbookId(e.target.value); setDirty(false); setMessage(""); }}>
      {workbooks.map((book) => <option value={book.id} key={book.id}>{book.name}</option>)}
    </select><button className="sheet-icon-btn" title="Rename workbook" onClick={renameWorkbook}>Rename</button><button className="sheet-icon-btn" onClick={newWorkbook}><Plus size={15}/> New workbook</button></div><div className="sheet-export-menu"><button onClick={() => exportFile("csv")}>CSV</button><button onClick={() => exportFile("json")}>JSON</button><button onClick={() => exportFile("xlsx")}>Excel</button></div></section>
    <section className="sheet-grid-toolbar"><span>{activeSheet.rows.length} rows · {activeSheet.headers.length} columns · {visibleColumnIndexes.length} visible</span><div className="sheet-grid-actions"><div className="sheet-column-menu-wrap" ref={columnMenuRef}><button onClick={() => setShowColumnMenu((open) => !open)} aria-expanded={showColumnMenu}><Eye size={15}/> Hide/Show columns</button>{showColumnMenu && <div className="sheet-column-menu" role="group" aria-label="Show or hide columns"><div className="sheet-column-menu-heading"><strong>Visible columns</strong><button type="button" onClick={showAllColumns}>Show all</button></div>{activeSheet.headers.map((header, index) => <label key={`${activeSheet.id}-column-toggle-${index}`}><input type="checkbox" checked={!hiddenForActiveSheet.includes(index)} onChange={() => toggleColumnVisibility(index)} disabled={!hiddenForActiveSheet.includes(index) && visibleColumnIndexes.length === 1}/><span>{header || `Column ${index + 1}`}</span></label>)}</div>}</div><button onClick={addRow}><Plus size={15}/> Add row</button><button onClick={addColumn}><Plus size={15}/> Add column</button><button onClick={addSheet}><Plus size={15}/> Add sheet</button></div></section>
    <div className="sheet-tabs">{activeWorkbook.sheets.map((sheet) => <button key={sheet.id} className={sheet.id === activeSheet.id ? "active" : ""} onClick={() => updateWorkbook((book) => ({ ...book, activeSheetId: sheet.id }))} onDoubleClick={() => renameSheet(sheet)} title="Double-click to rename">{sheet.name}</button>)}</div>
    <div className="sheet-grid-scroll"><table className="sheet-grid"><thead><tr><th className="row-number">#</th>{visibleColumnIndexes.map((i) => { const header = activeSheet.headers[i]; return <th key={`${i}-${header}`} style={{ width: columnWidths[`${activeSheet.id}-${i}`] || undefined, minWidth: columnWidths[`${activeSheet.id}-${i}`] || undefined }}><input aria-label={`Column ${i + 1} header`} value={header} onChange={(e) => setHeader(i, e.target.value)} title="Edit column name"/><span className="sheet-column-resizer" role="separator" aria-label={`Resize ${header} column`} onPointerDown={(event) => { event.preventDefault(); const startX = event.clientX; const startWidth = event.currentTarget.parentElement.getBoundingClientRect().width; const move = (moveEvent) => { const width = Math.max(90, Math.min(700, startWidth + moveEvent.clientX - startX)); setColumnWidths((current) => ({ ...current, [`${activeSheet.id}-${i}`]: width })); }; const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop, { once: true }); }} /><button className="delete-column" title={`Delete ${header}`} onClick={() => deleteColumn(i)}><X size={12}/></button></th>; })}<th className="add-column-cell"><button onClick={addColumn} aria-label="Add column"><Plus size={14}/></button></th></tr></thead><tbody>{activeSheet.rows.map((row, ri) => <tr key={ri} style={{ height: rowHeights[`${activeSheet.id}-${ri}`] || undefined }}><td className="row-number">{ri + 1}<span className="sheet-row-resizer" role="separator" aria-label={`Resize row ${ri + 1}`} onPointerDown={(event) => { event.preventDefault(); const startY = event.clientY; const startHeight = event.currentTarget.closest("tr").getBoundingClientRect().height; const move = (moveEvent) => setRowHeights((current) => ({ ...current, [`${activeSheet.id}-${ri}`]: Math.max(28, Math.min(240, startHeight + moveEvent.clientY - startY)) })); const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop, { once: true }); }} /></td>{visibleColumnIndexes.map((ci) => <td key={ci} style={{ width: columnWidths[`${activeSheet.id}-${ci}`] || undefined, minWidth: columnWidths[`${activeSheet.id}-${ci}`] || undefined }}><input value={row[ci] ?? ""} onChange={(e) => setCell(ri, ci, e.target.value)} onFocus={() => setSelectedCell({ row: ri, col: ci })} aria-label={`Row ${ri + 1}, column ${ci + 1}`} /></td>)}<td className="row-actions"><button title="Delete row" onClick={() => deleteRow(ri)}><Trash2 size={13}/></button></td></tr>)}</tbody></table></div>
    <footer className="sheet-footer"><span className={dirty ? "unsaved" : "saved-dot"}>{dirty ? "● Unsaved changes" : "● Saved state"}</span><span>{message || (user ? "Saved locally in this browser; export or keep a backup copy." : "Guest workbooks are stored in this browser only.")}</span><span>Double-click a worksheet tab to rename it.</span></footer>
    {mergeTarget === "choose" && pendingImport && <div className="sheet-modal-backdrop"><section className="sheet-modal"><button className="sheet-modal-close" onClick={() => { setMergeTarget(null); setPendingImport(null); }} aria-label="Cancel import"><X size={18}/></button><h2>Import “{pendingImport.name}”</h2><p>{pendingImport.sheets.length} worksheet(s) detected. Your original file will not be changed.</p><div className="sheet-import-choice"><button onClick={appendAsNew}><Copy size={18}/><strong>Open as new workbook</strong><span>Keep every worksheet and column in a separate editable copy.</span></button><button disabled={!workbooks.length} onClick={() => setMergeTarget("merge")}><Sheet size={18}/><strong>Merge into an open workbook</strong><span>{workbooks.length ? "Append the first imported worksheet's rows to a selected worksheet." : "Create a workbook first to enable merging."}</span></button></div><div className="sheet-modal-actions"><button className="sheet-btn" onClick={() => { setMergeTarget(null); setPendingImport(null); }}>Cancel</button></div></section></div>}
    {mergeTarget === "merge" && pendingImport && <div className="sheet-modal-backdrop"><section className="sheet-modal"><button className="sheet-modal-close" onClick={() => setMergeTarget("choose")} aria-label="Back"><X size={18}/></button><h2>Choose a workbook to merge into</h2><p>Columns with matching header names line up automatically. New columns are added; unmatched values stay in their own columns.</p><label className="sheet-merge-label">Destination workbook<select value={mergeMapping.target || activeWorkbook?.id || workbooks[0]?.id || ""} onChange={(e) => setMergeMapping({ target: e.target.value })}>{workbooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select></label><p className="sheet-merge-note">Preview: {pendingImport.sheets[0]?.rows.length || 0} rows from “{pendingImport.sheets[0]?.name || "Sheet1"}” will be appended to the destination's active sheet. Other imported sheets are kept when opened as a new workbook.</p><div className="sheet-modal-actions"><button className="sheet-btn" onClick={() => setMergeTarget("choose")}>Back</button><button className="sheet-btn primary" onClick={() => mergeInto(mergeMapping.target || activeWorkbook?.id || workbooks[0]?.id)}>Merge rows</button></div></section></div>}
  </main>;
}

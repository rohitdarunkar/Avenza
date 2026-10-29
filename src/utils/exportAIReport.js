import { formatCurrency } from "./currency";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function exportAIReport({ summary, messages = [] }) {
  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) {
    throw new Error("Your browser blocked the report window. Allow pop-ups for Avenza and try again.");
  }

  popup.opener = null;

  const categories = (summary.categoryTotals || []).map((item) => {
    const percent = summary.expenseTotal > 0
      ? (item.amount / summary.expenseTotal) * 100
      : 0;

    return `
      <tr>
        <td>${escapeHtml(item.category)}</td>
        <td class="amount">${escapeHtml(formatCurrency(item.amount))}</td>
        <td>${percent.toFixed(1)}%</td>
      </tr>`;
  }).join("");

  const transcript = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => `
      <section class="message ${message.role === "user" ? "user" : "assistant"}">
        <h3>${message.role === "user" ? "You" : "Avenza AI"}</h3>
        <p>${escapeHtml(message.content).replace(/\r?\n/g, "<br>")}</p>
      </section>`)
    .join("");

  const report = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Avenza Financial Report</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f7fb; color: #17243a; font: 14px/1.6 Arial, sans-serif; }
    main { max-width: 900px; margin: 32px auto; padding: 42px; background: white; border: 1px solid #e2e9f2; border-radius: 18px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #e8eff8; }
    .brand { color: #1473ea; font-size: 12px; font-weight: 800; letter-spacing: .16em; }
    h1 { margin: 8px 0 4px; font-size: 30px; letter-spacing: -.04em; }
    .muted { color: #63718a; }
    .date { text-align: right; color: #63718a; font-size: 12px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0 30px; }
    .stat { padding: 16px; border: 1px solid #e2e9f2; border-radius: 12px; background: #f9fbfe; }
    .stat span { display: block; color: #63718a; font-size: 11px; }
    .stat strong { display: block; margin-top: 7px; font-size: 21px; overflow-wrap: anywhere; }
    h2 { margin: 28px 0 12px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 11px 10px; border-bottom: 1px solid #e8edf4; text-align: left; }
    th { color: #63718a; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    .amount { font-weight: 700; }
    .message { padding: 14px 16px; margin: 12px 0; border: 1px solid #e2e9f2; border-radius: 10px; break-inside: avoid; }
    .message h3 { margin: 0 0 5px; font-size: 12px; color: #1473ea; }
    .message p { margin: 0; white-space: normal; overflow-wrap: anywhere; }
    .user { background: #f5f8fd; }
    .assistant { background: #fff; }
    footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e9f2; color: #63718a; font-size: 11px; }
    .print-button { display: inline-flex; margin: 0 0 20px; padding: 10px 15px; border: 0; border-radius: 9px; background: #1473ea; color: white; font-weight: 700; cursor: pointer; }
    @media (max-width: 640px) { main { margin: 0; padding: 22px; border-radius: 0; } .stats { grid-template-columns: 1fr; } header { flex-direction: column; } .date { text-align: left; } }
    @media print { body { background: white; } main { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; } .print-button { display: none; } }
  </style>
</head>
<body>
  <main>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    <header>
      <div><div class="brand">AVENZA</div><h1>Financial Insights Report</h1><div class="muted">A summary of recorded workspace transactions and AI conversation.</div></div>
      <div class="date">Prepared on<br><strong>${escapeHtml(formatDate())}</strong></div>
    </header>
    <section class="stats">
      <div class="stat"><span>Recorded income</span><strong>${escapeHtml(formatCurrency(summary.incomeTotal))}</strong></div>
      <div class="stat"><span>Recorded expenses</span><strong>${escapeHtml(formatCurrency(summary.expenseTotal))}</strong></div>
      <div class="stat"><span>Net cash flow</span><strong>${escapeHtml(formatCurrency(summary.netCashFlow))}</strong></div>
    </section>
    <h2>Spending by category</h2>
    ${categories ? `<table><thead><tr><th>Category</th><th>Amount</th><th>Share of expenses</th></tr></thead><tbody>${categories}</tbody></table>` : '<p class="muted">No recorded expenses are available for category analysis.</p>'}
    <h2>AI conversation</h2>
    ${transcript || '<p class="muted">No conversation messages are available in this report.</p>'}
    <footer>Generated by Avenza. Figures are based on the transaction data available in the workspace at export time. AI suggestions are informational and are not professional financial advice.</footer>
  </main>
</body>
</html>`;

  popup.document.open();
  popup.document.write(report);
  popup.document.close();
  popup.focus();
}

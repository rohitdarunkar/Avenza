import { Bot, UserRound } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

function renderInlineMarkdown(text, keyPrefix = "inline") {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts = String(text).split(pattern);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function renderMarkdown(content) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;
  let codeLines = null;
  let codeLanguage = "";

  const flushParagraph = () => {
    if (!paragraph.length) return;

    blocks.push({
      type: "paragraph",
      text: paragraph.join(" ").trim(),
      key: `p-${blocks.length}`,
    });

    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;

    blocks.push({
      type: listType,
      items: listItems,
      key: `list-${blocks.length}`,
    });

    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (codeLines) {
        blocks.push({
          type: "code",
          language: codeLanguage,
          text: codeLines.join("\\n"),
          key: `code-${blocks.length}`,
        });
        codeLines = null;
        codeLanguage = "";
      } else {
        codeLines = [];
        codeLanguage = line.slice(3).trim().slice(0, 40);
      }
      return;
    }

    if (codeLines) {
      codeLines.push(rawLine);
      return;
    }

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();

      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].replace(/\s+#+\s*$/, ""),
        key: `h-${blocks.length}`,
      });

      return;
    }

    const unorderedItem = line.match(/^[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);

    if (unorderedItem || orderedItem) {
      flushParagraph();

      const nextType = unorderedItem ? "ul" : "ol";

      if (listType && listType !== nextType) {
        flushList();
      }

      listType = nextType;
      listItems.push((unorderedItem || orderedItem)[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  if (codeLines) {
    blocks.push({
      type: "code",
      language: codeLanguage,
      text: codeLines.join("\\n"),
      key: `code-${blocks.length}`,
    });
  }

  return blocks.map((block) => {
    if (block.type === "paragraph") {
      return (
        <p key={block.key}>
          {renderInlineMarkdown(block.text, block.key)}
        </p>
      );
    }

    if (block.type === "code") {
      return (
        <pre key={block.key} className="ai-message-code">
          {block.language && <span className="ai-message-code-language">{block.language}</span>}
          <code>{block.text}</code>
        </pre>
      );
    }

    if (block.type === "heading") {
      const HeadingTag = `h${Math.min(block.level, 4)}`;

      return (
        <HeadingTag key={block.key}>
          {renderInlineMarkdown(block.text, block.key)}
        </HeadingTag>
      );
    }

    const ListTag = block.type;

    return (
      <ListTag key={block.key}>
        {block.items.map((item, index) => (
          <li key={`${block.key}-${index}`}>
            {renderInlineMarkdown(item, `${block.key}-${index}`)}
          </li>
        ))}
      </ListTag>
    );
  });
}


function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function donutPath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const startOuter = polarPoint(cx, cy, outerRadius, startAngle);
  const endOuter = polarPoint(cx, cy, outerRadius, endAngle);
  const startInner = polarPoint(cx, cy, innerRadius, endAngle);
  const endInner = polarPoint(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function AIChart({ chartSpec }) {
  if (!chartSpec?.data?.length) return null;
  const isMonthly = chartSpec.type === "monthly";
  const maxValue = Math.max(1, ...chartSpec.data.flatMap((item) => isMonthly ? [item.income || 0, item.expenses || 0] : [item.value || 0]));
  const total = chartSpec.data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const palette = ["#287ff0", "#20b889", "#f5a623", "#8b70e8", "#ed7185", "#35b8c5", "#9aa8bc", "#e27c3e"];
  let angle = 0;

  return (
    <section className={`ai-inline-chart ${isMonthly ? "is-monthly" : "is-categories"}`} aria-label={chartSpec.title || "Financial chart"}>
      <div className="ai-inline-chart-heading">
        <span>{chartSpec.title || "Financial visualization"}</span>
        {total > 0 && <strong>{formatCurrency(total)}</strong>}
      </div>

      {!isMonthly && (
        <div className="ai-donut-layout">
          <svg className="ai-donut-chart" viewBox="0 0 180 180" role="img" aria-label="Expense category share donut chart">
            <circle cx="90" cy="90" r="66" fill="none" stroke="var(--ai-chart-track, #e8eef6)" strokeWidth="26" />
            {chartSpec.data.length === 1 && total > 0 ? (
              <circle cx="90" cy="90" r="66" fill="none" stroke={palette[0]} strokeWidth="26" />
            ) : chartSpec.data.map((item, index) => {
              const value = Math.max(0, Number(item.value) || 0);
              const portion = total ? (value / total) * 360 : 0;
              const path = donutPath(90, 90, 79, 53, angle, angle + portion);
              angle += portion;
              return <path key={`${item.label}-${index}`} d={path} fill={palette[index % palette.length]} />;
            })}
            <text x="90" y="85" textAnchor="middle" className="ai-donut-total-label">Total</text>
            <text x="90" y="103" textAnchor="middle" className="ai-donut-total-value">{total ? formatCurrency(total) : "₹0"}</text>
          </svg>
          <div className="ai-donut-legend">
            {chartSpec.data.map((item, index) => {
              const value = Number(item.value) || 0;
              const share = total ? (value / total) * 100 : 0;
              return (
                <div className="ai-donut-legend-item" key={`${item.label}-${index}`}>
                  <i style={{ background: palette[index % palette.length] }} />
                  <span title={item.label}>{item.label}</span>
                  <strong>{share.toFixed(1)}%</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMonthly && (
        <div className="ai-monthly-chart">
          {chartSpec.data.map((item) => {
            const income = Number(item.income) || 0;
            const expenses = Number(item.expenses) || 0;
            return (
              <div className="ai-monthly-chart-row" key={item.label}>
                <span className="ai-inline-chart-label">{item.label}</span>
                <div className="ai-monthly-bars">
                  <span className="ai-inline-chart-bar income" style={{ width: `${income / maxValue * 100}%` }} title={`Income ${formatCurrency(income)}`} />
                  <span className="ai-inline-chart-bar expense" style={{ width: `${expenses / maxValue * 100}%` }} title={`Expenses ${formatCurrency(expenses)}`} />
                </div>
                <strong className="ai-inline-chart-value">{formatCurrency(expenses)}</strong>
              </div>
            );
          })}
          <div className="ai-inline-chart-legend"><span><i className="income" /> Income</span><span><i className="expense" /> Expenses</span></div>
        </div>
      )}

      {!isMonthly && (
        <div className="ai-category-bars">
          {chartSpec.data.map((item, index) => {
            const value = Number(item.value) || 0;
            return (
              <div className="ai-category-bar-row" key={`${item.label}-bar-${index}`}>
                <span title={item.label}>{item.label}</span>
                <div><i style={{ width: `${value / maxValue * 100}%`, background: palette[index % palette.length] }} /></div>
                <strong>{formatCurrency(value)}</strong>
              </div>
            );
          })}
        </div>
      )}
      <p className="ai-inline-chart-note">Generated from recorded Avenza transactions. Values are not estimates.</p>
    </section>
  );
}

export default function ChatMessage({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`ai-message ${
        isAssistant ? "ai-message-assistant" : "ai-message-user"
      }`}
    >
      <div className="ai-message-avatar" aria-hidden="true">
        {isAssistant ? <Bot size={17} /> : <UserRound size={17} />}
      </div>

      <div className="ai-message-body">
        <div className="ai-message-author">
          {isAssistant ? "Avenza AI" : "You"}
        </div>

        <div className="ai-message-text">
          {isAssistant ? (
            <div className="ai-message-markdown">
              {renderMarkdown(message.content)}
            </div>
          ) : (
            message.content
          )}
        </div>
        {isAssistant && message.chartSpec && <AIChart chartSpec={message.chartSpec} />}
      </div>
    </article>
  );
}

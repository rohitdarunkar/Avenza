import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  PiggyBank,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FileSpreadsheet,
  Filter,
  Home,
  LockKeyhole,
  Landmark,
  Maximize2,
  Menu,
  Moon,
  Sun,
  Minimize2,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import TransactionsPage from "./Transactions";
import InsightsPage from "./Insights";
import AIAssistant from "./AIAssistant";
import AIFloatingCompanion from "./AIFloatingCompanion";
import TransactionImport from "../components/transactions/TransactionImport";
import SpreadsheetWorkspace from "../components/spreadsheet/SpreadsheetWorkspace";
import { getOrCreateDefaultAccountId } from "../services/transactionService";
import AccountsPage from "./Accounts";
import GoalsPage from "./Goals";
import BudgetPage from "./Budgets";


const initialTransactions = [
  {
    id: 1,
    name: "Salary",
    category: "Income",
    type: "income",
    amount: 120000,
    date: "2026-09-01",
  },
  {
    id: 2,
    name: "Rent",
    category: "Housing",
    type: "expense",
    amount: 18000,
    date: "2026-09-02",
  },
  {
    id: 3,
    name: "Amazon",
    category: "Shopping",
    type: "expense",
    amount: 4299,
    date: "2026-09-04",
  },
  {
    id: 4,
    name: "Swiggy",
    category: "Food",
    type: "expense",
    amount: 820,
    date: "2026-09-05",
  },
  {
    id: 5,
    name: "Electricity Bill",
    category: "Utilities",
    type: "expense",
    amount: 2450,
    date: "2026-09-07",
  },
  {
    id: 6,
    name: "Uber",
    category: "Transport",
    type: "expense",
    amount: 640,
    date: "2026-09-09",
  },
  {
    id: 7,
    name: "Netflix",
    category: "Subscriptions",
    type: "expense",
    amount: 649,
    date: "2026-09-10",
  },
  {
    id: 8,
    name: "Freelance Project",
    category: "Income",
    type: "income",
    amount: 15000,
    date: "2026-09-12",
  },
  {
    id: 9,
    name: "Restaurant",
    category: "Food",
    type: "expense",
    amount: 1450,
    date: "2026-09-14",
  },
  {
    id: 10,
    name: "Grocery Store",
    category: "Groceries",
    type: "expense",
    amount: 3250,
    date: "2026-09-16",
  },
  {
    id: 11,
    name: "Phone Bill",
    category: "Utilities",
    type: "expense",
    amount: 899,
    date: "2026-09-18",
  },
  {
    id: 12,
    name: "Flipkart",
    category: "Shopping",
    type: "expense",
    amount: 2890,
    date: "2026-09-21",
  },
];

const categoryColors = {
  Food: "#1473ea",
  Shopping: "#52c9b0",
  Housing: "#8a6de9",
  Utilities: "#f3b74e",
  Transport: "#ef7c83",
  Subscriptions: "#6f9bd4",
  Groceries: "#4bbf83",
  Other: "#94a3b8",
};

function toAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toDateString(value) {
  if (!value) return "";

  // Firestore Timestamp values expose toDate(); support them as well as
  // ISO date strings and JavaScript Date objects.
  let dateValue = value;
  if (value && typeof value.toDate === "function") {
    dateValue = value.toDate();
  }

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return "";
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  if (typeof dateValue === "number") {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return "";
}

function normalizeTransaction(transaction, id = transaction?.id) {
  const rawType = String(transaction?.type || transaction?.transactionType || "expense").toLowerCase();
  const type = ["income", "credit", "deposit"].includes(rawType) ? "income" : "expense";
  const category = String(transaction?.category || (type === "income" ? "Income" : "Other")).trim();
  const date = toDateString(transaction?.date || transaction?.transactionDate || transaction?.createdAt);

  return {
    ...transaction,
    id,
    name: String(transaction?.name || transaction?.description || transaction?.title || (type === "income" ? "Income" : "Expense")),
    category: category || (type === "income" ? "Income" : "Other"),
    type,
    amount: toAmount(transaction?.amount ?? transaction?.value ?? transaction?.total),
    date,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toAmount(value));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function AvenzaLogo({ compact = false, onClick }) {
  const content = (
    <div className={`dashboard-brand ${compact ? "compact" : ""}`}>
      <div className="dashboard-brand-mark">
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7.5 34.5L17.5 10.5C18.15 8.94 20.35 8.94 21 10.5L30.2 32.4"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 27.5H28.1"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M25.4 16.7L36.3 32.7"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {!compact && <span>Avenza</span>}
    </div>
  );

  if (onClick) {
    return (
      <div
        className="dashboard-brand-home"
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Go to Avenza home"
      >
        {content}
      </div>
    );
  }

  return content;
}

function Sidebar({
  activePage,
  setActivePage,
  closeMobile,
  onHome,
  user = null,
}) {
  const navigation = [
    {
      id: "home",
      label: "Home",
      icon: <Home size={18} />,
    },
    {
      id: "overview",
      label: "Overview",
      icon: <WalletCards size={18} />,
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: <CircleDollarSign size={18} />,
    },
    ...(user ? [{ id: "accounts", label: "Accounts", icon: <Landmark size={18} /> }] : []),
    {
      id: "spreadsheet",
      label: "Spreadsheet",
      icon: <FileSpreadsheet size={18} />,
    },
    {
      id: "insights",
      label: "Insights",
      icon: <BarChart3 size={18} />,
    },
    {
      id: "assistant",
      label: "AI Assistant",
      icon: <Sparkles size={18} />,
    },
    ...(user ? [{ id: "budgets", label: "Budgets", icon: <PiggyBank size={18} /> }] : []),
    {
      id: "goals",
      label: "Goals",
      icon: <Target size={18} />,
    },
  ];

  const handleNavigation = (id) => {
    if (id === "home") {
      closeMobile();
      onHome();
      return;
    }

    setActivePage(id);
    closeMobile();
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-top">
        <AvenzaLogo onClick={onHome} />
      </div>

      <div className="sidebar-label">Workspace</div>

      <nav className="dashboard-nav">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={`dashboard-nav-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => handleNavigation(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>

            {item.id === "assistant" && (
              <span className="nav-new-badge">AI</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="dashboard-nav-item"
          onClick={() => handleNavigation("import")}
        >
          <Upload size={18} />
          <span>Import data</span>
        </button>

        <button
          className="dashboard-nav-item"
          onClick={() => handleNavigation("reports")}
        >
          <FileText size={18} />
          <span>Reports</span>
        </button>

        <div className="sidebar-divider" />

        <div className="guest-profile">
          <div className="guest-avatar">
            {user ? (user.email?.charAt(0) || "A").toUpperCase() : "G"}
          </div>

          <div>
            <strong>{user ? user.email || "Avenza account" : "Guest mode"}</strong>
            <span>{user ? "Avenza account" : "Local demo data"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ openSidebar, onHome, onAddTransaction, darkMode, onToggleDarkMode }) {
  return (
    <header className="mobile-dashboard-header">
      <button
        className="mobile-dashboard-menu"
        onClick={openSidebar}
        aria-label="Open dashboard menu"
      >
        <Menu size={21} />
      </button>

      <AvenzaLogo onClick={onHome} />

      <div className="mobile-header-actions">
        <button
          className="mobile-theme-button"
          onClick={onToggleDarkMode}
          type="button"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={darkMode}
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button
        className="mobile-add-button"
        onClick={onAddTransaction}
        type="button"
        aria-label="Add transaction"
        title="Add transaction"
      >
        <Plus size={20} />
        </button>
      </div>
    </header>
  );
}

function GuestBanner({ onCreateAccount }) {
  return (
    <div className="guest-banner">
      <div className="guest-banner-left">
        <div className="guest-banner-icon">
          <Sparkles size={16} />
        </div>

        <div>
          <strong>
            You're exploring Avenza in guest mode.
          </strong>

          <span>
            Your changes are temporary. Create a free account
            to save your financial history.
          </span>
        </div>
      </div>

      <button onClick={onCreateAccount}>
        Create free account
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  iconClass,
  trend,
  trendType,
}) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-top">
        <div
          className={`dashboard-stat-icon ${iconClass}`}
        >
          {icon}
        </div>

        {trend && (
          <span
            className={`stat-trend ${
              trendType || ""
            }`}
          >
            {trendType === "negative" ? (
              <TrendingDown size={13} />
            ) : (
              <TrendingUp size={13} />
            )}

            {trend}
          </span>
        )}
      </div>

      <span className="dashboard-stat-title">
        {title}
      </span>

      <strong className="dashboard-stat-value">
        {value}
      </strong>

      <span className="dashboard-stat-description">
        {description}
      </span>
    </div>
  );
}

function buildSpendingPoints(transactions) {
  const expenses = transactions.filter(
    (transaction) =>
      transaction.type === "expense"
  );

  const grouped = {};

  expenses.forEach((transaction) => {
    const date = toDateString(transaction.date);
    if (!date) return;

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push({
      ...transaction,
      amount: toAmount(transaction.amount),
      date,
    });
  });

  return Object.entries(grouped)
    .sort(
      ([dateA], [dateB]) =>
        new Date(`${dateA}T00:00:00`) -
        new Date(`${dateB}T00:00:00`)
    )
    .map(([date, items]) => ({
      date,
      amount: items.reduce(
        (sum, item) =>
          sum + toAmount(item.amount),
        0
      ),
      transactions: items,
    }));
}

function SpendingChart({
  transactions,
  expanded,
  onToggleExpanded,
  onPointClick,
}) {
  const [hoveredPoint, setHoveredPoint] =
    useState(null);

  const points = useMemo(
    () =>
      buildSpendingPoints(
        transactions
      ),
    [transactions]
  );

  const chartWidth = 820;
  const chartHeight = expanded
    ? 430
    : 300;

  const paddingX = expanded ? 55 : 38;
  const paddingY = 38;

  const usableWidth =
    chartWidth - paddingX * 2;

  const usableHeight =
    chartHeight - paddingY * 2;

  const maxAmount = Math.max(
    ...points.map(
      (point) => point.amount
    ),
    1
  );

  const coordinates = points.map(
    (point, index) => ({
      ...point,

      x:
        points.length === 1
          ? chartWidth / 2
          : paddingX +
            (index /
              (points.length - 1)) *
              usableWidth,

      y:
        chartHeight -
        paddingY -
        (point.amount / maxAmount) *
          usableHeight,
    })
  );

  const linePath =
    coordinates.length > 0
      ? coordinates
          .map((point, index) => {
            if (index === 0) {
              return `M ${point.x} ${point.y}`;
            }

            const previous =
              coordinates[index - 1];

            const controlX =
              (previous.x + point.x) /
              2;

            return `C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
          })
          .join(" ")
      : "";

  const areaPath =
    coordinates.length > 0
      ? `${linePath} L ${
          coordinates.at(-1).x
        } ${chartHeight} L ${
          coordinates[0].x
        } ${chartHeight} Z`
      : "";

  const handleMouseMove = (event) => {
    if (!coordinates.length) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const relativeX =
      ((event.clientX -
        rect.left) /
        rect.width) *
      chartWidth;

    let closest =
      coordinates[0];

    let smallestDistance =
      Math.abs(
        coordinates[0].x -
          relativeX
      );

    coordinates.forEach(
      (point) => {
        const distance = Math.abs(
          point.x - relativeX
        );

        if (
          distance <
          smallestDistance
        ) {
          smallestDistance =
            distance;
          closest = point;
        }
      }
    );

    setHoveredPoint(closest);
  };

  const chartStyle = expanded
    ? {
        position: "fixed",
        inset: "5vh 5vw",
        width: "90vw",
        height: "90vh",
        zIndex: 1200,
        background: "#ffffff",
        borderRadius: "28px",
        padding: "28px",
        boxSizing: "border-box",
        boxShadow:
          "0 30px 100px rgba(15, 23, 42, 0.28)",
        display: "flex",
        flexDirection: "column",
      }
    : {};

  if (!points.length) {
    return (
      <>
        {expanded && (
          <div
            onClick={onToggleExpanded}
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(15, 23, 42, 0.42)",
              zIndex: 1199,
              backdropFilter:
                "blur(5px)",
            }}
          />
        )}

        <div
          className="spending-chart"
          style={chartStyle}
          onClick={(event) =>
            expanded &&
            event.stopPropagation()
          }
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "flex-start",
              marginBottom:
                expanded
                  ? "12px"
                  : "0",
            }}
          >
            {expanded && (
              <div>
                <span className="card-eyebrow">
                  Spending overview
                </span>

                <h2
                  style={{
                    margin:
                      "6px 0 0",
                  }}
                >
                  Spending this month
                </h2>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label={
                expanded
                  ? "Reduce spending graph"
                  : "Enlarge spending graph"
              }
              style={{
                marginLeft:
                  "auto",
                width: "36px",
                height: "36px",
                borderRadius:
                  "10px",
                border:
                  "1px solid #dbe4f0",
                background:
                  "#ffffff",
                color:
                  "#52627a",
                display: "grid",
                placeItems:
                  "center",
                cursor:
                  "pointer",
                boxShadow:
                  "0 4px 12px rgba(15, 23, 42, 0.06)",
              }}
            >
              {expanded ? (
                <Minimize2
                  size={16}
                />
              ) : (
                <Maximize2
                  size={16}
                />
              )}
            </button>
          </div>

          <div
            style={{
              minHeight: expanded
                ? "0"
                : "250px",
              flex: expanded
                ? 1
                : undefined,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              flexDirection:
                "column",
              gap: "10px",
              color: "#94a3b8",
              textAlign: "center",
              padding:
                "24px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius:
                  "15px",
                background:
                  "#f1f5f9",
                display: "grid",
                placeItems:
                  "center",
                color:
                  "#64748b",
              }}
            >
              <BarChart3
                size={22}
              />
            </div>

            <strong
              style={{
                color:
                  "#334155",
                fontSize:
                  "15px",
              }}
            >
              No spending data yet
            </strong>

            <span
              style={{
                maxWidth:
                  "360px",
                lineHeight:
                  1.6,
                fontSize:
                  "13px",
              }}
            >
              Add an expense transaction
              and Avenza will start plotting
              your spending automatically.
            </span>
          </div>
        </div>
      </>
    );
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <>
      {expanded && (
        <div
          onClick={onToggleExpanded}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.42)",
            zIndex: 1199,
            backdropFilter:
              "blur(5px)",
          }}
        />
      )}

      <div
        className="spending-chart"
        style={chartStyle}
        onClick={(event) =>
          expanded &&
          event.stopPropagation()
        }
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            justifyContent:
              "space-between",
            gap: "20px",
            marginBottom:
              expanded
                ? "10px"
                : "0",
          }}
        >
          {expanded && (
            <div>
              <span className="card-eyebrow">
                Spending overview
              </span>

              <h2
                style={{
                  margin:
                    "6px 0 0",
                }}
              >
                Spending this month
              </h2>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748b",
                  fontSize:
                    "13px",
                }}
              >
                Hover over the graph
                for details. Click a
                point to jump to those
                transactions.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={
              expanded
                ? "Reduce spending graph"
                : "Enlarge spending graph"
            }
            style={{
              marginLeft:
                "auto",
              width: "36px",
              height: "36px",
              flexShrink: 0,
              borderRadius:
                "10px",
              border:
                "1px solid #dbe4f0",
              background:
                "#ffffff",
              color:
                "#52627a",
              display: "grid",
              placeItems:
                "center",
              cursor:
                "pointer",
              boxShadow:
                "0 4px 12px rgba(15, 23, 42, 0.06)",
            }}
          >
            {expanded ? (
              <Minimize2
                size={16}
              />
            ) : (
              <Maximize2
                size={16}
              />
            )}
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            flex: expanded
              ? 1
              : undefined,
            minHeight:
              expanded
                ? "0"
                : "270px",
          }}
        >
          <div className="chart-grid-lines">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Spending trend based on your transactions"
            style={{
              width: "100%",
              height:
                expanded
                  ? "100%"
                  : "270px",
              display: "block",
              cursor:
                "crosshair",
            }}
            onMouseMove={
              handleMouseMove
            }
            onMouseLeave={() =>
              setHoveredPoint(null)
            }
            onClick={() => {
              if (
                hoveredPoint
              ) {
                onPointClick(
                  hoveredPoint.date
                );
              }
            }}
          >
            <defs>
              <linearGradient
                id="avenzaDynamicChartFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#1473ea"
                  stopOpacity="0.18"
                />

                <stop
                  offset="100%"
                  stopColor="#1473ea"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <path
              d={areaPath}
              fill="url(#avenzaDynamicChartFill)"
            />

            <path
              d={linePath}
              fill="none"
              stroke="#1473ea"
              strokeWidth={
                expanded ? 4 : 3.5
              }
              strokeLinecap="round"
            />

            {coordinates.map(
              (point) => (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r={
                    hoveredPoint?.date ===
                    point.date
                      ? 8
                      : 5
                  }
                  fill="white"
                  stroke="#1473ea"
                  strokeWidth={
                    hoveredPoint?.date ===
                    point.date
                      ? 4
                      : 3
                  }
                  style={{
                    cursor:
                      "pointer",
                  }}
                />
              )
            )}

            <rect
              x="0"
              y="0"
              width={chartWidth}
              height={chartHeight}
              fill="transparent"
            />
          </svg>

          {hoveredPoint && (
            <div
              style={{
                position:
                  "absolute",
                left: `${Math.min(
                  Math.max(
                    (hoveredPoint.x /
                      chartWidth) *
                      100,
                    12
                  ),
                  88
                )}%`,
                top: `${Math.min(
                  Math.max(
                    (hoveredPoint.y /
                      chartHeight) *
                      100 -
                      3,
                    8
                  ),
                  72
                )}%`,
                transform:
                  "translate(-50%, -100%)",
                width:
                  expanded
                    ? "245px"
                    : "215px",
                background:
                  "#101a35",
                color: "white",
                borderRadius:
                  "14px",
                padding:
                  "14px",
                boxShadow:
                  "0 15px 35px rgba(15, 23, 42, 0.25)",
                pointerEvents:
                  "none",
                zIndex: 5,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  alignItems:
                    "center",
                  marginBottom:
                    "8px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "12px",
                    opacity:
                      0.7,
                  }}
                >
                  {formatDate(
                    hoveredPoint.date
                  )}
                </span>

                <strong
                  style={{
                    fontSize:
                      "15px",
                  }}
                >
                  {formatCurrency(
                    hoveredPoint.amount
                  )}
                </strong>
              </div>

              <div
                style={{
                  height:
                    "1px",
                  background:
                    "rgba(255,255,255,0.12)",
                  marginBottom:
                    "9px",
                }}
              />

              <div
                style={{
                  fontSize:
                    "12px",
                  opacity:
                    0.78,
                  marginBottom:
                    "8px",
                }}
              >
                {
                  hoveredPoint
                    .transactions
                    .length
                }{" "}
                transaction
                {hoveredPoint
                  .transactions
                  .length !== 1
                  ? "s"
                  : ""}
              </div>

              {hoveredPoint.transactions
                .slice(0, 3)
                .map(
                  (transaction) => (
                    <div
                      key={
                        transaction.id
                      }
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                        fontSize:
                          "12px",
                        marginTop:
                          "5px",
                      }}
                    >
                      <span
                        style={{
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          opacity:
                            0.9,
                        }}
                      >
                        {
                          transaction.name
                        }
                      </span>

                      <strong>
                        {formatCurrency(
                          transaction.amount
                        )}
                      </strong>
                    </div>
                  )
                )}

              <div
                style={{
                  marginTop:
                    "10px",
                  fontSize:
                    "10px",
                  color:
                    "#9fc6ff",
                }}
              >
                Click to view
                these transactions
              </div>
            </div>
          )}
        </div>

        <div
          className="chart-labels"
          style={{
            marginTop:
              "4px",
          }}
        >
          {coordinates.map(
            (point) => (
              <span
                key={point.date}
              >
                {formatShortDate(
                  point.date
                )}
              </span>
            )
          )}
        </div>

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginTop:
              "12px",
            color:
              "#94a3b8",
            fontSize:
              "11px",
          }}
        >
          <span>
            {points.length} spending
            date
            {points.length !==
            1
              ? "s"
              : ""}
          </span>

          <span>
            Highest day:{" "}
            <strong
              style={{
                color:
                  "#475569",
              }}
            >
              {formatCurrency(
                Math.max(
                  ...points.map(
                    (point) =>
                      point.amount
                  )
                )
              )}
            </strong>
          </span>
        </div>

        {expanded && (
          <div
            className="spending-chart-expanded-hint"
            style={{
              marginTop:
                "14px",
              padding:
                "11px 14px",
              borderRadius:
                "12px",
              background:
                "#f7faff",
              border:
                "1px solid #e3eefc",
              color:
                "#64748b",
              fontSize:
                "12px",
            }}
          >
            Move your cursor over
            the line to inspect each
            spending date. Click a
            point to jump directly to
            its transactions.
          </div>
        )}
      </div>
    </>
  );
}

function polarToCartesian(
  centerX,
  centerY,
  radius,
  angleInDegrees
) {
  const angleInRadians =
    ((angleInDegrees - 90) *
      Math.PI) /
    180;

  return {
    x:
      centerX +
      radius *
        Math.cos(angleInRadians),

    y:
      centerY +
      radius *
        Math.sin(angleInRadians),
  };
}

function describeDonutSegment(
  startAngle,
  endAngle,
  outerRadius,
  innerRadius,
  centerX,
  centerY
) {
  const outerStart =
    polarToCartesian(
      centerX,
      centerY,
      outerRadius,
      endAngle
    );

  const outerEnd =
    polarToCartesian(
      centerX,
      centerY,
      outerRadius,
      startAngle
    );

  const innerStart =
    polarToCartesian(
      centerX,
      centerY,
      innerRadius,
      endAngle
    );

  const innerEnd =
    polarToCartesian(
      centerX,
      centerY,
      innerRadius,
      startAngle
    );

  const largeArcFlag =
    endAngle - startAngle <=
    180
      ? "0"
      : "1";

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function CategoryBreakdown({
  transactions,
  expanded,
  onToggleExpanded,
}) {
  const [hoveredCategory, setHoveredCategory] =
    useState(null);

  const categories = useMemo(() => {
    const expenses =
      transactions.filter(
        (transaction) =>
          transaction.type ===
          "expense"
      );

    const totals = {};

    expenses.forEach(
      (transaction) => {
        if (
          !totals[
            transaction.category
          ]
        ) {
          totals[
            transaction.category
          ] = [];
        }

        totals[
          transaction.category
        ].push(transaction);
      }
    );

    const total = expenses.reduce(
      (sum, transaction) =>
        sum + toAmount(transaction.amount),
      0
    );

    return Object.entries(
      totals
    )
      .map(
        ([category, items]) => ({
          category,
          amount: items.reduce(
            (sum, item) =>
              sum + toAmount(item.amount),
            0
          ),
          transactions:
            items,
          percentage: total
            ? (items.reduce(
                (sum, item) =>
                  sum +
                  toAmount(item.amount),
                0
              ) /
                total) *
              100
            : 0,
        })
      )
      .sort(
        (a, b) =>
          b.amount - a.amount
      );
  }, [transactions]);

  const totalSpent =
    categories.reduce(
      (sum, item) =>
        sum + toAmount(item.amount),
      0
    );

  const chartCategories =
    categories.length
      ? categories
      : [];

  const center = 160;
  const outerRadius = 120;
  const innerRadius = 72;

  let currentAngle = 0;

  const segments =
    chartCategories.map(
      (item, index) => {
        const startAngle =
          currentAngle;

        const rawEndAngle =
          currentAngle +
          (item.percentage /
            100) *
            360;
        // SVG arc commands cannot draw a full 360-degree arc when the
        // start and end coordinates are identical. Keep a tiny gap so a
        // single category (100%) renders as a complete visible donut.
        const endAngle =
          rawEndAngle - currentAngle >= 359.999
            ? currentAngle + 359.999
            : rawEndAngle;

        currentAngle =
          endAngle;

        return {
          ...item,
          index,
          startAngle,
          endAngle,
          color:
            categoryColors[
              item.category
            ] ||
            Object.values(
              categoryColors
            )[index %
              Object.values(
                categoryColors
              ).length],
        };
      }
    );

  const panelStyle = expanded
    ? {
        position: "fixed",
        inset: "5vh 5vw",
        width: "90vw",
        height: "90vh",
        zIndex: 1200,
        background: "#ffffff",
        borderRadius: "28px",
        padding: "28px",
        boxSizing: "border-box",
        boxShadow:
          "0 30px 100px rgba(15, 23, 42, 0.28)",
        overflow: "auto",
      }
    : {};

  if (!categories.length) {
    return (
      <>
        {expanded && (
          <div
            onClick={onToggleExpanded}
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(15, 23, 42, 0.42)",
              zIndex: 1199,
              backdropFilter:
                "blur(5px)",
            }}
          />
        )}

        <div
          className="category-breakdown"
          style={{
            ...panelStyle,
            minHeight:
              expanded
                ? undefined
                : "290px",
            display:
              "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            justifyContent:
              "center",
            position:
              expanded
                ? "fixed"
                : "relative",
          }}
          onClick={(event) =>
            expanded &&
            event.stopPropagation()
          }
        >
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={
              expanded
                ? "Reduce category chart"
                : "Enlarge category chart"
            }
            style={{
              position:
                "absolute",
              top: "16px",
              right: "16px",
              width: "36px",
              height: "36px",
              borderRadius:
                "10px",
              border:
                "1px solid #dbe4f0",
              background:
                "#ffffff",
              color:
                "#52627a",
              display: "grid",
              placeItems:
                "center",
              cursor:
                "pointer",
            }}
          >
            {expanded ? (
              <Minimize2
                size={16}
              />
            ) : (
              <Maximize2
                size={16}
              />
            )}
          </button>

          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius:
                "15px",
              background:
                "#f1f5f9",
              display: "grid",
              placeItems:
                "center",
              color:
                "#64748b",
              marginBottom:
                "12px",
            }}
          >
            <CircleDollarSign
              size={22}
            />
          </div>

          <strong
            style={{
              color:
                "#334155",
              fontSize:
                "15px",
            }}
          >
            No spending categories yet
          </strong>

          <span
            style={{
              color:
                "#94a3b8",
              fontSize:
                "13px",
              marginTop:
                "7px",
              textAlign:
                "center",
              maxWidth:
                "280px",
              lineHeight:
                1.6,
            }}
          >
            Add an expense and
            Avenza will automatically
            break your spending down
            by category.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {expanded && (
        <div
          onClick={onToggleExpanded}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.42)",
            zIndex: 1199,
            backdropFilter:
              "blur(5px)",
          }}
        />
      )}

      <div
        className="category-breakdown"
        style={{
          ...panelStyle,
          position:
            expanded
              ? "fixed"
              : "relative",
        }}
        onClick={(event) =>
          expanded &&
          event.stopPropagation()
        }
      >
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={
            expanded
              ? "Reduce category chart"
              : "Enlarge category chart"
          }
          style={{
            position:
              expanded
                ? "absolute"
                : "absolute",
            top: expanded
              ? "18px"
              : "-4px",
            right: expanded
              ? "18px"
              : "-4px",
            width: "36px",
            height: "36px",
            borderRadius:
              "10px",
            border:
              "1px solid #dbe4f0",
            background:
              "#ffffff",
            color:
              "#52627a",
            display: "grid",
            placeItems:
              "center",
            cursor:
              "pointer",
            boxShadow:
              "0 4px 12px rgba(15, 23, 42, 0.06)",
            zIndex: 10,
          }}
        >
          {expanded ? (
            <Minimize2
              size={16}
            />
          ) : (
            <Maximize2
              size={16}
            />
          )}
        </button>

        <div
          style={{
            display:
              "flex",
            flexDirection:
              expanded
                ? "row"
                : "column",
            alignItems:
              expanded
                ? "center"
                : "center",
            justifyContent:
              expanded
                ? "center"
                : "flex-start",
            gap:
              expanded
                ? "60px"
                : "20px",
            width:
              "100%",
            minHeight:
              expanded
                ? "100%"
                : undefined,
          }}
        >
          <div
            style={{
              position:
                "relative",
              width:
                expanded
                  ? "420px"
                  : "235px",
              height:
                expanded
                  ? "420px"
                  : "235px",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 320 320"
              width="100%"
              height="100%"
              role="img"
              aria-label="Spending by category"
              style={{
                overflow:
                  "visible",
                cursor:
                  "pointer",
              }}
            >
              {segments.map(
                (segment) => {
                  const isHovered =
                    hoveredCategory?.category ===
                    segment.category;

                  return (
                    <path
                      key={
                        segment.category
                      }
                      d={describeDonutSegment(
                        segment.startAngle,
                        segment.endAngle,
                        isHovered
                          ? 126
                          : 120,
                        72,
                        center,
                        center
                      )}
                      fill={
                        segment.color
                      }
                      stroke="#ffffff"
                      strokeWidth="3"
                      style={{
                        transition:
                          "all 180ms ease",
                        cursor:
                          "pointer",
                        filter:
                          isHovered
                            ? "drop-shadow(0 6px 10px rgba(15,23,42,0.14))"
                            : "none",
                      }}
                      onMouseEnter={() =>
                        setHoveredCategory(
                          segment
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredCategory(
                          null
                        )
                      }
                      onClick={
                        onToggleExpanded
                      }
                    />
                  );
                }
              )}

              <circle
                cx="160"
                cy="160"
                r="71"
                fill="white"
                onClick={
                  onToggleExpanded
                }
              />

              <text
                x="160"
                y="151"
                textAnchor="middle"
                fill="#101a35"
                fontSize={
                  expanded
                    ? "25"
                    : "21"
                }
                fontWeight="800"
              >
                {formatCurrency(
                  totalSpent
                )}
              </text>

              <text
                x="160"
                y="173"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
              >
                Total spent
              </text>
            </svg>

            {hoveredCategory && (
              <div
                style={{
                  position:
                    "absolute",
                  left: "50%",
                  top: expanded
                    ? "8%"
                    : "4%",
                  transform:
                    "translate(-50%, -100%)",
                  minWidth:
                    "210px",
                  background:
                    "#101a35",
                  color:
                    "white",
                  borderRadius:
                    "14px",
                  padding:
                    "14px",
                  boxShadow:
                    "0 15px 35px rgba(15, 23, 42, 0.25)",
                  pointerEvents:
                    "none",
                  zIndex: 20,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    marginBottom:
                      "8px",
                  }}
                >
                  <span
                    style={{
                      width:
                        "9px",
                      height:
                        "9px",
                      borderRadius:
                        "50%",
                      background:
                        hoveredCategory.color,
                    }}
                  />

                  <strong>
                    {
                      hoveredCategory.category
                    }
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    fontSize:
                      "12px",
                    marginTop:
                      "6px",
                  }}
                >
                  <span
                    style={{
                      opacity:
                        0.7,
                    }}
                  >
                    Amount
                  </span>

                  <strong>
                    {formatCurrency(
                      hoveredCategory.amount
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    fontSize:
                      "12px",
                    marginTop:
                      "6px",
                  }}
                >
                  <span
                    style={{
                      opacity:
                        0.7,
                    }}
                  >
                    Share
                  </span>

                  <strong>
                    {hoveredCategory.percentage.toFixed(
                      1
                    )}
                    %
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    fontSize:
                      "12px",
                    marginTop:
                      "6px",
                  }}
                >
                  <span
                    style={{
                      opacity:
                        0.7,
                    }}
                  >
                    Transactions
                  </span>

                  <strong>
                    {
                      hoveredCategory
                        .transactions
                        .length
                    }
                  </strong>
                </div>

                <div
                  style={{
                    marginTop:
                      "10px",
                    paddingTop:
                      "9px",
                    borderTop:
                      "1px solid rgba(255,255,255,0.12)",
                    color:
                      "#9fc6ff",
                    fontSize:
                      "10px",
                  }}
                >
                  Click the chart to
                  enlarge it.
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              width:
                expanded
                  ? "min(420px, 100%)"
                  : "100%",
              maxWidth:
                expanded
                  ? "420px"
                  : "100%",
            }}
          >
            {expanded && (
              <div
                style={{
                  marginBottom:
                    "20px",
                }}
              >
                <span className="card-eyebrow">
                  Spending breakdown
                </span>

                <h2
                  style={{
                    margin:
                      "6px 0 8px",
                  }}
                >
                  Where your money goes
                </h2>

                <p
                  style={{
                    margin: 0,
                    color:
                      "#64748b",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.6,
                  }}
                >
                  Hover over any
                  segment for a quick
                  explanation. Click the
                  chart to return to the
                  normal dashboard view.
                </p>
              </div>
            )}

            <div className="category-items">
              {categories.map(
                (item, index) => (
                  <div
                    className="category-item"
                    key={
                      item.category
                    }
                    onMouseEnter={() =>
                      setHoveredCategory(
                        segments[index]
                      )
                    }
                    onMouseLeave={() =>
                      setHoveredCategory(
                        null
                      )
                    }
                    style={{
                      cursor:
                        "pointer",
                    }}
                  >
                    <div>
                      <span
                        className="category-dot"
                        style={{
                          background:
                            segments[
                              index
                            ].color,
                        }}
                      />

                      <span>
                        {
                          item.category
                        }
                      </span>
                    </div>

                    <strong>
                      {item.percentage.toFixed(
                        0
                      )}
                      %
                    </strong>
                  </div>
                )
              )}
            </div>

            {expanded && (
              <div
                className="category-breakdown-summary"
                style={{
                  marginTop:
                    "18px",
                  padding:
                    "14px",
                  borderRadius:
                    "14px",
                  background:
                    "#f7faff",
                  border:
                    "1px solid #e3eefc",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#64748b",
                    fontSize:
                      "12px",
                  }}
                >
                  <span>
                    Total spending
                  </span>

                  <strong
                    style={{
                      color:
                        "#101a35",
                    }}
                  >
                    {formatCurrency(
                      totalSpent
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#64748b",
                    fontSize:
                      "12px",
                    marginTop:
                      "8px",
                  }}
                >
                  <span>
                    Categories
                  </span>

                  <strong
                    style={{
                      color:
                        "#101a35",
                    }}
                  >
                    {categories.length}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#64748b",
                    fontSize:
                      "12px",
                    marginTop:
                      "8px",
                  }}
                >
                  <span>
                    Transactions
                  </span>

                  <strong
                    style={{
                      color:
                        "#101a35",
                    }}
                  >
                    {categories.reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        item
                          .transactions
                          .length,
                      0
                    )}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function RecentTransactions({
  transactions,
  search,
  setSearch,
  filter,
  setFilter,
  onDelete,
  transactionsRef,
  highlightDate,
}) {
  const filteredTransactions =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) => {
            const searchValue =
              search
                .toLowerCase()
                .trim();

            const matchesSearch =
              transaction.name
                .toLowerCase()
                .includes(
                  searchValue
                ) ||
              transaction.category
                .toLowerCase()
                .includes(
                  searchValue
                );

            const matchesFilter =
              filter === "all" ||
              transaction.type ===
                filter;

            return (
              matchesSearch &&
              matchesFilter
            );
          }
        )
        .sort(
          (a, b) =>
            new Date(
              b.date
            ) -
            new Date(a.date)
        );
    }, [
      transactions,
      search,
      filter,
    ]);

  return (
    <div
      className="transactions-card"
      ref={transactionsRef}
    >
      <div className="transactions-header">
        <div>
          <span className="card-eyebrow">
            Your financial activity
          </span>

          <h2>
            Recent transactions
          </h2>
        </div>

        <button className="view-all-button">
          View all
        </button>
      </div>

      <div className="transaction-controls">
        <div className="transaction-search">
          <Search size={16} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search transactions..."
          />
        </div>

        <div className="transaction-filter">
          <Filter size={14} />

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
              )
            }
            aria-label="Filter transactions"
          >
            <option value="all">
              All transactions
            </option>

            <option value="income">
              Income
            </option>

            <option value="expense">
              Expenses
            </option>
          </select>

          <ChevronDown size={14} />
        </div>
      </div>

      <div className="transaction-table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>
                Transaction
              </th>

              <th>Category</th>

              <th>Date</th>

              <th className="amount-column">
                Amount
              </th>

              <th />
            </tr>
          </thead>

          <tbody>
            {filteredTransactions.map(
              (transaction) => {
                const highlighted =
                  highlightDate ===
                  transaction.date;

                return (
                  <tr
                    key={
                      transaction.id
                    }
                    data-date={
                      transaction.date
                    }
                    style={{
                      background:
                        highlighted
                          ? "#edf6ff"
                          : undefined,
                      transition:
                        "background 250ms ease",
                    }}
                  >
                    <td>
                      <div className="transaction-name">
                        <div
                          className={`transaction-icon ${
                            transaction.type ===
                            "income"
                              ? "income"
                              : "expense"
                          }`}
                        >
                          {transaction.type ===
                          "income" ? (
                            <ArrowDownRight
                              size={
                                16
                              }
                            />
                          ) : (
                            <ArrowUpRight
                              size={
                                16
                              }
                            />
                          )}
                        </div>

                        <div>
                          <strong>
                            {
                              transaction.name
                            }
                          </strong>

                          <span>
                            {transaction.type ===
                            "income"
                              ? "Money received"
                              : "Money spent"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="category-pill">
                        {
                          transaction.category
                        }
                      </span>
                    </td>

                    <td className="date-cell">
                      {formatDate(
                        transaction.date
                      )}
                    </td>

                    <td
                      className={`amount-cell ${
                        transaction.type ===
                        "income"
                          ? "income"
                          : "expense"
                      }`}
                    >
                      {transaction.type ===
                      "income"
                        ? "+"
                        : "-"}

                      {formatCurrency(
                        transaction.amount
                      )}
                    </td>

                    <td>
                      <button
                        className="delete-transaction"
                        onClick={() =>
                          onDelete(
                            transaction.id
                          )
                        }
                        aria-label={`Delete ${transaction.name}`}
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>

        {!filteredTransactions.length && (
          <div className="empty-transactions">
            <Search size={22} />

            <strong>
              No transactions found
            </strong>

            <span>
              Try changing your
              search or filter.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTransactionModal({
  onClose,
  onAdd,
  user = null,
}) {
  const [name, setName] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [type, setType] =
    useState("expense");

  const [category, setCategory] =
    useState("Food");

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const categories =
    type === "income"
      ? [
          "Income",
          "Salary",
          "Freelance",
          "Investment",
          "Other",
        ]
      : [
          "Food",
          "Shopping",
          "Housing",
          "Utilities",
          "Transport",
          "Subscriptions",
          "Groceries",
          "Other",
        ];

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      !name.trim() ||
      !amount ||
      Number(amount) <= 0 ||
      !date
    ) {
      return;
    }

    onAdd({
      id: Date.now(),
      name: name.trim(),
      amount: Number(amount),
      type,
      category,
      date,
    });

    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="transaction-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <span className="card-eyebrow">
              {user ? "Saved to your account" : "Guest mode"}
            </span>

            <h2>
              Add transaction
            </h2>
          </div>

          <button
            onClick={onClose}
            className="modal-close"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <label>
            Transaction name

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="e.g. Grocery shopping"
              autoFocus
            />
          </label>

          <label>
            Amount

            <div className="amount-input">
              <span>₹</span>

              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="0"
              />
            </div>
          </label>

          <label>
            Date

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Type

            <select
              value={type}
              onChange={(event) => {
                const nextType =
                  event.target.value;

                setType(
                  nextType
                );

                setCategory(
                  nextType ===
                    "income"
                    ? "Income"
                    : "Food"
                );
              }}
            >
              <option value="expense">
                Expense
              </option>

              <option value="income">
                Income
              </option>
            </select>
          </label>

          <label>
            Category

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <button
            className="modal-submit"
            type="submit"
          >
            <Plus size={17} />
            Add transaction
          </button>
        </form>
      </div>
    </div>
  );
}

function LockedFeatureModal({
  title,
  description,
  onClose,
  onCreateAccount,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="locked-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="modal-close"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div className="locked-icon">
          <LockKeyhole
            size={24}
          />
        </div>

        <span className="card-eyebrow">
          Available with an account
        </span>

        <h2>{title}</h2>

        <p>{description}</p>

        <button
          className="modal-submit"
          onClick={
            onCreateAccount
          }
        >
          Create a free account
          <ArrowUpRight
            size={17}
          />
        </button>

        <button
          className="modal-secondary"
          onClick={onClose}
        >
          Continue exploring
        </button>
      </div>
    </div>
  );
}

function ExperienceChooser({
  onSampleData,
  onOwnData,
  onBack,
}) {
  return (
    <div
      className="dashboard-experience-shell"
      style={{
        minHeight: "100vh",
        background: "#f7f9fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1040px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            background:
              "transparent",
            color: "#64748b",
            fontWeight: 700,
            cursor:
              "pointer",
            padding: "8px 0",
            marginBottom:
              "42px",
          }}
        >
          ← Back to Avenza
        </button>

        <div
          style={{
            textAlign:
              "center",
            maxWidth:
              "720px",
            margin:
              "0 auto 42px",
          }}
        >
          <div
            className="coming-soon-icon"
            style={{
              margin:
                "0 auto 20px",
            }}
          >
            <Sparkles
              size={26}
            />
          </div>

          <span className="section-kicker">
            Your Avenza experience
          </span>

          <h1
            style={{
              margin:
                "10px 0 14px",
            }}
          >
            How would you like
            to experience Avenza?
          </h1>

          <p
            style={{
              margin: 0,
              color:
                "#64748b",
              fontSize:
                "17px",
              lineHeight:
                1.7,
            }}
          >
            Start with realistic
            sample data to
            understand what Avenza
            can do, or start from
            zero and build your own
            financial picture.
          </p>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "22px",
          }}
        >
          <button
            type="button"
            onClick={
              onSampleData
            }
            style={{
              textAlign:
                "left",
              border:
                "1px solid #dbe7f6",
              borderRadius:
                "24px",
              background:
                "white",
              padding:
                "30px",
              cursor:
                "pointer",
              boxShadow:
                "0 16px 45px rgba(20, 115, 234, 0.08)",
              color:
                "#101a35",
            }}
          >
            <div
              style={{
                width:
                  "48px",
                height:
                  "48px",
                borderRadius:
                  "15px",
                background:
                  "#eaf3ff",
                color:
                  "#1473ea",
                display:
                  "grid",
                placeItems:
                  "center",
                marginBottom:
                  "22px",
              }}
            >
              <BarChart3
                size={23}
              />
            </div>

            <span
              style={{
                display:
                  "block",
                color:
                  "#1473ea",
                fontSize:
                  "12px",
                fontWeight:
                  800,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.08em",
                marginBottom:
                  "8px",
              }}
            >
              Guided experience
            </span>

            <h2
              style={{
                margin:
                  "0 0 10px",
                fontSize:
                  "25px",
              }}
            >
              Play with our data
            </h2>

            <p
              style={{
                margin:
                  "0 0 24px",
                color:
                  "#64748b",
                lineHeight:
                  1.65,
              }}
            >
              Explore Avenza using
              realistic pre-loaded
              transactions and see how
              your balance, spending,
              categories, insights and
              AI can work together.
            </p>

            <span
              style={{
                color:
                  "#1473ea",
                fontWeight:
                  800,
              }}
            >
              Play with our data →
            </span>
          </button>

          <button
            type="button"
            onClick={
              onOwnData
            }
            style={{
              textAlign:
                "left",
              border:
                "1px solid #dbe7f6",
              borderRadius:
                "24px",
              background:
                "white",
              padding:
                "30px",
              cursor:
                "pointer",
              boxShadow:
                "0 16px 45px rgba(16, 26, 53, 0.06)",
              color:
                "#101a35",
            }}
          >
            <div
              style={{
                width:
                  "48px",
                height:
                  "48px",
                borderRadius:
                  "15px",
                background:
                  "#ecfbf7",
                color:
                  "#159b79",
                display:
                  "grid",
                placeItems:
                  "center",
                marginBottom:
                  "22px",
              }}
            >
              <WalletCards
                size={23}
              />
            </div>

            <span
              style={{
                display:
                  "block",
                color:
                  "#159b79",
                fontSize:
                  "12px",
                fontWeight:
                  800,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.08em",
                marginBottom:
                  "8px",
              }}
            >
              Personal workspace
            </span>

            <h2
              style={{
                margin:
                  "0 0 10px",
                fontSize:
                  "25px",
              }}
            >
              Play with your data
            </h2>

            <p
              style={{
                margin:
                  "0 0 24px",
                color:
                  "#64748b",
                lineHeight:
                  1.65,
              }}
            >
              Start with a completely
              blank workspace. Add
              transactions yourself or
              import up to 100
              transactions from your
              existing financial files.
            </p>

            <span
              style={{
                color:
                  "#159b79",
                fontWeight:
                  800,
              }}
            >
              Play with your data →
            </span>
          </button>
        </div>

        <p
          style={{
            textAlign:
              "center",
            color:
              "#94a3b8",
            fontSize:
              "13px",
            marginTop:
              "28px",
          }}
        >
          You can switch between
          these experiences later.
          No account is required to
          explore guest mode.
        </p>
      </div>
    </div>
  );
}

function BlankWorkspace({
  onAddTransaction,
  onImportData,
}) {
  return (
    <div
      className="blank-workspace"
      style={{
        border:
          "1px solid #dbe7f6",
        borderRadius:
          "24px",
        background:
          "white",
        padding:
          "48px 28px",
        textAlign:
          "center",
        boxShadow:
          "0 14px 40px rgba(16, 26, 53, 0.04)",
      }}
    >
      <div
        className="coming-soon-icon"
        style={{
          margin:
            "0 auto 18px",
        }}
      >
        <WalletCards
          size={26}
        />
      </div>

      <span className="section-kicker">
        Your workspace is ready
      </span>

      <h2
        style={{
          margin:
            "10px 0 10px",
          fontSize:
            "30px",
        }}
      >
        Start with your own
        financial data.
      </h2>

      <p
        style={{
          maxWidth:
            "620px",
          margin:
            "0 auto 28px",
          color:
            "#64748b",
          lineHeight:
            1.7,
        }}
      >
        Nothing has been added yet.
        Create transactions manually
        or bring in up to 100
        transactions from a bank
        statement, spreadsheet or
        supported financial file.
      </p>

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "center",
          gap: "12px",
          flexWrap:
            "wrap",
        }}
      >
        <button
          className="dashboard-add-button"
          onClick={
            onAddTransaction
          }
        >
          <Plus size={17} />
          Add transaction
        </button>

        <label
          className="dashboard-account-button"
          style={{
            background:
              "#eef6ff",
            color:
              "#1473ea",
            boxShadow:
              "none",
            cursor:
              "pointer",
          }}
        >
          <Upload size={17} />

          Import up to 100
          transactions

          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.ofx,.qif,.txt"
            onChange={(event) =>
              onImportData(
                event.target.files?.[0]
              )
            }
            style={{
              display:
                "none",
            }}
          />
        </label>
      </div>

      <div
        style={{
          marginTop:
            "30px",
          display:
            "flex",
          justifyContent:
            "center",
          gap: "20px",
          flexWrap:
            "wrap",
          color:
            "#94a3b8",
          fontSize:
            "13px",
        }}
      >
        <span>CSV</span>
        <span>Excel</span>
        <span>
          Bank statements
        </span>
        <span>PDF</span>
        <span>
          AI-ready normalization
        </span>
      </div>
    </div>
  );
}


function ReportsPage({ transactions = [], user, darkMode = false }) {
  const [period, setPeriod] = useState("this-month");

  const availableMonths = useMemo(() => {
    const keys = [...new Set(transactions.map((item) => String(item.date || "").slice(0, 7)).filter((key) => /^\d{4}-\d{2}$/.test(key)))].sort().reverse();
    return keys;
  }, [transactions]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setDate(1);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const filteredTransactions = useMemo(() => {
    let selectedMonth = period;
    if (period === "this-month") selectedMonth = currentMonth;
    if (period === "last-month") selectedMonth = previousMonth;
    const selected = period === "all" ? transactions : transactions.filter((item) => String(item.date || "").startsWith(selectedMonth));
    return [...selected].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [transactions, period, currentMonth, previousMonth]);

  const reportTotals = useMemo(() => filteredTransactions.reduce((acc, item) => {
    const amount = toAmount(item.amount);
    if (item.type === "income") acc.income += amount;
    else acc.expenses += amount;
    return acc;
  }, { income: 0, expenses: 0 }), [filteredTransactions]);

  const categoryTotals = useMemo(() => {
    const grouped = {};
    filteredTransactions.filter((item) => item.type !== "income").forEach((item) => {
      const category = String(item.category || "Other");
      grouped[category] = (grouped[category] || 0) + toAmount(item.amount);
    });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

  const periodLabel = period === "all" ? "All time" : period === "this-month" ? new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${currentMonth}-01T00:00:00`)) : period === "last-month" ? new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${previousMonth}-01T00:00:00`)) : new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${period}-01T00:00:00`));

  const formatReportDate = (value) => {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  const exportCsv = () => {
    const rows = [
      ["Avenza financial report", periodLabel],
      ["Account holder", user?.email || "Avenza user"],
      [],
      ["Summary", "Amount (INR)"],
      ["Income", reportTotals.income],
      ["Expenses", reportTotals.expenses],
      ["Net cash flow", reportTotals.income - reportTotals.expenses],
      [],
      ["Date", "Transaction", "Type", "Category", "Amount (INR)"],
      ...filteredTransactions.map((item) => [item.date || "", item.name || item.description || "Transaction", item.type || "expense", item.category || "Other", toAmount(item.amount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `avenza-report-${period === "all" ? "all-time" : periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const largestCategory = categoryTotals[0];

  return (
    <section className={`reports-page ${darkMode ? "reports-dark" : ""}`} aria-label="Financial reports">
      <div className="reports-heading no-print">
        <div>
          <span className="section-kicker">Your financial snapshot</span>
          <h1>Reports</h1>
          <p>Review your money in and out, spot spending patterns, and export a report you can keep or print.</p>
        </div>
        <div className="reports-actions">
          <button type="button" className="reports-secondary-button" onClick={exportCsv}><FileSpreadsheet size={17} /> Export CSV</button>
          <button type="button" className="reports-primary-button" onClick={() => window.print()}><FileText size={17} /> Print report</button>
        </div>
      </div>

      <div className="reports-toolbar no-print">
        <label htmlFor="reports-period">Reporting period</label>
        <select id="reports-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="this-month">This month</option>
          <option value="last-month">Last month</option>
          <option value="all">All time</option>
          {availableMonths.filter((month) => month !== currentMonth && month !== previousMonth).map((month) => <option key={month} value={month}>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`))}</option>)}
        </select>
        <div className="reports-period-note">{periodLabel} · {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? "" : "s"}</div>
      </div>

      <div className="reports-print-heading print-only">
        <h1>Avenza Financial Report</h1>
        <p>{periodLabel} · Prepared for {user?.email || "Avenza user"}</p>
      </div>

      <div className="reports-summary-grid">
        <article className="reports-summary-card"><span>Total income</span><strong className="report-income">{formatCurrency(reportTotals.income)}</strong><small>Money received in this period</small></article>
        <article className="reports-summary-card"><span>Total expenses</span><strong className="report-expense">{formatCurrency(reportTotals.expenses)}</strong><small>Money spent in this period</small></article>
        <article className="reports-summary-card"><span>Net cash flow</span><strong className={reportTotals.income - reportTotals.expenses >= 0 ? "report-income" : "report-expense"}>{formatCurrency(reportTotals.income - reportTotals.expenses)}</strong><small>Income minus expenses</small></article>
        <article className="reports-summary-card"><span>Transactions</span><strong>{filteredTransactions.length.toLocaleString("en-IN")}</strong><small>Included in this report</small></article>
      </div>

      <div className="reports-content-grid">
        <article className="reports-panel">
          <div className="reports-panel-heading"><div><span className="card-eyebrow">Spending breakdown</span><h2>Where your money went</h2></div></div>
          {categoryTotals.length ? <div className="reports-category-list">{categoryTotals.slice(0, 8).map(([category, amount]) => <div className="reports-category-row" key={category}><div className="reports-category-label"><span>{category}</span><strong>{formatCurrency(amount)}</strong></div><div className="reports-category-track"><span style={{ width: `${Math.max(2, reportTotals.expenses ? (amount / reportTotals.expenses) * 100 : 0)}%` }} /></div></div>)}</div> : <div className="reports-empty">No expenses found for this period.</div>}
        </article>

        <article className="reports-panel">
          <div className="reports-panel-heading"><div><span className="card-eyebrow">Report notes</span><h2>At a glance</h2></div></div>
          {filteredTransactions.length ? <div className="reports-observations"><p>{reportTotals.income > reportTotals.expenses ? `You finished this period with ${formatCurrency(reportTotals.income - reportTotals.expenses)} more income than expenses.` : reportTotals.income < reportTotals.expenses ? `Expenses exceeded recorded income by ${formatCurrency(reportTotals.expenses - reportTotals.income)} during this period.` : "Recorded income and expenses are currently balanced for this period."}</p>{largestCategory && <p>Your largest expense category is <strong>{largestCategory[0]}</strong>, accounting for {Math.round((largestCategory[1] / (reportTotals.expenses || 1)) * 100)}% of recorded expenses.</p>}<p className="reports-note-muted">These observations are calculated from your saved transactions. They are not AI-generated financial advice.</p></div> : <div className="reports-empty">Add or import transactions to generate your report.</div>}
        </article>
      </div>

      <article className="reports-panel reports-transactions-panel">
        <div className="reports-panel-heading"><div><span className="card-eyebrow">Report details</span><h2>Transactions included</h2></div><span className="reports-count-badge">{filteredTransactions.length} records</span></div>
        {filteredTransactions.length ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Date</th><th>Transaction</th><th>Category</th><th>Type</th><th className="report-amount-cell">Amount</th></tr></thead><tbody>{filteredTransactions.map((item) => <tr key={item.id}><td>{formatReportDate(item.date)}</td><td>{item.name || item.description || "Transaction"}</td><td>{item.category || "Other"}</td><td><span className={`reports-type-pill ${item.type === "income" ? "income" : "expense"}`}>{item.type === "income" ? "Income" : "Expense"}</span></td><td className={`report-amount-cell ${item.type === "income" ? "report-income" : "report-expense"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div> : <div className="reports-empty">No transactions to display.</div>}
      </article>
      <div className="reports-footer print-only">Generated by Avenza · Your financial data stays yours.</div>
    </section>
  );
}

export default function GuestDashboard({
  onBackToLanding,
  onOpenAuth,
  onSignOut,
  signOutLoading = false,
  user = null,
}) {
  const [
    transactions,
    setTransactions,
  ] = useState(() => (user ? [] : initialTransactions));
  const [transactionsLoading, setTransactionsLoading] = useState(Boolean(user));
  const [transactionError, setTransactionError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  useEffect(() => {
    if (!user?.uid) {
      setAccounts([]);
      setSelectedAccountId("all");
      return undefined;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "accounts"),
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        next.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || String(a.name || "").localeCompare(String(b.name || "")));
        setAccounts(next);
        setSelectedAccountId((current) => current !== "all" && next.some((account) => account.id === current) ? current : "all");
      },
      (error) => console.error("Avenza account selector could not load accounts:", error)
    );
  }, [user?.uid]);

  const [
    experience,
    setExperience,
  ] = useState(user ? "own" : "chooser");

  useEffect(() => {
    if (user) {
      setExperience("own");
      setActivePage("overview");
    }
  }, [user?.uid]);

  const [
    activePage,
    setActivePage,
  ] = useState(
    "overview"
  );

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [
    showSidebar,
    setShowSidebar,
  ] = useState(false);

  const [
    showAddTransaction,
    setShowAddTransaction,
  ] = useState(false);

  const [
    lockedFeature,
    setLockedFeature,
  ] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    if (!user?.uid || typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(`avenza-dark-mode-${user.uid}`) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!user?.uid) {
      setDarkMode(false);
      return;
    }

    try {
      setDarkMode(
        window.localStorage.getItem(`avenza-dark-mode-${user.uid}`) === "true"
      );
    } catch {
      setDarkMode(false);
    }
  }, [user?.uid]);

  const handleDarkModeToggle = () => {
    if (!user) {
      setLockedFeature({
        title: "Dark mode is an account feature.",
        description:
          "Create a free Avenza account to personalize your workspace and switch between light mode and our soft-grey dark mode.",
      });
      return;
    }

    setDarkMode((currentMode) => {
      const nextMode = !currentMode;
      try {
        window.localStorage.setItem(
          `avenza-dark-mode-${user.uid}`,
          String(nextMode)
        );
        window.dispatchEvent(
          new CustomEvent("avenza-theme-change", {
            detail: { uid: user.uid, darkMode: nextMode },
          })
        );
      } catch (error) {
        console.warn("Avenza could not save the theme preference:", error);
      }
      return nextMode;
    });
  };

  const [
    expandedChart,
    setExpandedChart,
  ] = useState(null);

  const [
    highlightDate,
    setHighlightDate,
  ] = useState(null);

  const transactionsRef =
    useRef(null);
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) {
      setTransactions(initialTransactions);
      setTransactionsLoading(false);
      setTransactionError("");
      return undefined;
    }

    setTransactionsLoading(true);
    setTransactionError("");

    const transactionsCollection = collection(
      db,
      "users",
      userId,
      "transactions"
    );
    const transactionsQuery = query(
      transactionsCollection,
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        setTransactions(
          snapshot.docs
            .map((transactionDoc) =>
              normalizeTransaction(
                transactionDoc.data(),
                transactionDoc.id
              )
            )
            // Demo records should never be counted as personal finances.
            .filter((transaction) => transaction.isSample !== true)
            // Ignore malformed records that cannot be plotted safely.
            .filter((transaction) => transaction.date && transaction.amount >= 0)
        );
        setTransactionsLoading(false);
        setTransactionError("");
      },
      (error) => {
        console.error("Avenza transaction sync error:", error);
        setTransactions([]);
        setTransactionsLoading(false);
        setTransactionError(
          "Avenza couldn't load your saved transactions. Check your connection and Firestore security rules, then try again."
        );
      }
    );

    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    window.history.pushState(
      {
        avenzaGuestDashboard:
          true,
      },
      "",
      window.location.href
    );

    const handlePopState =
      () => {
        if (
          onBackToLanding
        ) {
          onBackToLanding();
        }
      };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [
    onBackToLanding,
  ]);

  const accountTransactions = useMemo(
    () => selectedAccountId === "all" ? transactions : transactions.filter((transaction) => transaction.accountId === selectedAccountId),
    [transactions, selectedAccountId]
  );

  const totals = useMemo(() => {
    const income =
      accountTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "income"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            toAmount(transaction.amount),
          0
        );

    const expenses =
      accountTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "expense"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            toAmount(transaction.amount),
          0
        );

    return {
      income,
      expenses,
      balance:
        income - expenses,
    };
  }, [accountTransactions]);

  const spendingCategories =
    useMemo(() => {
      const grouped = {};

      accountTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "expense"
        )
        .forEach(
          (transaction) => {
            grouped[
              transaction.category
            ] =
              (grouped[
                transaction.category
              ] || 0) +
              transaction.amount;
          }
        );

      return Object.entries(
        grouped
      ).sort(
        ([, amountA], [, amountB]) =>
          amountB - amountA
      );
    }, [accountTransactions]);

  const addTransaction = async (transaction) => {
    setTransactionError("");

    if (!transaction || typeof transaction !== "object") {
      setTransactionError("Please enter valid transaction details.");
      return;
    }

    const normalized = normalizeTransaction(transaction);
    const name = String(
      transaction.name ?? transaction.description ?? transaction.title ?? ""
    ).trim();
    const amount = toAmount(
      transaction.amount ?? transaction.value ?? transaction.total
    );
    const type = normalized.type;
    const category =
      String(transaction.category ?? "").trim() ||
      (type === "income" ? "Income" : "Other");
    const date = toDateString(
      transaction.date ??
      transaction.transactionDate ??
      transaction.createdAt
    );

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date) {
      setTransactionError(
        "Please enter a transaction name, a valid amount, and a valid date."
      );
      return;
    }

    const transactionData = {
      name,
      amount,
      type,
      category,
      date,
    };

    if (!user) {
      setTransactions((previous) => [
        { ...transactionData, id: transaction.id ?? Date.now() },
        ...previous,
      ]);
      return;
    }

    try {
      const accountId = selectedAccountId !== "all" ? selectedAccountId : await getOrCreateDefaultAccountId(user.uid);
      await addDoc(
        collection(db, "users", user.uid, "transactions"),
        {
          ...transactionData,
          accountId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error("Avenza transaction save error:", error);

      if (error?.code === "permission-denied") {
        setTransactionError(
          "Firebase denied permission to save this transaction. Check your Firestore security rules."
        );
      } else {
        setTransactionError(
          `Unable to save transaction: ${error?.message || "Unknown Firebase error."}`
        );
      }
    }
  };

  const deleteTransaction = async (id) => {
    setTransactionError("");

    if (!user) {
      setTransactions((previous) =>
        previous.filter((transaction) => transaction.id !== id)
      );
      return;
    }

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "transactions", String(id))
      );
    } catch (error) {
      console.error("Avenza transaction delete error:", error);
      setTransactionError(
        "We couldn't delete this transaction. Please check your connection and try again."
      );
    }
  };

  const handleCreateAccount = () => {
    setLockedFeature(null);

    if (user) {
      if (onSignOut) {
        onSignOut();
      }
      return;
    }

    if (onOpenAuth) {
      onOpenAuth("signup");
    } else {
      setTransactionError("Please return to the landing page to create your account.");
    }
  };

  const handleBack = () => {
    if (
      onBackToLanding
    ) {
      onBackToLanding();
    }
  };

  const handleSampleData = () => {
    setTransactionError("");

    // Demo transactions are for guest exploration only. Never write them
    // into an authenticated user's personal Firestore collection.
    if (user) {
      setExperience("own");
      setActivePage("overview");
      return;
    }

    setTransactions(initialTransactions.map((transaction) => normalizeTransaction(transaction)));
    setExperience("sample");
    setActivePage("overview");
  };

  const handleOwnData = () => {
    if (!user) {
      setTransactions([]);
    }

    setExperience("own");
    setActivePage("overview");
  };

  const handleImportData = (
    file
  ) => {
    if (!file) {
      return;
    }

    setLockedFeature({
      title:
        "Bring your financial data to Avenza.",

      description:
        `We received “${file.name}”. The free experience will support up to 100 transactions per import from bank statements, Excel, CSV and other supported financial files. The AI-powered file reader will normalize different formats into Avenza's transaction structure in the next stage.`,
    });
  };

  const handleImportTransactions = async (rows) => {
    if (!user?.uid) {
      throw new Error("Please sign in before importing transactions.");
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("There are no valid transactions to import.");
    }
    if (rows.length > 100) {
      throw new Error("Please import no more than 100 transactions at a time.");
    }

    const batch = writeBatch(db);
    const userTransactions = collection(db, "users", user.uid, "transactions");
    const accountId = selectedAccountId !== "all" ? selectedAccountId : await getOrCreateDefaultAccountId(user.uid);

    rows.forEach((row) => {
      const name = String(row.name || row.description || "").trim();
      const amount = Number(row.amount);
      const type = row.type === "income" ? "income" : "expense";
      const category = String(
        row.category || (type === "income" ? "Income" : "Other")
      ).trim();
      const date = toDateString(row.date);

      if (!name || !Number.isFinite(amount) || amount <= 0 || !date || !category) {
        throw new Error(
          "One or more rows contain invalid transaction details. Please review the file and try again."
        );
      }

      const transactionRef = doc(userTransactions);
      const data = {
        name: name.slice(0, 160),
        amount,
        type,
        category: category.slice(0, 80),
        date,
        accountId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        importSource: "file-import",
      };
      const notes = String(row.notes || "").trim();
      if (notes) data.notes = notes.slice(0, 500);
      batch.set(transactionRef, data);
    });

    try {
      await batch.commit();
      return rows.length;
    } catch (error) {
      console.error("Avenza transaction import failed:", error);
      if (error?.code === "permission-denied") {
        throw new Error(
          "Firebase denied this import. Check your Firestore security rules for users/{userId}/transactions."
        );
      }
      throw new Error(
        error?.message || "Avenza couldn't save these transactions. Please try again."
      );
    }
  };

  const handleChartPointClick =
    (date) => {
      setHighlightDate(date);

      requestAnimationFrame(
        () => {
          transactionsRef.current?.scrollIntoView(
            {
              behavior:
                "smooth",
              block:
                "start",
            }
          );
        }
      );

      window.setTimeout(
        () =>
          setHighlightDate(
            null
          ),
        2400
      );
    };

  const getInsight = () => {
    if (!totals.expenses) {
      return {
        title:
          "Your spending picture will appear here.",
        description:
          "Add an expense transaction and Avenza will start identifying your biggest spending categories and patterns.",
      };
    }

    const topCategory =
      spendingCategories[0];

    return {
      title: `Your largest spending category is ${topCategory?.[0] || "your expenses"}.`,
      description: `You've spent ${formatCurrency(
        topCategory?.[1] || 0
      )} in this category so far. Avenza will turn patterns like this into deeper recommendations once the AI layer is connected.`,
    };
  };

  const insight =
    getInsight();

  const renderPageContent =
    () => {
      // Signed-in users receive a working reports workspace; guests retain the preview gate.
      if (activePage === "reports" && user) {
        return <ReportsPage transactions={accountTransactions} user={user} darkMode={darkMode} />;
      }

      // Signed-in users should see the real transaction manager instead of
      // the old preview/locked-feature placeholder. Guest behaviour is unchanged.
      if (activePage === "spreadsheet") {
        return <SpreadsheetWorkspace user={user} onBack={() => setActivePage("overview")} />;
      }

      if (activePage === "accounts" && user) {
        return <AccountsPage user={user} onBack={() => setActivePage("overview")} />;
      }

      if (activePage === "transactions" && user) {
        return (
          <TransactionsPage
            user={user}
            selectedAccountId={selectedAccountId}
            onBack={() => setActivePage("overview")}
          />
        );
      }

      // Signed-in users should see the real financial analytics page.
      // Keep the existing preview behaviour for guests unchanged.
      if (activePage === "insights" && user) {
        return (
          <InsightsPage
            user={user}
            selectedAccountId={selectedAccountId}
            onBack={() => setActivePage("overview")}
          />
        );
      }

      // Signed-in users can import CSV and Excel transactions into their own account.
      if (activePage === "import" && user) {
        return (
          <TransactionImport
            transactions={accountTransactions}
            onImport={handleImportTransactions}
            onBack={() => setActivePage("overview")}
          />
        );
      }

      // Signed-in users should see the actual AI assistant, not the old preview.
      if (activePage === "assistant" && user) {
        return (
          <AIAssistant
            user={user}
            transactions={accountTransactions}
            onBack={() => setActivePage("overview")}
          />
        );
      }

      // Signed-in users can manage monthly category and overall budgets.
      if (activePage === "budgets" && user) {
        return <BudgetPage user={user} transactions={accountTransactions} onBack={() => setActivePage("overview")} />;
      }

      // Signed-in users can create and track their own Firestore savings goals.
      if (activePage === "goals" && user) {
        return (
          <GoalsPage
            user={user}
            transactions={accountTransactions}
            onBack={() => setActivePage("overview")}
          />
        );
      }

      if (
        activePage !==
        "overview"
      ) {
        const pages = {
          transactions: {
            title:
              "Transactions",
            description:
              "Review, search and manage your financial transactions.",
          },

          insights: {
            title:
              "Insights",
            description:
              "Avenza will turn your financial data into useful insights here.",
          },

          assistant: {
            title:
              "Avenza AI",
            description:
              "Ask questions about your finances and receive answers with charts and recommendations.",
          },

          goals: {
            title:
              "Financial goals",
            description:
              "Create savings goals and build a practical plan for reaching them.",
          },

          import: {
            title:
              "Import data",
            description:
              "Import CSV, Excel, PDF and supported bank statements into Avenza.",
          },

          reports: {
            title:
              "Reports",
            description:
              "Create printable financial reports containing your data, charts and AI analysis.",
          },
        };

        const page =
          pages[
            activePage
          ] ||
          pages.transactions;

        return (
          <div className="coming-soon-page">
            <div className="coming-soon-icon">
              {activePage ===
              "assistant" ? (
                <Sparkles
                  size={26}
                />
              ) : activePage ===
                "goals" ? (
                <Target
                  size={26}
                />
              ) : activePage ===
                "import" ? (
                <Upload
                  size={26}
                />
              ) : activePage ===
                "reports" ? (
                <FileText
                  size={26}
                />
              ) : (
                <BarChart3
                  size={26}
                />
              )}
            </div>

            <span className="section-kicker">
              Avenza preview
            </span>

            <h1>
              {page.title}
            </h1>

            <p>
              {page.description}
            </p>

            <button
              className="primary-button dashboard-page-button"
              onClick={() => {
                if (
                  activePage ===
                  "assistant"
                ) {
                  setLockedFeature(
                    {
                      title:
                        "Avenza AI is ready to become your financial assistant.",

                      description:
                        "Create a free account to save conversations, analyze your own financial data and receive personalized recommendations.",
                    }
                  );
                } else if (
                  activePage ===
                  "import"
                ) {
                  setLockedFeature(
                    {
                      title:
                        "Import your own financial data.",

                      description:
                        "Create a free account to import your existing CSV, Excel or bank statement data and keep it securely connected to your Avenza workspace.",
                    }
                  );
                } else {
                  setLockedFeature(
                    {
                      title: `${page.title} is part of your full Avenza workspace.`,

                      description:
                        "Create a free account to save your financial history and unlock the complete Avenza experience.",
                    }
                  );
                }
              }}
            >
              Unlock with a free
              account

              <ArrowUpRight
                size={18}
              />
            </button>
          </div>
        );
      }

      return (
        <>
          <div className="dashboard-page-heading">
            <div>
              <span className="section-kicker">
                {experience ===
                "own"
                  ? "Your workspace"
                  : "September 2026"}
              </span>

              <h1>
                Welcome, User.
              </h1>

              <p>
                Here's a simple view
                of your financial
                picture.
              </p>
            </div>

            <button
              className="dashboard-add-button"
              onClick={() =>
                setShowAddTransaction(
                  true
                )
              }
            >
              <Plus size={17} />
              Add transaction
            </button>
          </div>

          {experience ===
            "own" &&
          transactions.length ===
            0 ? (
            <BlankWorkspace
              onAddTransaction={() =>
                setShowAddTransaction(
                  true
                )
              }
              onImportData={
                handleImportData
              }
            />
          ) : (
            <>
              <div className="stats-grid-dashboard">
                <StatCard
                  title="Current balance"
                  value={formatCurrency(
                    totals.balance
                  )}
                  description="Income minus expenses"
                  icon={
                    <WalletCards
                      size={18}
                    />
                  }
                  iconClass="blue"
                  trend={
                    experience ===
                    "sample"
                      ? "12.4%"
                      : null
                  }
                  trendType="positive"
                />

                <StatCard
                  title="Total income"
                  value={formatCurrency(
                    totals.income
                  )}
                  description="Money received this month"
                  icon={
                    <ArrowDownRight
                      size={18}
                    />
                  }
                  iconClass="green"
                  trend={
                    experience ===
                    "sample"
                      ? "8.2%"
                      : null
                  }
                  trendType="positive"
                />

                <StatCard
                  title="Total expenses"
                  value={formatCurrency(
                    totals.expenses
                  )}
                  description="Money spent this month"
                  icon={
                    <ArrowUpRight
                      size={18}
                    />
                  }
                  iconClass="red"
                  trend={
                    experience ===
                    "sample"
                      ? "4.6%"
                      : null
                  }
                  trendType="negative"
                />
              </div>

              <div className="dashboard-main-grid">
                <div className="dashboard-panel spending-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="card-eyebrow">
                        Spending overview
                      </span>

                      <h2>
                        Spending this month
                      </h2>
                    </div>

                    {!expandedChart && (
                      <button className="period-button">
                        {transactions.length
                          ? formatMonth(
                              transactions[
                                0
                              ].date
                            )
                          : "Current month"}

                        <ChevronDown
                          size={14}
                        />
                      </button>
                    )}
                  </div>

                  <SpendingChart
                    transactions={
                      accountTransactions
                    }
                    expanded={
                      expandedChart ===
                      "graph"
                    }
                    onToggleExpanded={() =>
                      setExpandedChart(
                        (
                          current
                        ) =>
                          current ===
                          "graph"
                            ? null
                            : "graph"
                      )
                    }
                    onPointClick={
                      handleChartPointClick
                    }
                  />
                </div>

                <div className="dashboard-panel category-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="card-eyebrow">
                        Where your money goes
                      </span>

                      <h2>
                        Top categories
                      </h2>
                    </div>
                  </div>

                  <CategoryBreakdown
                    transactions={
                      accountTransactions
                    }
                    expanded={
                      expandedChart ===
                      "pie"
                    }
                    onToggleExpanded={() =>
                      setExpandedChart(
                        (
                          current
                        ) =>
                          current ===
                          "pie"
                            ? null
                            : "pie"
                      )
                    }
                  />
                </div>
              </div>

              <div className="insight-card">
                <div className="insight-card-icon">
                  <Sparkles
                    size={19}
                  />
                </div>

                <div className="insight-card-content">
                  <span>
                    Avenza insight
                  </span>

                  <strong>
                    {insight.title}
                  </strong>

                  <p>
                    {
                      insight.description
                    }
                  </p>
                </div>

                <button
                  onClick={() =>
                    setLockedFeature(
                      {
                        title:
                          "Turn this insight into a conversation.",

                        description:
                          "With an Avenza account, you can ask the AI assistant why your spending changed and what you can do about it.",
                      }
                    )
                  }
                >
                  Ask Avenza
                  <ArrowUpRight
                    size={15}
                  />
                </button>
              </div>

              <RecentTransactions
                transactions={
                  accountTransactions
                }
                search={search}
                setSearch={
                  setSearch
                }
                filter={filter}
                setFilter={
                  setFilter
                }
                onDelete={
                  deleteTransaction
                }
                transactionsRef={
                  transactionsRef
                }
                highlightDate={
                  highlightDate
                }
              />
            </>
          )}
        </>
      );
    };

  if (
    experience ===
    "chooser"
  ) {
    return (
      <ExperienceChooser
        onSampleData={
          handleSampleData
        }
        onOwnData={
          handleOwnData
        }
        onBack={handleBack}
      />
    );
  }

  return (
    <div className={`dashboard-app${darkMode && user ? " dashboard-dark-mode" : ""}`}>
      <style>{`
        .dashboard-app.dashboard-dark-mode {
          --avenza-dark-bg: #11151c;
          --avenza-dark-panel: #1b222c;
          --avenza-dark-panel-alt: #252e3a;
          --avenza-dark-border: #343f4e;
          --avenza-dark-text: #f1f5fb;
          --avenza-dark-muted: #a6b2c3;
          background: var(--avenza-dark-bg) !important;
          color: var(--avenza-dark-text);
          min-height: 100vh;
        }
        .dashboard-app.dashboard-dark-mode .dashboard-sidebar,
        .dashboard-app.dashboard-dark-mode .dashboard-sidebar-wrapper,
        .dashboard-app.dashboard-dark-mode .dashboard-topbar,
        .dashboard-app.dashboard-dark-mode .dashboard-content,
        .dashboard-app.dashboard-dark-mode .dashboard-content-inner,
        .dashboard-app.dashboard-dark-mode .dashboard-main,
        .dashboard-app.dashboard-dark-mode .dashboard-workspace {
          background: var(--avenza-dark-bg) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }
        .dashboard-app.dashboard-dark-mode .dashboard-sidebar,
        .dashboard-app.dashboard-dark-mode .dashboard-sidebar-wrapper {
          background: #171e27 !important;
        }
        .dashboard-app.dashboard-dark-mode .dashboard-stat-card,
        .dashboard-app.dashboard-dark-mode .spending-chart,
        .dashboard-app.dashboard-dark-mode .category-breakdown,
        .dashboard-app.dashboard-dark-mode .recent-transactions,
        .dashboard-app.dashboard-dark-mode .transaction-table-wrap,
        .dashboard-app.dashboard-dark-mode .insight-card,
        .dashboard-app.dashboard-dark-mode .coming-soon-page,
        .dashboard-app.dashboard-dark-mode .blank-workspace,
        .dashboard-app.dashboard-dark-mode .dashboard-card,
        .dashboard-app.dashboard-dark-mode .chart-card {
          background: var(--avenza-dark-panel) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
        }
        .dashboard-app.dashboard-dark-mode h1,
        .dashboard-app.dashboard-dark-mode h2,
        .dashboard-app.dashboard-dark-mode h3,
        .dashboard-app.dashboard-dark-mode strong,
        .dashboard-app.dashboard-dark-mode label,
        .dashboard-app.dashboard-dark-mode .dashboard-stat-value,
        .dashboard-app.dashboard-dark-mode .dashboard-stat-title,
        .dashboard-app.dashboard-dark-mode .dashboard-nav-item,
        .dashboard-app.dashboard-dark-mode .dashboard-back {
          color: var(--avenza-dark-text) !important;
        }
        .dashboard-app.dashboard-dark-mode p,
        .dashboard-app.dashboard-dark-mode span,
        .dashboard-app.dashboard-dark-mode .dashboard-stat-description,
        .dashboard-app.dashboard-dark-mode .card-eyebrow,
        .dashboard-app.dashboard-dark-mode .section-kicker,
        .dashboard-app.dashboard-dark-mode .chart-labels {
          color: var(--avenza-dark-muted);
        }
        .dashboard-app.dashboard-dark-mode .dashboard-nav-item.active {
          background: #263f5e !important;
          color: #8fc0ff !important;
        }
        .dashboard-app.dashboard-dark-mode input,
        .dashboard-app.dashboard-dark-mode select,
        .dashboard-app.dashboard-dark-mode textarea {
          background: var(--avenza-dark-panel-alt) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }
        .dashboard-app.dashboard-dark-mode .chart-grid-lines span {
          border-color: var(--avenza-dark-border) !important;
        }
        .dashboard-app.dashboard-dark-mode .locked-dark-mode {
          background: var(--avenza-dark-panel-alt) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }
        .dashboard-app.dashboard-dark-mode .transaction-modal {
          background: var(--avenza-dark-panel) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }
        .dashboard-app.dashboard-dark-mode .transaction-modal .modal-header h2,
        .dashboard-app.dashboard-dark-mode .transaction-modal label {
          color: var(--avenza-dark-text) !important;
        }
        .dashboard-app.dashboard-dark-mode .transaction-modal .card-eyebrow {
          color: var(--avenza-dark-muted) !important;
        }
        .dashboard-app.dashboard-dark-mode .transaction-modal .modal-close,
        .dashboard-app.dashboard-dark-mode .transaction-modal .modal-secondary {
          background: var(--avenza-dark-panel-alt) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }

        /* Dark theme: keep chart and transaction surfaces dark, not white. */
        .dashboard-app.dashboard-dark-mode .dashboard-panel,
        .dashboard-app.dashboard-dark-mode .spending-panel,
        .dashboard-app.dashboard-dark-mode .category-panel,
        .dashboard-app.dashboard-dark-mode .recent-transactions,
        .dashboard-app.dashboard-dark-mode .recent-transactions-panel,
        .dashboard-app.dashboard-dark-mode .transactions-panel,
        .dashboard-app.dashboard-dark-mode .transaction-table,
        .dashboard-app.dashboard-dark-mode .transaction-table-container,
        .dashboard-app.dashboard-dark-mode .transaction-table-wrap,
        .dashboard-app.dashboard-dark-mode .spending-chart,
        .dashboard-app.dashboard-dark-mode .category-breakdown,
        .dashboard-app.dashboard-dark-mode .spending-chart-visual,
        .dashboard-app.dashboard-dark-mode .category-chart-visual,
        .dashboard-app.dashboard-dark-mode .chart-visual,
        .dashboard-app.dashboard-dark-mode .chart-container {
          background: var(--avenza-dark-panel) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.16);
        }

        /* Some nested chart wrappers have their own light background. */
        .dashboard-app.dashboard-dark-mode .spending-chart > div,
        .dashboard-app.dashboard-dark-mode .category-breakdown > div,
        .dashboard-app.dashboard-dark-mode .recent-transactions > div,
        .dashboard-app.dashboard-dark-mode .transaction-table-wrap > div {
          background-color: transparent;
          border-color: var(--avenza-dark-border);
        }

        /* Make section headings readable against dark cards. */
        .dashboard-app.dashboard-dark-mode .panel-heading h2,
        .dashboard-app.dashboard-dark-mode .chart-heading h2,
        .dashboard-app.dashboard-dark-mode .section-heading h2,
        .dashboard-app.dashboard-dark-mode .recent-transactions h2,
        .dashboard-app.dashboard-dark-mode .recent-transactions h3,
        .dashboard-app.dashboard-dark-mode .dashboard-panel h2,
        .dashboard-app.dashboard-dark-mode .dashboard-panel h3 {
          color: var(--avenza-dark-text) !important;
        }

        .dashboard-app.dashboard-dark-mode .card-eyebrow,
        .dashboard-app.dashboard-dark-mode .section-kicker,
        .dashboard-app.dashboard-dark-mode .dashboard-panel .card-eyebrow,
        .dashboard-app.dashboard-dark-mode .recent-transactions .card-eyebrow {
          color: var(--avenza-dark-muted) !important;
        }

        /* Transaction rows, table headers, filters, and empty states. */
        .dashboard-app.dashboard-dark-mode table,
        .dashboard-app.dashboard-dark-mode thead,
        .dashboard-app.dashboard-dark-mode tbody,
        .dashboard-app.dashboard-dark-mode tr,
        .dashboard-app.dashboard-dark-mode th,
        .dashboard-app.dashboard-dark-mode td {
          background-color: transparent !important;
          color: var(--avenza-dark-text);
          border-color: var(--avenza-dark-border) !important;
        }

        .dashboard-app.dashboard-dark-mode th {
          color: var(--avenza-dark-muted) !important;
        }

        .dashboard-app.dashboard-dark-mode .transaction-row:hover,
        .dashboard-app.dashboard-dark-mode tbody tr:hover {
          background: #303a48 !important;
        }

        .dashboard-app.dashboard-dark-mode .transaction-table-wrap,
        .dashboard-app.dashboard-dark-mode .transaction-table-container {
          overflow-x: auto;
        }

        .dashboard-app.dashboard-dark-mode .empty-transactions,
        .dashboard-app.dashboard-dark-mode .chart-empty-state {
          background: transparent !important;
          color: var(--avenza-dark-muted) !important;
        }

        /* The transaction section uses transactions-card, not recent-transactions.
           Style the exact component and its nested wrappers so no light panel leaks through. */
        .dashboard-app.dashboard-dark-mode .transactions-card,
        .dashboard-app.dashboard-dark-mode .transactions-card .transactions-header,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-controls,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table-wrapper,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table thead,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table tbody {
          background: var(--avenza-dark-panel) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card h2,
        .dashboard-app.dashboard-dark-mode .transactions-card h3,
        .dashboard-app.dashboard-dark-mode .transactions-card strong,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-name,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-title {
          color: var(--avenza-dark-text) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .card-eyebrow,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-description,
        .dashboard-app.dashboard-dark-mode .transactions-card .date-cell {
          color: var(--avenza-dark-muted) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table th,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table td {
          background: transparent !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table th {
          background: #202936 !important;
          color: #aebbd0 !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-table tbody tr:hover {
          background: #26313e !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-search,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-filter {
          background: var(--avenza-dark-panel-alt) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-search input,
        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-filter select {
          background: transparent !important;
          color: var(--avenza-dark-text) !important;
          border-color: transparent !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .transaction-filter option {
          background: var(--avenza-dark-panel) !important;
          color: var(--avenza-dark-text) !important;
        }

        .dashboard-app.dashboard-dark-mode .transactions-card .view-all-button {
          color: #80b6ff !important;
        }

        /* Darken the dashboard shell and insight panel consistently. */
        .dashboard-app.dashboard-dark-mode .dashboard-content-inner,
        .dashboard-app.dashboard-dark-mode .dashboard-content,
        .dashboard-app.dashboard-dark-mode .dashboard-topbar {
          background-color: var(--avenza-dark-bg) !important;
        }

        .dashboard-app.dashboard-dark-mode .insight-card {
          background: #1b2a3b !important;
          border-color: #30465e !important;
        }

        .dashboard-app.dashboard-dark-mode .insight-card p,
        .dashboard-app.dashboard-dark-mode .insight-card span {
          color: #b9c8da !important;
        }

        /* Keep chart labels and controls visible without changing chart data. */
        .dashboard-app.dashboard-dark-mode .spending-chart svg text,
        .dashboard-app.dashboard-dark-mode .category-breakdown svg text {
          fill: var(--avenza-dark-muted);
        }

        .dashboard-app.dashboard-dark-mode .chart-expand-button,
        .dashboard-app.dashboard-dark-mode .period-button,
        .dashboard-app.dashboard-dark-mode .table-filter-button,
        .dashboard-app.dashboard-dark-mode .transaction-filter,
        .dashboard-app.dashboard-dark-mode .transaction-search {
          background: var(--avenza-dark-panel-alt) !important;
          color: var(--avenza-dark-text) !important;
          border-color: var(--avenza-dark-border) !important;
        }

        .dashboard-app.dashboard-dark-mode .insight-card {
          background: #26384b !important;
          border-color: #3c526b !important;
        }

        .dashboard-app.dashboard-dark-mode .insight-card p,
        .dashboard-app.dashboard-dark-mode .insight-card span {
          color: #b7c6d8 !important;
        }

        /* Fix expanded chart surfaces and nested text in dark mode only. */
        .dashboard-app.dashboard-dark-mode .category-breakdown-summary,
        .dashboard-app.dashboard-dark-mode .spending-chart-expanded-hint {
          background: var(--avenza-dark-panel-alt) !important;
          border-color: var(--avenza-dark-border) !important;
          color: var(--avenza-dark-muted) !important;
        }
        .dashboard-app.dashboard-dark-mode .category-breakdown-summary strong,
        .dashboard-app.dashboard-dark-mode .category-breakdown-summary span,
        .dashboard-app.dashboard-dark-mode .spending-chart-expanded-hint {
          color: var(--avenza-dark-text) !important;
        }
        .dashboard-app.dashboard-dark-mode .category-breakdown svg circle[cx="160"] {
          fill: var(--avenza-dark-panel-alt) !important;
        }
        .dashboard-app.dashboard-dark-mode .category-breakdown svg text {
          fill: var(--avenza-dark-muted) !important;
        }
        .dashboard-app.dashboard-dark-mode .category-breakdown svg text:first-of-type {
          fill: var(--avenza-dark-text) !important;
        }
        .dashboard-app.dashboard-dark-mode .category-pill {
          background: #29384a !important;
          color: #dbeafe !important;
          border-color: #40536a !important;
        }
        /* Keep the guest dark-mode prompt actions aligned and consistent. */
        .dashboard-app .locked-modal {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .dashboard-app .locked-modal .locked-icon,
        .dashboard-app .locked-modal .card-eyebrow,
        .dashboard-app .locked-modal h2,
        .dashboard-app .locked-modal p {
          flex-shrink: 0;
        }
        .dashboard-app .locked-modal .modal-submit,
        .dashboard-app .locked-modal .modal-secondary {
          box-sizing: border-box;
          width: 100%;
          min-height: 46px;
          margin-left: 0;
          margin-right: 0;
          align-self: stretch;
          justify-content: center;
        }
        .dashboard-app .locked-modal .modal-submit {
          margin-top: 0;
        }
        .dashboard-app .locked-modal .modal-secondary {
          margin-top: 9px;
        }
        @media (max-width: 520px) {
          .dashboard-app .locked-modal {
            width: 100%;
            max-width: 440px;
            padding: 26px 22px;
          }
          .dashboard-app .locked-modal h2 {
            font-size: 21px;
            line-height: 1.3;
          }
        }
      `}</style>
      <MobileHeader
        openSidebar={() =>
          setShowSidebar(true)
        }
        onHome={handleBack}
        onAddTransaction={() =>
          setShowAddTransaction(true)
        }
        darkMode={darkMode && Boolean(user)}
        onToggleDarkMode={handleDarkModeToggle}
      />

      {showSidebar && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() =>
            setShowSidebar(false)
          }
        />
      )}

      <div
        className={`dashboard-sidebar-wrapper ${
          showSidebar
            ? "open"
            : ""
        }`}
      >
        <button
          className="mobile-sidebar-close"
          onClick={() =>
            setShowSidebar(false)
          }
          aria-label="Close dashboard menu"
        >
          <X size={20} />
        </button>

        <Sidebar
          activePage={
            activePage
          }
          setActivePage={
            setActivePage
          }
          closeMobile={() =>
            setShowSidebar(false)
          }
          onHome={
            handleBack
          }
          user={user}
        />
      </div>

      <main className="dashboard-content">
        <div className="dashboard-topbar">
          <button
            className="dashboard-back"
            onClick={
              handleBack
            }
          >
            ← Back to Avenza
          </button>

          <div
            className="dashboard-topbar-actions"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {user && (
              <label className="avenza-account-selector" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 13, color: "var(--text-secondary, #64748b)" }}>
                <Landmark size={16} aria-hidden="true" />
                <span className="sr-only">Filter dashboard by account</span>
                <select aria-label="Select account for financial data" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} style={{ maxWidth: 220, minHeight: 38, borderRadius: 10, padding: "7px 10px", border: "1px solid var(--border, #dbe2ea)", background: "var(--surface, #fff)", color: "inherit" }}>
                  <option value="all">All accounts</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name || "Unnamed account"}{account.isDefault ? " (Default)" : ""}</option>)}
                </select>
              </label>
            )}
            <button
              type="button"
              className="locked-dark-mode"
              style={{
                flex: "0 0 auto",
                width: "fit-content",
                whiteSpace: "nowrap",
              }}
              onClick={handleDarkModeToggle}
              aria-pressed={Boolean(user && darkMode)}
              aria-label={
                user
                  ? `Switch to ${darkMode ? "light" : "dark"} mode`
                  : "Dark mode requires an account"
              }
              title={
                user
                  ? `Switch to ${darkMode ? "light" : "dark"} mode`
                  : "Create an account to unlock dark mode"
              }
            >
              <MoonIcon />
              {darkMode && user ? "Light mode" : "Dark mode"}
              {!user && <LockKeyhole size={12} />}
            </button>

            <button
              className="dashboard-account-button"
              style={{
                flex: "0 0 auto",
                width: "fit-content",
                whiteSpace: "nowrap",
              }}
              onClick={
                handleCreateAccount
              }
            >
              {user ? (signOutLoading ? "Signing out..." : "Sign out") : "Create account"}

              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        <div className="dashboard-content-inner">
          {!user && (
            <GuestBanner
              onCreateAccount={handleCreateAccount}
            />
          )}

          {user && (
            <div
              role="status"
              style={{
                marginBottom: "16px",
                padding: "12px 16px",
                border: "1px solid #dbeafe",
                borderRadius: "12px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {transactionsLoading
                ? "Loading your saved transactions…"
                : `Signed in as ${user.email || "your Avenza account"}. Transactions are synced to your account.`}
            </div>
          )}

          {transactionError && (
            <div
              role="alert"
              style={{
                marginBottom: "16px",
                padding: "12px 16px",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {transactionError}
            </div>
          )}

          {renderPageContent()}
        </div>
      </main>

      {showAddTransaction && (
        <AddTransactionModal
          onClose={() =>
            setShowAddTransaction(
              false
            )
          }
          onAdd={
            addTransaction
          }
          user={user}
        />
      )}

      {lockedFeature && (
        <LockedFeatureModal
          title={
            lockedFeature.title
          }
          description={
            lockedFeature.description
          }
          onClose={() =>
            setLockedFeature(
              null
            )
          }
          onCreateAccount={
            handleCreateAccount
          }
        />
      )}
      {activePage !== "assistant" && user && (
        <AIFloatingCompanion
          user={user}
          transactions={accountTransactions}
          onOpenFullAssistant={() => {
            setActivePage("assistant");
          }}
        />
      )}
    </div>
  );
}

function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
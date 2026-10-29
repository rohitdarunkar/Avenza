import {
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  FileUp,
  Menu,
  MessageCircle,
  Moon,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import AuthModal from "./components/AuthModal";
import GuestDashboard from "./pages/GuestDashboard";

function AvenzaLogo({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true">
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
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
}

function DashboardPreview() {
  return (
    <div className="dashboard-preview">
      <div className="preview-sidebar">
        <div className="preview-mini-brand">
          <div className="mini-logo">A</div>
          <span>Avenza</span>
        </div>

        <div className="preview-nav active">
          <WalletCards size={15} />
          <span>Overview</span>
        </div>

        <div className="preview-nav">
          <CircleDollarSign size={15} />
          <span>Transactions</span>
        </div>

        <div className="preview-nav">
          <BarChart3 size={15} />
          <span>Insights</span>
        </div>

        <div className="preview-nav">
          <Sparkles size={15} />
          <span>AI Assistant</span>
        </div>

        <div className="preview-nav">
          <Target size={15} />
          <span>Goals</span>
        </div>
      </div>

      <div className="preview-main">
        <div className="preview-top">
          <div>
            <p className="preview-eyebrow">Financial overview</p>
            <h3>Good morning, Rohit</h3>
          </div>

          <div className="preview-date">September 2026</div>
        </div>

        <div className="preview-stat-grid">
          <div className="preview-stat">
            <div className="stat-icon blue">
              <WalletCards size={14} />
            </div>
            <div>
              <span>Current balance</span>
              <strong>₹84,250</strong>
            </div>
          </div>

          <div className="preview-stat">
            <div className="stat-icon green">
              <ArrowRight size={14} />
            </div>
            <div>
              <span>Total income</span>
              <strong>₹1,20,000</strong>
            </div>
          </div>

          <div className="preview-stat">
            <div className="stat-icon red">
              <ArrowRight size={14} />
            </div>
            <div>
              <span>Total expenses</span>
              <strong>₹35,750</strong>
            </div>
          </div>
        </div>

        <div className="preview-content-grid">
          <div className="spending-card">
            <div className="card-heading">
              <div>
                <span>Spending this month</span>
                <strong>₹35,750</strong>
              </div>
              <button>View details</button>
            </div>

            <div className="chart-area">
              <div className="chart-y-labels">
                <span>40K</span>
                <span>30K</span>
                <span>20K</span>
                <span>10K</span>
                <span>0</span>
              </div>

              <svg
                className="line-chart"
                viewBox="0 0 520 210"
                preserveAspectRatio="none"
                aria-label="Spending trend"
              >
                <defs>
                  <linearGradient
                    id="areaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#1473ea" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#1473ea" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path
                  d="M0 165 C45 145, 55 160, 90 130 C125 100, 145 120, 180 110 C215 98, 220 60, 260 75 C300 92, 320 45, 355 60 C390 75, 400 112, 430 90 C460 70, 480 82, 520 35 L520 210 L0 210 Z"
                  fill="url(#areaGradient)"
                />

                <path
                  d="M0 165 C45 145, 55 160, 90 130 C125 100, 145 120, 180 110 C215 98, 220 60, 260 75 C300 92, 320 45, 355 60 C390 75, 400 112, 430 90 C460 70, 480 82, 520 35"
                  fill="none"
                  stroke="#1473ea"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>

              <div className="chart-x-labels">
                <span>1 Sep</span>
                <span>10 Sep</span>
                <span>20 Sep</span>
                <span>30 Sep</span>
              </div>
            </div>
          </div>

          <div className="category-card">
            <div className="card-heading">
              <div>
                <span>Top categories</span>
                <strong>₹35,750</strong>
              </div>
            </div>

            <div className="donut-wrap">
              <div className="donut">
                <div className="donut-center">
                  <strong>₹35.7K</strong>
                  <span>Spent</span>
                </div>
              </div>
            </div>

            <div className="category-list">
              <div>
                <span>
                  <i className="dot food" />
                  Food
                </span>
                <strong>28%</strong>
              </div>

              <div>
                <span>
                  <i className="dot shopping" />
                  Shopping
                </span>
                <strong>18%</strong>
              </div>

              <div>
                <span>
                  <i className="dot transport" />
                  Transport
                </span>
                <strong>12%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-insight">
          <div className="insight-icon">
            <Sparkles size={16} />
          </div>

          <div>
            <strong>Avenza insight</strong>
            <span>
              You're spending 14% less than last month. Great job keeping it
              under control.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <ArrowRight size={18} className="feature-arrow" />
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuestDashboard, setShowGuestDashboard] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [currentUser, setCurrentUser] = useState(null);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [globalDarkMode, setGlobalDarkMode] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setGlobalDarkMode(false);
      return undefined;
    }

    const syncTheme = (event) => {
      if (event?.detail?.uid && event.detail.uid !== currentUser.uid) return;
      try {
        setGlobalDarkMode(
          window.localStorage.getItem(`avenza-dark-mode-${currentUser.uid}`) === "true"
        );
      } catch {
        setGlobalDarkMode(false);
      }
    };

    syncTheme();
    window.addEventListener("avenza-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("avenza-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setShowGuestDashboard(true);
      }
    });

    return unsubscribe;
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const openAuthModal = (mode = "signin") => {
    closeMenu();
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setShowGuestDashboard(false);
      setAuthModalOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      console.error("Avenza sign-out error:", error);
      window.alert("Unable to sign out right now. Please try again.");
    } finally {
      setSignOutLoading(false);
    }
  };

  const openGuestDashboard = () => {
    setMenuOpen(false);
    setShowGuestDashboard(true);
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  };

  const backToLanding = () => {
    setShowGuestDashboard(false);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }, 0);
  };

  if (showGuestDashboard) {
    return (
      <>
        <GuestDashboard
          onBackToLanding={backToLanding}
          user={currentUser}
          onOpenAuth={openAuthModal}
          onSignOut={handleSignOut}
          signOutLoading={signOutLoading}
        />
        {authModalOpen && (
          <AuthModal
            initialMode={authMode}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={() => {
              setAuthModalOpen(false);
              setShowGuestDashboard(true);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={`app${currentUser && globalDarkMode ? " avenza-global-dark-mode" : ""}`}>
      <style>{`
        .app.avenza-global-dark-mode {
          --global-dark-bg: #11151c;
          --global-dark-panel: #1b222c;
          --global-dark-panel-alt: #252e3a;
          --global-dark-border: #343f4e;
          --global-dark-text: #f1f5fb;
          --global-dark-muted: #a6b2c3;
          background: var(--global-dark-bg) !important;
          color: var(--global-dark-text);
          min-height: 100vh;
          color-scheme: dark;
        }
        .app.avenza-global-dark-mode main,
        .app.avenza-global-dark-mode .hero-section,
        .app.avenza-global-dark-mode .intro-section,
        .app.avenza-global-dark-mode .split-section,
        .app.avenza-global-dark-mode .goal-section,
        .app.avenza-global-dark-mode .account-section,
        .app.avenza-global-dark-mode .final-cta {
          background-color: var(--global-dark-bg) !important;
          color: var(--global-dark-text) !important;
        }
        .app.avenza-global-dark-mode .navbar,
        .app.avenza-global-dark-mode .footer {
          background: #171e27 !important;
          color: var(--global-dark-text) !important;
          border-color: var(--global-dark-border) !important;
        }
        .app.avenza-global-dark-mode .hero-section {
          background-image: radial-gradient(ellipse at 72% 28%, rgba(22,119,255,.14), transparent 48%) !important;
        }
        /* Keep the hero clean without oversized decorative circles. */
        .app .hero-glow,
        .app .glow-one,
        .app .glow-two {
          display: none !important;
        }
        .app.avenza-global-dark-mode h1,
        .app.avenza-global-dark-mode h2,
        .app.avenza-global-dark-mode h3,
        .app.avenza-global-dark-mode strong,
        .app.avenza-global-dark-mode .hero-copy,
        .app.avenza-global-dark-mode .split-copy,
        .app.avenza-global-dark-mode .section-heading {
          color: var(--global-dark-text) !important;
        }
        .app.avenza-global-dark-mode p,
        .app.avenza-global-dark-mode li,
        .app.avenza-global-dark-mode .section-kicker,
        .app.avenza-global-dark-mode .hero-description,
        .app.avenza-global-dark-mode .nav-user-email,
        .app.avenza-global-dark-mode .footer-credit {
          color: var(--global-dark-muted) !important;
        }
        .app.avenza-global-dark-mode .feature-card,
        .app.avenza-global-dark-mode .goal-card,
        .app.avenza-global-dark-mode .account-card,
        .app.avenza-global-dark-mode .import-card,
        .app.avenza-global-dark-mode .mini-analysis,
        .app.avenza-global-dark-mode .dashboard-preview,
        .app.avenza-global-dark-mode .preview-main,
        .app.avenza-global-dark-mode .preview-stat,
        .app.avenza-global-dark-mode .spending-card,
        .app.avenza-global-dark-mode .category-card,
        .app.avenza-global-dark-mode .preview-insight,
        .app.avenza-global-dark-mode .preview-sidebar,
        .app.avenza-global-dark-mode .chat-demo,
        .app.avenza-global-dark-mode .chat-body,
        .app.avenza-global-dark-mode .drop-zone,
        .app.avenza-global-dark-mode .goal-recommendation {
          background-color: var(--global-dark-panel) !important;
          color: var(--global-dark-text) !important;
          border-color: var(--global-dark-border) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,.16);
        }
        .app.avenza-global-dark-mode .preview-nav.active,
        .app.avenza-global-dark-mode .preview-stat .stat-icon,
        .app.avenza-global-dark-mode .list-check,
        .app.avenza-global-dark-mode .chat-input {
          background-color: var(--global-dark-panel-alt) !important;
          color: var(--global-dark-text) !important;
        }
        .app.avenza-global-dark-mode .preview-eyebrow,
        .app.avenza-global-dark-mode .preview-stat span,
        .app.avenza-global-dark-mode .preview-date,
        .app.avenza-global-dark-mode .category-list,
        .app.avenza-global-dark-mode .preview-insight span,
        .app.avenza-global-dark-mode .chat-header span,
        .app.avenza-global-dark-mode .chat-input span {
          color: var(--global-dark-muted) !important;
        }
        .app.avenza-global-dark-mode .secondary-button,
        .app.avenza-global-dark-mode .secondary-full-button,
        .app.avenza-global-dark-mode .menu-button {
          background: var(--global-dark-panel-alt) !important;
          color: var(--global-dark-text) !important;
          border-color: var(--global-dark-border) !important;
        }
        .app.avenza-global-dark-mode .primary-button,
        .app.avenza-global-dark-mode .primary-full-button,
        .app.avenza-global-dark-mode .nav-cta {
          color: #fff !important;
        }
        .app.avenza-global-dark-mode .eyebrow-pill,
        .app.avenza-global-dark-mode .trust-points,
        .app.avenza-global-dark-mode .file-badges span,
        .app.avenza-global-dark-mode .account-label {
          border-color: var(--global-dark-border);
        }
        .app.avenza-global-dark-mode .eyebrow-pill,
        .app.avenza-global-dark-mode .file-badges span,
        .app.avenza-global-dark-mode .account-label {
          background: var(--global-dark-panel-alt) !important;
          color: var(--global-dark-text) !important;
        }

        .app .nav-profile-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 6px 14px 6px 8px;
        }
        .app .nav-profile-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 32px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e8f1ff;
          color: #1677ff;
          font-size: 14px;
          font-weight: 800;
          line-height: 1;
        }
        .app .nav-profile-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          line-height: 1.15;
        }
        .app .nav-profile-copy strong {
          color: inherit;
          font-size: 12px;
          font-weight: 750;
        }
        .app .nav-profile-copy small {
          max-width: 150px;
          overflow: hidden;
          color: inherit;
          font-size: 10px;
          opacity: .78;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .app.avenza-global-dark-mode .nav-profile-avatar {
          background: #263d59;
          color: #8fc0ff;
        }
        @media (max-width: 760px) {
          .app .nav-profile-copy small {
            display: none;
          }
        }

      `}</style>
      <header className="navbar">
        <div className="nav-inner">
          <a href="#top" className="logo-link" onClick={closeMenu}>
            <AvenzaLogo />
          </a>

          <nav className={`desktop-nav ${menuOpen ? "mobile-open" : ""}`}>
            <a href="#features" onClick={closeMenu}>
              Features
            </a>

            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>

            <a href="#ai" onClick={closeMenu}>
              AI Assistant
            </a>

            <a href="#goals" onClick={closeMenu}>
              Goals
            </a>

            <div className="mobile-nav-actions">
              {currentUser ? (
                <button
                  type="button"
                  className="mobile-signin"
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                >
                  {signOutLoading ? "Signing out..." : "Sign out"}
                </button>
              ) : (
                <button
                  type="button"
                  className="mobile-signin"
                  onClick={() => openAuthModal("signin")}
                >
                  Sign in
                </button>
              )}

              <button
                className={`nav-cta${currentUser ? " nav-profile-cta" : ""}`}
                onClick={openGuestDashboard}
                aria-label={currentUser ? "Open your Avenza dashboard" : "Try Avenza"}
              >
                {currentUser ? (
                  <>
                    <span className="nav-profile-avatar" aria-hidden="true">
                      {(currentUser.displayName || currentUser.email || "A").trim().charAt(0).toUpperCase()}
                    </span>
                    My dashboard
                  </>
                ) : (
                  <>
                    Try Avenza
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </nav>

          <div className="nav-actions">
            {currentUser ? (
              <>
                <span className="nav-user-email" title={currentUser.email || "Signed in"}>
                  {currentUser.email || "Signed in"}
                </span>
                <button
                  type="button"
                  className="nav-signin nav-signout-button"
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                >
                  {signOutLoading ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="nav-signin nav-signin-button"
                onClick={() => openAuthModal("signin")}
              >
                Sign in
              </button>
            )}

            <button
              className={`nav-cta${currentUser ? " nav-profile-cta" : ""}`}
              onClick={openGuestDashboard}
              aria-label={currentUser ? "Open your Avenza dashboard" : "Try Avenza"}
            >
              {currentUser ? (
                <>
                  <span className="nav-profile-avatar" aria-hidden="true">
                    {(currentUser.displayName || currentUser.email || "A").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="nav-profile-copy">
                    <strong>My dashboard</strong>
                    <small>{currentUser.displayName || currentUser.email || "Your account"}</small>
                  </span>
                </>
              ) : (
                <>
                  Try Avenza
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          <button
            className="menu-button"
            onClick={() => setMenuOpen((previous) => !previous)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-copy">
              <div className="eyebrow-pill">
                <Sparkles size={14} />
                <span>Your personal finance companion</span>
              </div>

              <h1>
                Your money.
                <span>Finally understood.</span>
              </h1>

              <p className="hero-description">
                Avenza turns your everyday financial data into clear insights,
                helpful answers, and practical plans for what matters to you.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={openGuestDashboard}
                >
                  Try Avenza
                  <ArrowRight size={18} />
                </button>

                <a href="#how-it-works" className="secondary-button">
                  <span className="play-icon">▶</span>
                  See how it works
                </a>
              </div>

              <div className="trust-points">
                <div>
                  <Check size={15} />
                  <span>No credit card required</span>
                </div>

                <div>
                  <Check size={15} />
                  <span>Try without an account</span>
                </div>

                <div>
                  <Check size={15} />
                  <span>Your data stays yours</span>
                </div>
              </div>
            </div>

            <div className="hero-product">
              <DashboardPreview />
            </div>
          </div>
        </section>

        <section className="intro-section" id="features">
          <div className="section-container">
            <div className="section-heading centered">
              <span className="section-kicker">One simple workspace</span>
              <h2>Everything you need to understand your money.</h2>
              <p>
                Powerful enough for detailed financial analysis. Simple enough
                to understand at a glance.
              </p>
            </div>

            <div className="feature-grid">
              <FeatureCard
                icon={<WalletCards size={22} />}
                title="Track"
                description="Keep your income and expenses organized in one clear financial workspace."
              />

              <FeatureCard
                icon={<BarChart3 size={22} />}
                title="Understand"
                description="See where your money goes with simple, meaningful visualizations."
              />

              <FeatureCard
                icon={<MessageCircle size={22} />}
                title="Ask"
                description="Ask Avenza anything about your finances and get useful answers in seconds."
              />

              <FeatureCard
                icon={<Target size={22} />}
                title="Plan"
                description="Set financial goals and get practical plans for reaching them."
              />
            </div>
          </div>
        </section>

        <section className="split-section ai-section" id="ai">
          <div className="section-container split-container">
            <div className="split-copy">
              <span className="section-kicker">A smarter way to ask</span>
              <h2>Just ask.</h2>
              <p>
                Your finances shouldn't require spreadsheets, formulas, or
                complicated reports. Ask a question in plain language and let
                Avenza do the analysis.
              </p>

              <div className="simple-list">
                <div>
                  <div className="list-check">
                    <Check size={14} />
                  </div>
                  <span>
                    Understand spending by date, category, or merchant.
                  </span>
                </div>

                <div>
                  <div className="list-check">
                    <Check size={14} />
                  </div>
                  <span>
                    Discover where you could reduce unnecessary costs.
                  </span>
                </div>

                <div>
                  <div className="list-check">
                    <Check size={14} />
                  </div>
                  <span>
                    Turn financial questions into useful visualizations.
                  </span>
                </div>
              </div>
            </div>

            <div className="chat-demo">
              <div className="chat-header">
                <div className="chat-avatar">
                  <Sparkles size={16} />
                </div>

                <div>
                  <strong>Avenza AI</strong>
                  <span>Your financial assistant</span>
                </div>

                <div className="online-dot" />
              </div>

              <div className="chat-body">
                <div className="user-message">
                  How much did I spend on food last month?
                </div>

                <div className="ai-message">
                  <div className="ai-message-icon">
                    <Sparkles size={14} />
                  </div>

                  <div>
                    <p>
                      You spent <strong>₹8,420</strong> on food last month.
                      That's ₹1,230 more than August.
                    </p>

                    <div className="mini-analysis">
                      <div className="mini-analysis-title">
                        <span>Food spending</span>
                        <strong>₹8,420</strong>
                      </div>

                      <div className="mini-bars">
                        <span style={{ height: "42%" }} />
                        <span style={{ height: "55%" }} />
                        <span style={{ height: "48%" }} />
                        <span style={{ height: "72%" }} />
                        <span style={{ height: "62%" }} />
                        <span style={{ height: "88%" }} />
                        <span style={{ height: "76%" }} />
                      </div>

                      <div className="mini-analysis-footer">
                        <span>Aug</span>
                        <span>Sep</span>
                      </div>
                    </div>

                    <button className="chat-link">
                      View breakdown
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="chat-input">
                <span>Ask anything about your finances...</span>

                <button aria-label="Send">
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="split-section import-section" id="how-it-works">
          <div className="section-container split-container reverse-mobile">
            <div className="import-card">
              <div className="import-card-top">
                <div className="upload-icon">
                  <FileUp size={22} />
                </div>

                <div>
                  <strong>Import your financial data</strong>
                  <span>Bring your existing history with you.</span>
                </div>
              </div>

              <div className="drop-zone">
                <div className="drop-icon">
                  <FileUp size={21} />
                </div>

                <strong>Drop your file here</strong>
                <span>or click to upload</span>

                <div className="file-types">
                  CSV <i /> Excel <i /> PDF <i /> Bank Statements
                </div>
              </div>

              <div className="privacy-note">
                <Check size={15} />
                <span>Your data is processed securely.</span>
              </div>
            </div>

            <div className="split-copy">
              <span className="section-kicker">
                Bring what you already have
              </span>

              <h2>Your financial history doesn't have to start over.</h2>

              <p>
                Import existing transactions and let Avenza organize the data
                so you can start understanding your finances immediately.
              </p>

              <div className="file-badges">
                <span>CSV</span>
                <span>Excel</span>
                <span>PDF</span>
                <span>Bank statements</span>
              </div>
            </div>
          </div>
        </section>

        <section className="goal-section" id="goals">
          <div className="goal-glow" />

          <div className="section-container goal-container">
            <div className="section-heading centered goal-heading">
              <span className="section-kicker">Plan for what matters</span>

              <h2>Give your money a purpose.</h2>

              <p>
                Tell Avenza what you're saving for. We'll help you understand
                what it takes to get there.
              </p>
            </div>

            <div className="goal-card">
              <div className="goal-card-header">
                <div className="goal-product">
                  <div className="goal-product-icon">
                    <WalletCards size={21} />
                  </div>

                  <div>
                    <strong>New Laptop</strong>
                    <span>Personal goal</span>
                  </div>
                </div>

                <span className="goal-percentage">62%</span>
              </div>

              <div className="goal-amount">
                <strong>₹49,600</strong>
                <span>of ₹80,000 saved</span>
              </div>

              <div className="goal-progress">
                <div />
              </div>

              <div className="goal-meta">
                <span>₹30,400 remaining</span>
                <span>Target: March 2027</span>
              </div>

              <div className="goal-recommendation">
                <Sparkles size={17} />

                <div>
                  <strong>Suggested monthly saving</strong>
                  <span>₹5,067 / month to stay on track</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="account-section">
          <div className="section-container">
            <div className="section-heading centered">
              <span className="section-kicker">Start your way</span>

              <h2>Try first. Save when you're ready.</h2>

              <p>
                Explore Avenza without an account. Create one when you're ready
                to unlock the full experience.
              </p>
            </div>

            <div className="account-grid">
              <div className="account-card">
                <div className="account-card-heading">
                  <span>Try Avenza</span>
                  <span className="account-label">No account</span>
                </div>

                <h3>Explore the essentials.</h3>

                <p>
                  Get a feel for Avenza before deciding whether you want an
                  account.
                </p>

                <ul>
                  <li>
                    <Check size={16} />
                    Explore the dashboard
                  </li>

                  <li>
                    <Check size={16} />
                    Add sample transactions
                  </li>

                  <li>
                    <Check size={16} />
                    Explore financial charts
                  </li>

                  <li>
                    <Check size={16} />
                    Light mode
                  </li>
                </ul>

                <button
                  className="secondary-full-button"
                  onClick={openGuestDashboard}
                >
                  Try without signing up
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="account-card featured-account">
                <div className="account-card-heading">
                  <span>Free account</span>
                  <span className="account-label blue-label">
                    Recommended
                  </span>
                </div>

                <h3>Go further with Avenza.</h3>

                <p>
                  Save your financial history and unlock the tools that make
                  Avenza truly yours.
                </p>

                <ul>
                  <li>
                    <Check size={16} />
                    Everything in the trial
                  </li>

                  <li>
                    <Check size={16} />
                    Import your own data
                  </li>

                  <li>
                    <Check size={16} />
                    AI financial assistant
                  </li>

                  <li>
                    <Check size={16} />
                    Saved history and conversations
                  </li>

                  <li>
                    <Check size={16} />
                    Financial goals and plans
                  </li>

                  <li>
                    <Check size={16} />
                    <strong>Light + dark mode</strong>
                  </li>
                </ul>

                <button
                  className="primary-full-button"
                  onClick={() => openAuthModal("signup")}
                >
                  Create a free account
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <div className="dark-mode-note">
              <div className="dark-mode-icon">
                <Moon size={18} />
              </div>

              <div>
                <strong>
                  Dark mode is part of your Avenza account.
                </strong>

                <span>
                  Sign in to personalize your experience and switch between
                  light and soft-grey dark mode.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta" id="try">
          <div className="final-cta-glow" />

          <div className="section-container final-cta-content">
            <div className="final-logo">
              <AvenzaLogo compact />
            </div>

            <h2>
              A clearer relationship with your money starts here.
            </h2>

            <p>
              No complicated spreadsheets. No financial jargon. Just a clearer
              picture of where your money goes.
            </p>

            <button
              className="primary-button large-button"
              onClick={openGuestDashboard}
            >
              Try Avenza for free
              <ArrowRight size={19} />
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="section-container footer-inner">
          <div>
            <AvenzaLogo />
            <p>Personal financial intelligence, made simple.</p>
          </div>

          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#ai">AI Assistant</a>
            <a href="#goals">Goals</a>
          </div>

          <div className="footer-credit">
            <span>Made by</span>
            <strong>Rohit Darunkar</strong>
          </div>
        </div>
      </footer>

      {authModalOpen && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            setShowGuestDashboard(true);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        />
      )}
    </div>
  );
}

export default App;


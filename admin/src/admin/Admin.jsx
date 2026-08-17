import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useOutletContext,
} from "react-router-dom";
import { api, download } from "../lib/api";
import { Icon } from "./icons";
import brandLogo from "../../../Frontend/src/assets/logo.jpeg";
import siteImageCustom from "../../../Frontend/src/assets/product_custom.jpg";
import siteImagePlain from "../../../Frontend/src/assets/product_plain.jpg";
import siteImageMerch from "../../../Frontend/src/assets/product_merch.jpg";

const SITE_IMAGES = [
  { file: "product_custom.jpg", label: "Custom t-shirts", src: siteImageCustom },
  { file: "product_plain.jpg", label: "Plain t-shirts", src: siteImagePlain },
  { file: "product_merch.jpg", label: "Personalized merch", src: siteImageMerch },
];

const IMAGE_RULES = {
  minWidth: 800,
  minHeight: 600,
  ratio: 4 / 3,
  tolerance: 0.02,
  types: ["image/jpeg", "image/png", "image/webp"],
};

function validateImageFile(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("Please choose an image file.");
    const isAllowedType =
      IMAGE_RULES.types.includes(file.type) ||
      /\.(jpe?g|png|webp)$/i.test(file.name || "");
    if (!isAllowedType) {
      return resolve("Unsupported file type. Please upload a JPG, PNG or WebP image.");
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!w || !h) return resolve("This file could not be read as an image.");
      if (w < IMAGE_RULES.minWidth || h < IMAGE_RULES.minHeight) {
        return resolve(
          `Image is too small (${w}×${h} px). Minimum size is ${IMAGE_RULES.minWidth}×${IMAGE_RULES.minHeight} px.`,
        );
      }
      const ratio = w / h;
      if (Math.abs(ratio - IMAGE_RULES.ratio) > IMAGE_RULES.tolerance) {
        return resolve(
          `Image must use a 4:3 aspect ratio (yours is ${w}×${h}, ratio ${ratio.toFixed(2)}). Use e.g. 1200×900 or 1600×1200 px.`,
        );
      }
      resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("This file could not be read as an image. Please upload a valid image file.");
    };
    img.src = url;
  });
}

const fields = [
  "invoice_no",
  "shipment_date",
  "shipment_ref_no",
  "reason_for_export",
  "type_of_export",
  "export_license_no",
  "import_license_no",
  "incoterms",
  "currency_code",
  "payment_method",
  "importer_name",
  "importer_address",
  "importer_contact",
  "importer_email",
  "importer_tax_id",
  "no_of_packages",
  "package_description",
];

const settingsKeys = [
  "office_name",
  "office_address",
  "contact_email",
  "live_support_number",
  "gst_number",
  "iec_number",
];

const pageNames = {
  "/": "Dashboard",
  "/products": "Products",
  "/contacts": "Contact submissions",
  "/export-documents": "Export documents",
  "/bulk-orders": "Bulk orders",
  "/settings": "Site settings",
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const initials = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusTone = (s) => {
  const v = (s || "").toLowerCase();
  if (v === "new") return "mint";
  if (v === "responded") return "navy";
  if (v === "closed") return "gray";
  return "neutral";
};

function Avatar({ name, size = 38 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function Spinner({ size = 18 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
      aria-hidden="true"
    />
  );
}

function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="admin-card admin-card--skeleton" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <div className="admin-skeleton-row" key={i}>
          <div className="skeleton skeleton--circle" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line short" />
        </div>
      ))}
    </div>
  );
}

function StatSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div className="admin-card admin-card--skeleton stat" key={i}>
          <div className="skeleton skeleton--circle" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line short" />
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* overlays: modal, confirm, toasts, dropdown                          */
/* ------------------------------------------------------------------ */

function Modal({ open, onClose, title, sub, children, drawer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="admin-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`admin-dialog${drawer ? " admin-dialog--drawer" : ""}${
          wide ? " admin-dialog--wide" : ""
        }`}
        ref={ref}
        role="dialog"
        aria-modal="true"
      >
        <div className="admin-dialog__head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="admin-dialog__body">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ state, onResolve }) {
  return (
    <div
      className="admin-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onResolve(false)}
    >
      <div className="admin-dialog admin-dialog--confirm" role="alertdialog">
        <div className="admin-confirm__icon">
          <Icon name="alert" size={24} />
        </div>
        <h2>{state.title}</h2>
        <p>{state.message}</p>
        <div className="admin-dialog__foot">
          <button className="admin-btn admin-btn--ghost" onClick={() => onResolve(false)}>
            Cancel
          </button>
          <button
            className="admin-btn admin-btn--danger"
            onClick={() => onResolve(true)}
            autoFocus
          >
            {state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts, dismiss }) {
  return (
    <div className="admin-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`admin-toast admin-toast--${t.type}`}>
          <span className="admin-toast__icon">
            <Icon name={t.type === "success" ? "check-circle" : t.type === "error" ? "alert" : "bell"} size={17} />
          </span>
          <p>{t.message}</p>
          <button className="admin-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

/* ------------------------------------------------------------------ */
/* login                                                               */
/* ------------------------------------------------------------------ */

function Login() {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      localStorage.setItem("saaluvesa_admin_access_token", data.accessToken);
      localStorage.setItem("saaluvesa_admin_refresh_token", data.refreshToken);
      nav("/");
    } catch (err) {
      setError(err.message || "Sign in failed");
      setBusy(false);
    }
  };

  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__brand">
          <img src={brandLogo} alt="Saaluvesa" />
        </div>
        <p className="admin-login__wordmark">
          SAALU<span>VESA</span>
        </p>
        <p className="admin-login__sub">Admin</p>
        {error && (
          <div className="admin-alert admin-alert--error">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="admin-field">
            <label htmlFor="login-email">Email address</label>
            <div className="admin-input">
              <Icon name="mail" size={16} />
              <input id="login-email" name="email" type="email" placeholder="admin@saaluvesa.com" required autoComplete="email" />
            </div>
          </div>
          <div className="admin-field">
            <label htmlFor="login-password">Password</label>
            <div className="admin-input admin-input--reveal">
              <Icon name="lock" size={16} />
              <input
                id="login-password"
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-input__toggle"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <Icon name={showPass ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </div>
          <button className="admin-btn admin-btn--primary admin-btn--block" disabled={busy}>
            {busy ? <Spinner size={17} /> : <Icon name="arrow" size={17} />}
            <span>{busy ? "Logging in…" : "Login"}</span>
          </button>
        </form>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* shell: sidebar + topbar + toast/confirm providers                   */
/* ------------------------------------------------------------------ */

const ShellContext = createContext(null);
const useShell = () => useContext(ShellContext);

function Sidebar() {
  const { navItems } = useShell();
  const nav = useNavigate();
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <img src={brandLogo} alt="Saaluvesa" />
        <div>
          <strong>SAALU<span>VESA</span></strong>
          <small>ADMIN CONSOLE</small>
        </div>
      </div>
      <nav className="admin-nav">
        <p className="admin-nav-label">Workspace</p>
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `admin-nav-item${isActive ? " admin-nav-item--active" : ""}`}
          >
            <Icon name={item.icon} size={18} />
            <span className="admin-nav-item__label">{item.label}</span>
            <span className="admin-nav-item__arrow"><Icon name="chevron-right" size={14} /></span>
          </NavLink>
        ))}
        <p className="admin-nav-label">System</p>
        {navItems.slice(5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `admin-nav-item${isActive ? " admin-nav-item--active" : ""}`}
          >
            <Icon name={item.icon} size={18} />
            <span className="admin-nav-item__label">{item.label}</span>
            <span className="admin-nav-item__arrow"><Icon name="chevron-right" size={14} /></span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-nav-bottom">
        <button
          className="admin-logout-btn"
          onClick={() => {
            localStorage.removeItem("saaluvesa_admin_access_token");
            localStorage.removeItem("saaluvesa_admin_refresh_token");
            nav("/login");
          }}
        >
          <Icon name="logout" size={17} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onLogout }) {
  const location = useLocation();
  const { query, setQuery } = useShell();
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New enquiry received", detail: "Requirements from Import Clothing Co.", time: "12m ago", tone: "mint" },
    { id: 2, title: "Export document created", detail: "Proforma invoice sent to exporter", time: "2h ago", tone: "navy" },
    { id: 3, title: "Catalogue updated", detail: "Products synced successfully", time: "Yesterday", tone: "neutral" },
  ]);

  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  const pageName = pageNames[location.pathname] || "Admin";

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__title">
        <p className="admin-topbar__eyebrow">Saaluvesa Enterprises</p>
        <h1>{pageName}</h1>
      </div>

      <div className="admin-topbar__search">
        <Icon name="search" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the current view…"
          aria-label="Search"
        />
        {query && (
          <button onClick={() => setQuery("")} className="admin-topbar__clear" aria-label="Clear search">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <div className="admin-topbar__actions">
        <div className="admin-dropdown" ref={bellRef}>
          <button
            className={`admin-icon-btn${notifications.length ? " has-dot" : ""}`}
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Notifications"
          >
            <Icon name="bell" size={19} />
          </button>
          {bellOpen && (
            <div className="admin-dropdown__panel admin-dropdown__panel--bell">
              <div className="admin-dropdown__head">
                <strong>Notifications</strong>
                <button
                  className="admin-text-btn"
                  onClick={() => setNotifications([])}
                >
                  Mark all read
                </button>
              </div>
              {notifications.length ? (
                <ul className="admin-notif-list">
                  {notifications.map((n) => (
                    <li key={n.id} className="admin-notif">
                      <span className={`admin-notif__dot admin-notif__dot--${n.tone}`} />
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.detail}</p>
                        <small>{n.time}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-dropdown__empty">You're all caught up.</p>
              )}
            </div>
          )}
        </div>

        <div className="admin-dropdown" ref={profileRef}>
          <button className="admin-profile" onClick={() => setProfileOpen((o) => !o)}>
            <span className="admin-profile__avatar">SE</span>
            <span className="admin-profile__meta">
              <strong>Administrator</strong>
              <small>Management portal</small>
            </span>
            <Icon name="chevron-down" size={15} />
          </button>
          {profileOpen && (
            <div className="admin-dropdown__panel admin-dropdown__panel--profile">
              <div className="admin-dropdown__user">
                <Avatar name="Saaluvesa Administrator" size={40} />
                <div>
                  <strong>Administrator</strong>
                  <small>admin@saaluvesa.com</small>
                </div>
              </div>
              <div className="admin-dropdown__divider" />
              <button className="admin-dropdown__item" onClick={onLogout}>
                <Icon name="logout" size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const nav = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [query, setQuery] = useState("");

  const pushToast = (type, message) => {
    const id = Date.now() + Math.random().toString(16).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  const confirm = (opts) =>
    new Promise((resolve) => setConfirmState({ ...opts, resolve }));

  const resolveConfirm = (value) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const onLogout = () => {
    localStorage.removeItem("saaluvesa_admin_access_token");
    localStorage.removeItem("saaluvesa_admin_refresh_token");
    nav("/login");
  };

  const navItems = [
    { to: "/", label: "Overview", icon: "dashboard", end: true },
    { to: "/products", label: "Products", icon: "package" },
    { to: "/contacts", label: "Contact submissions", icon: "inbox" },
    { to: "/export-documents", label: "Export documents", icon: "file-text" },
    { to: "/bulk-orders", label: "Bulk orders", icon: "clipboard" },
    { to: "/settings", label: "Site settings", icon: "settings" },
  ];

  return (
    <ShellContext.Provider value={{ pushToast, confirm, query, setQuery, navItems }}>
      <div className="admin-shell">
        <Sidebar />
        <div className="admin-main">
          <Topbar onLogout={onLogout} />
          <main className="admin-content">
            <Outlet context={{ pushToast, confirm, query }} />
          </main>
        </div>
        <ToastStack toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
        {confirmState && <ConfirmDialog state={confirmState} onResolve={resolveConfirm} />}
      </div>
    </ShellContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* charts                                                              */
/* ------------------------------------------------------------------ */

function Bars({ data, height = 200 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="admin-bars" style={{ height }}>
      {data.map((d) => (
        <div className="admin-bars__col" key={d.label} title={`${d.label}: ${d.value}`}>
          <div className="admin-bars__track">
            <div className="admin-bars__fill" style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}>
              {d.value > 0 && <b>{d.value}</b>}
            </div>
          </div>
          <span className="admin-bars__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ parts, size = 150, centerLabel, centerSub }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const slices = total > 0 ? parts.filter((p) => p.value > 0) : [];
  return (
    <div className="admin-donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(7,16,91,0.07)" strokeWidth="11" />
        {slices.map((p, i) => {
          const dash = (p.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(dash - 2, 1)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="admin-donut__center">
        <b>{total}</b>
        <span>{centerSub || "total"}</span>
      </div>
      {centerLabel && <p className="admin-donut__caption">{centerLabel}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const [state, setState] = useState(null);

  const load = () => {
    let alive = true;
    Promise.all([
      api("/admin/products"),
      api("/admin/contact-submissions"),
      api("/admin/export-documents"),
    ])
      .then(([products, submissions, documents]) => alive && setState({ products, submissions, documents }))
      .catch(() => alive && setState({ products: [], submissions: [], documents: [] }));
    return () => {
      alive = false;
    };
  };
  useEffect(load, []);

  if (!state) {
    return (
      <>
        <div className="admin-grid admin-grid--stats">
          <StatSkeleton />
        </div>
        <div className="admin-grid admin-grid--dash">
          <div className="admin-card admin-card--skeleton">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--block" />
          </div>
          <div className="admin-card admin-card--skeleton">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--block" />
          </div>
        </div>
      </>
    );
  }

  const { products, submissions, documents } = state;
  const pending = submissions.filter((s) => s.status === "New").length;
  const responded = submissions.filter((s) => s.status === "Responded").length;
  const openDocs = documents.filter((d) => d.status !== "Closed").length;

  const stats = [
    { label: "Products", value: products.length, icon: "package", tone: "mint", sub: "In your catalogue" },
    { label: "Pending enquiries", value: pending, icon: "inbox", tone: "navy", sub: "Awaiting response" },
    { label: "Open documents", value: openDocs, icon: "file-text", tone: "amber", sub: "Export workflow" },
    { label: "Total submissions", value: submissions.length, icon: "users", tone: "violet", sub: "All-time enquiries" },
  ];

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0 };
  });
  submissions.forEach((s) => {
    const key = new Date(s.createdAt).toDateString();
    const slot = last7.find((x) => x.key === key);
    if (slot) slot.count += 1;
  });

  const recent = [...submissions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
        <p>Live snapshot of your catalogue, enquiries, and export workflow.</p>
      </div>

      <div className="admin-grid admin-grid--stats">
        {stats.map((s) => (
          <div className="admin-card admin-stat" key={s.label}>
            <span className={`admin-stat__icon admin-stat__icon--${s.tone}`}>
              <Icon name={s.icon} size={21} />
            </span>
            <p className="admin-stat__label">{s.label}</p>
            <p className="admin-stat__value">{s.value}</p>
            <p className="admin-stat__sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="admin-grid admin-grid--dash">
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3>Enquiry activity</h3>
              <p>Contact submissions over the last 7 days</p>
            </div>
            <span className="admin-chip">
              <Icon name="trending-up" size={14} />
              {submissions.length} total
            </span>
          </div>
          <Bars data={last7.map((d) => ({ label: d.label, value: d.count }))} />
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3>Enquiry status</h3>
              <p>New vs. responded submissions</p>
            </div>
          </div>
          <div className="admin-donut-wrap">
            <Donut
              parts={[
                { label: "New", value: pending, color: "#3fcf9a" },
                { label: "Responded", value: responded, color: "#07105b" },
              ]}
              centerLabel="Current pipeline"
            />
            <div className="admin-chart-legend">
              <div>
                <span className="admin-legend-dot" style={{ background: "#3fcf9a" }} />
                <p><b>New</b><small>{pending} awaiting response</small></p>
              </div>
              <div>
                <span className="admin-legend-dot" style={{ background: "#07105b" }} />
                <p><b>Responded</b><small>{responded} handled</small></p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card__head">
          <div>
            <h3>Recent enquiries</h3>
            <p>The latest contact submissions from your website</p>
          </div>
          <NavLink to="/contacts" className="admin-text-btn">
            View all <Icon name="chevron-right" size={14} />
          </NavLink>
        </div>
        {recent.length ? (
          <ul className="admin-activity">
            {recent.map((r) => (
              <li key={r.id} className="admin-activity__row">
                <Avatar name={r.name} size={40} />
                <div className="admin-activity__main">
                  <strong>{r.name}</strong>
                  <p>{(r.requirement_details || "").slice(0, 72)}{(r.requirement_details || "").length > 72 ? "…" : ""}</p>
                </div>
                <span className="admin-activity__product">{r.Product?.name || "General"}</span>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                <span className="admin-activity__date">
                  <Icon name="clock" size={13} />
                  {fmtDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="inbox" title="No enquiries yet" hint="Customer enquiries will appear here as they arrive." />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* products                                                            */
/* ------------------------------------------------------------------ */

function ProductsAdmin() {
  const { pushToast, confirm, query } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [siteChoice, setSiteChoice] = useState(null);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    api("/admin/products")
      .then((rows) => setRows(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        setRows([]);
        pushToast("error", err.message || "Could not load products");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter((p) =>
    [p.name, p.description, p.website_link].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview("");
    setImageError("");
    setCurrentImage("");
    setSiteChoice(null);
    setFormError("");
  };

  const openAdd = () => {
    setEditing(null);
    resetImageState();
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    resetImageState();
    setCurrentImage(p.image || "");
    setOpen(true);
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setSiteChoice(null);
    const message = await validateImageFile(file);
    if (message) {
      setImageError(message);
      setImagePreview("");
      setImageFile(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setCurrentImage("");
  };

  const handleSiteChoice = (choice) => {
    setImageError("");
    setImageFile(null);
    setImagePreview(choice.src);
    setCurrentImage("");
    setSiteChoice(choice);
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") || "").trim();
    const description = (form.get("description") || "").trim();
    const website_link = (form.get("website_link") || "").trim();

    if (!name) return setFormError("Product name is required.");
    if (!description) return setFormError("Description is required.");

    const payload = new FormData();
    payload.append("name", name);
    payload.append("description", description);
    if (website_link) payload.append("website_link", website_link);

    if (imageFile) {
      const message = await validateImageFile(imageFile);
      if (message) return setImageError(message);
      payload.append("image", imageFile, imageFile.name);
    } else if (siteChoice) {
      try {
        const blob = await (await fetch(siteChoice.src)).blob();
        payload.append(
          "image",
          new File([blob], siteChoice.file, { type: blob.type || "image/jpeg" }),
        );
      } catch (_err) {
        return setImageError("Could not use that image. Please try uploading it instead.");
      }
    } else if (!editing) {
      return setImageError(
        "A product image is required. Upload a 4:3 image or choose an existing website image.",
      );
    }

    setSaving(true);
    try {
      await api(`/admin/products${editing?.id ? `/${editing.id}` : ""}`, {
        method: editing?.id ? "PUT" : "POST",
        body: payload,
      });
      pushToast("success", editing ? "Product updated successfully" : "Product added to catalogue");
      setOpen(false);
      setEditing(null);
      resetImageState();
      load();
    } catch (err) {
      pushToast("error", err.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      message: "This will permanently remove the product and its image from your catalogue. This action cannot be undone.",
      confirmLabel: "Delete product",
    });
    if (!ok) return;
    setBusyId(p.id);
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" });
      pushToast("success", "Product deleted");
      load();
    } catch (err) {
      pushToast("error", err.message || "Could not delete product");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <h2>Products</h2>
        </div>
        <p>Add and maintain the products, images and details visible to your customers.</p>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar__count">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </span>
        <button
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Icon name="plus" size={17} />
          Add product
        </button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length ? (
        <div className="admin-card admin-card--table">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Website link</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-name">
                        {p.image ? (
                          <img className="cell-thumb" src={p.image} alt="" />
                        ) : (
                          <Avatar name={p.name} size={36} />
                        )}
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td className="cell-clamp" title={p.description}>{p.description}</td>
                    <td>
                      {p.website_link ? (
                        <a
                          href={p.website_link}
                          target="_blank"
                          rel="noreferrer"
                          className="cell-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="external-link" size={14} />
                          Visit page
                        </a>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="admin-icon-btn admin-icon-btn--soft"
                          title="Edit"
                          onClick={() => openEdit(p)}
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete"
                          onClick={() => remove(p)}
                          disabled={busyId === p.id}
                        >
                          {busyId === p.id ? <Spinner size={15} /> : <Icon name="trash" size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : query ? (
        <div className="admin-card">
          <EmptyState icon="search" title={`No results for “${query}”`} hint="Try a different search term." />
        </div>
      ) : (
        <div className="admin-card">
          <EmptyState
            icon="package"
            title="No products yet"
            hint="Add your first product to start building the catalogue."
            action={
              <button className="admin-btn admin-btn--primary" onClick={openAdd}>
                <Icon name="plus" size={17} />
                Add your first product
              </button>
            }
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit product" : "Add product"}
        sub={editing ? `Updating “${editing.name}”` : "Create a new catalogue entry"}
        wide
      >
        <form onSubmit={save} className="admin-form">
          <div className="admin-field">
            <label htmlFor="p-name">Product name</label>
            <input
              id="p-name"
              name="name"
              placeholder="e.g. Custom Printed T-Shirts"
              defaultValue={editing?.name}
              required
              autoFocus
              onChange={() => formError && setFormError("")}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="p-desc">Description</label>
            <textarea
              id="p-desc"
              name="description"
              placeholder="Short description shown on the site"
              defaultValue={editing?.description}
              required
              rows={3}
              onChange={() => formError && setFormError("")}
            />
          </div>

          <div className="admin-field admin-field--span2">
            <label>
              Product image <span>required · JPG / PNG / WebP · 4:3 · min 800×600</span>
            </label>
            <div className="admin-image-picker">
              <div className={`admin-image-picker__preview${imagePreview || currentImage ? "" : " is-empty"}`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Selected product image preview" />
                ) : currentImage ? (
                  <>
                    <img src={currentImage} alt="Current product image" />
                    <span className="admin-image-picker__keep">Current image</span>
                  </>
                ) : (
                  <div className="admin-image-picker__placeholder">
                    <Icon name="image" size={28} />
                    <span>No image selected</span>
                  </div>
                )}
              </div>

              <div className="admin-image-picker__controls">
                <label className={`admin-upload-box${imageFile ? " is-selected" : ""}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageFile}
                  />
                  <Icon name="upload" size={18} />
                  <span>
                    <strong>{imageFile ? "Image selected — change it" : "Upload new image"}</strong>
                    <small>JPG, PNG or WebP · 4:3 · at least 800×600 px</small>
                  </span>
                </label>

                <div className="admin-image-picker__site">
                  <p>Or use an existing website image:</p>
                  <div className="admin-image-picker__sites">
                    {SITE_IMAGES.map((opt) => (
                      <button
                        type="button"
                        key={opt.file}
                        className={`admin-site-thumb${siteChoice?.file === opt.file ? " is-selected" : ""}`}
                        onClick={() => handleSiteChoice(opt)}
                        title={opt.label}
                        aria-label={`Use ${opt.label} image`}
                      >
                        <img src={opt.src} alt={opt.label} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {imageError && (
                  <p className="admin-field-error" role="alert">
                    <Icon name="alert" size={14} />
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="p-link">Website link <span>optional</span></label>
            <input
              id="p-link"
              name="website_link"
              type="url"
              placeholder="https://…"
              defaultValue={editing?.website_link}
            />
          </div>

          {formError && (
            <p className="admin-field-error admin-form__error" role="alert">
              <Icon name="alert" size={14} />
              {formError}
            </p>
          )}

          <div className="admin-form__actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? <Spinner size={16} /> : <Icon name="check" size={16} />}
              {editing ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* contacts                                                            */
/* ------------------------------------------------------------------ */

function Contacts() {
  const { pushToast, query } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = () => {
    setLoading(true);
    api(`/admin/contact-submissions${status ? `?status=${status}` : ""}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [status]);

  const filtered = rows.filter((row) =>
    [row.name, row.email, row.requirement_details, row.Product?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const respond = async (row) => {
    setUpdating(row.id);
    try {
      await api(`/admin/contact-submissions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Responded" }),
      });
      pushToast("success", `Marked ${row.name.split(" ")[0]}'s enquiry as responded`);
      load();
      setSelected((prev) => (prev && prev.id === row.id ? { ...prev, status: "Responded" } : prev));
    } catch (err) {
      pushToast("error", err.message || "Could not update enquiry");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Customer desk</p>
          <h2>Contact submissions</h2>
        </div>
        <p>Review and respond to customer requirements from one place.</p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filter">
          <span className="admin-filter__label"><Icon name="layers" size={15} /> Filter</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option>New</option>
            <option>Responded</option>
          </select>
        </div>
        <span className="admin-toolbar__count">
          {filtered.length} {filtered.length === 1 ? "submission" : "submissions"}
        </span>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length ? (
        <div className="admin-card admin-card--table">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Requirement</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="admin-row" onClick={() => setSelected(row)}>
                    <td>
                      <div className="cell-name cell-name--stacked">
                        <Avatar name={row.name} size={36} />
                        <div>
                          <strong>{row.name}</strong>
                          <small>{row.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="cell-clamp" title={row.requirement_details}>{row.requirement_details}</td>
                    <td>{row.Product?.name || <span className="cell-muted">General</span>}</td>
                    <td><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                    <td>{fmtDate(row.createdAt)}</td>
                    <td>
                      {row.status === "New" && (
                        <button
                          className="admin-btn admin-btn--soft admin-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            respond(row);
                          }}
                          disabled={updating === row.id}
                        >
                          {updating === row.id ? <Spinner size={14} /> : <Icon name="check" size={15} />}
                          Mark responded
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : query || status ? (
        <div className="admin-card">
          <EmptyState icon="search" title="No submissions match" hint="Adjust the filter or search to see more results." />
        </div>
      ) : (
        <div className="admin-card">
          <EmptyState icon="inbox" title="No submissions yet" hint="Enquiries submitted through the website will appear here." />
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Enquiry details"
        sub={selected ? `${selected.name} · ${fmtDate(selected.createdAt)}` : ""}
        drawer
      >
        {selected && (
          <div className="admin-kv">
            <div className="admin-kv__row"><span>Email</span><a href={`mailto:${selected.email}`}>{selected.email}</a></div>
            <div className="admin-kv__row"><span>Address</span><p>{selected.address || "—"}{selected.postal_code ? ` · ${selected.postal_code}` : ""}</p></div>
            <div className="admin-kv__row"><span>Linked product</span><p>{selected.Product?.name || "General enquiry"}</p></div>
            <div className="admin-kv__row"><span>Status</span><Badge tone={statusTone(selected.status)}>{selected.status}</Badge></div>
            <div className="admin-kv__row"><span>Requirement</span><p className="admin-kv__block">{selected.requirement_details || "—"}</p></div>
            <div className="admin-form__actions">
              {selected.status === "New" && (
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={() => respond(selected)}
                  disabled={updating === selected.id}
                >
                  {updating === selected.id ? <Spinner size={16} /> : <Icon name="check" size={16} />}
                  Mark as responded
                </button>
              )}
              <button className="admin-btn admin-btn--ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* export documents                                                    */
/* ------------------------------------------------------------------ */

function ExportDocuments() {
  const { pushToast, query } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const load = () => {
    setLoading(true);
    api("/admin/export-documents")
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = rows.filter((row) =>
    [row.invoice_no, row.importer_name, row.currency_code, String(row.total_goods_value || "")]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const save = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const items = (values.bulk || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((r) => {
        const [product_name, qty, unit_value] = r.split(/\t|,/);
        return { product_name, qty, unit_value, uom: "PCS" };
      });
    delete values.bulk;
    setSaving(true);
    try {
      await api("/admin/export-documents", {
        method: "POST",
        body: JSON.stringify({ ...values, items }),
      });
      pushToast("success", "Export document created and invoice sent");
      setOpen(false);
      load();
    } catch (err) {
      pushToast("error", err.message || "Could not create export document");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (row) => {
    setDownloading(row.id);
    try {
      await download(`/admin/export-documents/${row.id}/pdf`, `proforma-invoice-${row.id}.pdf`);
      pushToast("success", `Downloaded proforma invoice ${row.invoice_no}`);
    } catch (err) {
      pushToast("error", err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Operations</p>
          <h2>Export documents</h2>
        </div>
        <p>Create and manage proforma invoices for your shipments.</p>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar__count">
          {filtered.length} {filtered.length === 1 ? "document" : "documents"}
        </span>
        <button className="admin-btn admin-btn--primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={17} />
          New document
        </button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length ? (
        <div className="admin-card admin-card--table">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Importer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td><strong className="cell-invoice">{row.invoice_no}</strong></td>
                    <td>{row.importer_name}</td>
                    <td className="cell-mono">
                      {row.currency_code} {Number(row.total_goods_value || 0).toLocaleString()}
                    </td>
                    <td><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                    <td>{fmtDate(row.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="admin-icon-btn admin-icon-btn--soft"
                          title="Download PDF"
                          onClick={() => downloadPdf(row)}
                          disabled={downloading === row.id}
                        >
                          {downloading === row.id ? <Spinner size={15} /> : <Icon name="download" size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : query ? (
        <div className="admin-card">
          <EmptyState icon="search" title={`No documents for “${query}”`} hint="Try a different search term." />
        </div>
      ) : (
        <div className="admin-card">
          <EmptyState
            icon="file-text"
            title="No export documents yet"
            hint="Create your first proforma invoice to kick off the export workflow."
            action={
              <button className="admin-btn admin-btn--primary" onClick={() => setOpen(true)}>
                <Icon name="plus" size={17} />
                New document
              </button>
            }
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New export document"
        sub="Create a proforma invoice and send it to the importer"
        wide
      >
        <form onSubmit={save} className="admin-form admin-form--grid">
          {fields.map((f) => (
            <div className="admin-field" key={f}>
              <label htmlFor={`doc-${f}`}>{f.replaceAll("_", " ")}</label>
              <input
                id={`doc-${f}`}
                name={f}
                type={f === "shipment_date" ? "date" : "text"}
                placeholder={f === "shipment_date" ? "Select date" : `e.g. ${f.replaceAll("_", " ")}`}
                required={["invoice_no", "importer_name"].includes(f)}
              />
            </div>
          ))}
          <div className="admin-field admin-field--span2">
            <label htmlFor="doc-bulk">Bulk items <span>product name, qty, unit value — one per line</span></label>
            <textarea
              id="doc-bulk"
              name="bulk"
              rows={5}
              placeholder={"Custom T-Shirts\t200\t4.5\nPolos\t150\t6.25"}
            />
          </div>
          <div className="admin-form__actions admin-field--span2">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? <Spinner size={16} /> : <Icon name="file-text" size={16} />}
              Save and send invoice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* bulk orders + settings                                              */
/* ------------------------------------------------------------------ */

function BulkOrders() {
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Orders</p>
          <h2>Bulk orders</h2>
        </div>
      </div>
      <div className="admin-card admin-card--info">
        <div className="admin-card__head">
          <div className="admin-info__icon"><Icon name="clipboard" size={22} /></div>
          <div>
            <h3>Planned module</h3>
            <p className="admin-note">
              Bulk Orders is intentionally held pending its missing data schema. It needs fields for the
              customer, upload ownership, catalogue/custom-design selection, and the source price relation
              before a safe implementation is possible. Its price must be read through from that linked
              record, never copied or entered beside an image.
            </p>
          </div>
        </div>
        <div className="admin-status-dot"><span /> Not yet available</div>
      </div>
    </div>
  );
}

function Settings() {
  const { pushToast } = useOutletContext();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/admin/site-settings")
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setSaving(true);
    try {
      setSettings(await api("/admin/site-settings", { method: "PUT", body: JSON.stringify(values) }));
      pushToast("success", "Site settings saved");
    } catch (err) {
      pushToast("error", err.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Configuration</p>
          <h2>Site settings</h2>
        </div>
        <p>Keep your public contact and business information current.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card__head">
          <div>
            <h3>Business information</h3>
            <p>Shown across your public website.</p>
          </div>
        </div>
        {settings === null ? (
          <div className="admin-skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div className="skeleton skeleton--line" key={i} />
            ))}
          </div>
        ) : (
          <form onSubmit={save} className="admin-form admin-form--grid">
            {settingsKeys.map((key) => (
              <div className="admin-field" key={key}>
                <label htmlFor={`set-${key}`}>{key.replaceAll("_", " ")}</label>
                <input
                  id={`set-${key}`}
                  name={key}
                  defaultValue={settings[key] || ""}
                  placeholder={key.replaceAll("_", " ")}
                />
              </div>
            ))}
            <div className="admin-form__actions admin-field--span2">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? <Spinner size={16} /> : <Icon name="check" size={16} />}
                Save settings
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* auth guard + router                                                 */
/* ------------------------------------------------------------------ */

function RequireAuth() {
  return localStorage.getItem("saaluvesa_admin_access_token") ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function Admin() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="export-documents" element={<ExportDocuments />} />
            <Route path="bulk-orders" element={<BulkOrders />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

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

const pageNames = {
  "/": "Dashboard",
  "/products": "Products",
  "/export-documents": "Export documents",
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

const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
              <input id="login-email" name="email" type="email" placeholder="saaluvesa@gmail.com" required autoComplete="email" />
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
          <small>ADMIN</small>
        </div>
      </div>
      <nav className="admin-nav">
        <p className="admin-nav-label">Main</p>
        {navItems.map((item) => (
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

function Topbar() {
  const location = useLocation();
  const pageName = pageNames[location.pathname] || "Admin";

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__title">
        <p className="admin-topbar__eyebrow">Saaluvesa Enterprises</p>
        <h1>{pageName}</h1>
      </div>

      <div className="admin-topbar__actions">
        <div className="admin-profile">
          <span className="admin-profile__avatar">A</span>
          <span className="admin-profile__meta">
            <strong>Admin</strong>
          </span>
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
    { to: "/export-documents", label: "Export documents", icon: "file-text" },
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
    Promise.all([api("/admin/products"), api("/admin/export-documents")])
      .then(([products, documents]) => alive && setState({ products, documents }))
      .catch(() => alive && setState({ products: [], documents: [] }));
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

  const { products, documents } = state;
  const stats = [
    { label: "Products", value: products.length, icon: "package", tone: "mint", sub: "In your catalogue" },
    { label: "Export documents", value: documents.length, icon: "file-text", tone: "violet", sub: "Generated or draft" },
  ];

  const recent = [...documents]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
        <p>Live snapshot of your catalogue and export documents.</p>
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

      <section className="admin-card">
        <div className="admin-card__head">
          <div>
            <h3>Recent export documents</h3>
            <p>Your latest generated proforma invoices</p>
          </div>
          <NavLink to="/export-documents" className="admin-text-btn">
            View all <Icon name="chevron-right" size={14} />
          </NavLink>
        </div>
        {recent.length ? (
          <ul className="admin-activity">
            {recent.map((r) => (
              <li key={r.id} className="admin-activity__row">
                <Avatar name={r.importer_name} size={40} />
                <div className="admin-activity__main">
                  <strong>{r.invoice_no}</strong>
                  <p>{(r.requirement_details || "").slice(0, 72)}{(r.requirement_details || "").length > 72 ? "…" : ""}</p>
                </div>
                <span className="admin-activity__product">{r.items?.length || 0} products</span>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                <span className="admin-activity__date">
                  <Icon name="clock" size={13} />
                  {fmtDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="file-text" title="No export documents yet" hint="Generate your first export document from the Export documents page." />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* product detail drawer                                              */
/* ------------------------------------------------------------------ */

function ProductDetailDrawer({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="admin-product-view">
      {/* 1. Product Image */}
      <div className="admin-product-view__media">
        {product.image ? (
          <div className="admin-product-view__image-wrap">
            <img
              src={product.image}
              alt={product.name}
              className="admin-product-view__image"
            />
          </div>
        ) : (
          <div className="admin-product-view__placeholder">
            <Icon name="image" size={36} />
            <p>No product image uploaded</p>
          </div>
        )}
      </div>

      {/* 2. Product Title & Description */}
      <div className="admin-product-view__body">
        <div className="admin-product-view__header">
          <h3 className="admin-product-view__title">{product.name}</h3>
        </div>

        <div className="admin-product-view__description-card">
          <div className="admin-product-view__section-label">
            <Icon name="file-text" size={14} />
            <span>Description</span>
          </div>
          <div className="admin-product-view__text">
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p className="admin-product-view__empty-text">No description provided for this product.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Actions */}
      <div className="admin-product-view__actions">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* enquiry detail drawer                                              */
/* ------------------------------------------------------------------ */

function EnquiryDetailDrawer({
  selected,
  onClose,
  onRespond,
  onDelete,
  updating,
  busyId,
  pushToast,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  const copyText = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (pushToast) pushToast("success", `Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!selected) return null;

  return (
    <div className="admin-detail-view">
      {/* Customer Hero Card */}
      <div className="admin-detail-header-card">
        <div className="admin-detail-header-top">
          <span className="admin-detail-eyebrow">Customer Contact</span>
          <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
        </div>
        <div className="admin-detail-customer-header">
          <Avatar name={selected.name} size={46} />
          <div className="admin-detail-customer-info">
            <h3 className="admin-detail-product-title">{selected.name}</h3>
            <div className="admin-detail-customer-email-row">
              <a href={`mailto:${selected.email}`} className="admin-detail-email-link">
                <Icon name="mail" size={14} />
                {selected.email}
              </a>
              <button
                type="button"
                className="admin-detail-inline-copy"
                title="Copy email"
                onClick={() => copyText(selected.email, "email", "email")}
              >
                <Icon name={copiedKey === "email" ? "check" : "copy"} size={13} />
                <span>{copiedKey === "email" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Requirement Details */}
      <div className="admin-detail-section">
        <div className="admin-detail-section-title">
          <Icon name="file-text" size={15} />
          <h4>Requirement Details</h4>
        </div>
        <div className="admin-detail-description-card">
          <p>{selected.requirement_details || "No specific requirement details provided."}</p>
        </div>
      </div>

      {/* Linked Product & Location Information */}
      <div className="admin-detail-section">
        <div className="admin-detail-section-title">
          <Icon name="package" size={15} />
          <h4>Linked Product & Location</h4>
        </div>
        <div className="admin-detail-meta-grid">
          <div className="admin-detail-meta-tile">
            <span className="admin-detail-meta-tile__label">Target Product</span>
            <strong className="admin-detail-meta-tile__value" style={{ fontSize: "0.95rem" }}>
              {selected.Product?.name || "General Enquiry"}
            </strong>
            <small>{selected.Product ? "Attached catalogue product" : "General customer enquiry"}</small>
          </div>
          <div className="admin-detail-meta-tile">
            <span className="admin-detail-meta-tile__label">Location / Address</span>
            <p className="admin-detail-meta-tile__value" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {selected.address || "—"}
              {selected.postal_code ? ` (${selected.postal_code})` : ""}
            </p>
            <small>Delivery or business location</small>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="admin-detail-section">
        <div className="admin-detail-section-title">
          <Icon name="clock" size={15} />
          <h4>Submission Timestamp</h4>
        </div>
        <div className="admin-detail-audit-box">
          <div className="admin-detail-audit-item">
            <Icon name="calendar" size={15} />
            <div>
              <span>Submitted on</span>
              <strong>{fmtDateTime(selected.createdAt)}</strong>
            </div>
          </div>
          <div className="admin-detail-audit-divider" />
          <div className="admin-detail-audit-item">
            <Icon name="refresh" size={15} />
            <div>
              <span>Status</span>
              <strong>{selected.status}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="admin-detail-actions">
        {selected.status === "New" && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => onRespond(selected)}
            disabled={updating === selected.id}
          >
            {updating === selected.id ? <Spinner size={16} /> : <Icon name="check" size={16} />}
            Mark as responded
          </button>
        )}
        <button
          type="button"
          className="admin-btn admin-btn--danger"
          onClick={() => onDelete(selected)}
          disabled={busyId === selected.id}
        >
          {busyId === selected.id ? <Spinner size={16} /> : <Icon name="trash" size={16} />}
          Delete enquiry
        </button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
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
  const [viewing, setViewing] = useState(null);
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
    const display_order = (form.get("display_order") || "0").trim();
    const is_active = form.get("is_active") === "true";

    if (!name) return setFormError("Product name is required.");
    if (!description) return setFormError("Description is required.");
    if (!/^\d+$/.test(display_order)) {
      return setFormError("Display order must be a whole number of zero or greater.");
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("description", description);
    payload.append("display_order", display_order);
    payload.append("is_active", String(is_active));
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
                  <th>Display order</th>
                  <th>Status</th>
                  <th>Website link</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="admin-row" onClick={() => setViewing(p)}>
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
                    <td>{p.display_order ?? 0}</td>
                    <td>
                      <Badge tone={p.is_active ? "mint" : "gray"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
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
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewing(p);
                          }}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--soft"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(p);
                          }}
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
        <form onSubmit={save} className="admin-form admin-form--product">
          {/* Section: Basic Information */}
          <fieldset className="admin-form-section">
            <legend className="admin-form-section__title">
              <Icon name="pencil" size={15} />
              Basic information
            </legend>

            <div className="admin-form-grid">
              <div className="admin-field admin-field--full">
                <label htmlFor="p-name">Product name <span>required</span></label>
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

              <div className="admin-field admin-field--full">
                <label htmlFor="p-desc">Description <span>required</span></label>
                <textarea
                  id="p-desc"
                  name="description"
                  placeholder="Describe the product — materials, use cases, finish, available sizes…"
                  defaultValue={editing?.description}
                  required
                  rows={4}
                  onChange={() => formError && setFormError("")}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="p-display-order">Display order</label>
                <input
                  id="p-display-order"
                  name="display_order"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing?.display_order ?? 0}
                  required
                />
                <small>Lower numbers appear first on the frontend.</small>
              </div>

              <div className="admin-field">
                <label htmlFor="p-active">Visibility</label>
                <label className="admin-check-row" htmlFor="p-active">
                  <input
                    id="p-active"
                    name="is_active"
                    type="checkbox"
                    value="true"
                    defaultChecked={editing?.is_active ?? true}
                  />
                  <span>Active — show this product on the frontend</span>
                </label>
              </div>
            </div>
          </fieldset>

          {/* Section: Product Image */}
          <fieldset className="admin-form-section">
            <legend className="admin-form-section__title">
              <Icon name="image" size={15} />
              Product image
            </legend>

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
                    <Icon name="image" size={32} />
                    <span>No image selected</span>
                    <small>Upload to see a preview here</small>
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
                  <div className="admin-upload-box__icon">
                    <Icon name="upload" size={20} />
                  </div>
                  <span>
                    <strong>{imageFile ? "Change image" : "Upload product image"}</strong>
                    <small>JPG, PNG or WebP — 4:3 ratio — min 800 × 600 px</small>
                  </span>
                </label>

                {imageFile && (
                  <p className="admin-image-meta">
                    <Icon name="check" size={14} />
                    <span>{imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)</span>
                  </p>
                )}

                {imageError && (
                  <p className="admin-field-error" role="alert">
                    <Icon name="alert" size={14} />
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Section: Additional Details */}
          <fieldset className="admin-form-section">
            <legend className="admin-form-section__title">
              <Icon name="external-link" size={15} />
              Additional details
            </legend>

            <div className="admin-form-grid">
              <div className="admin-field admin-field--full">
                <label htmlFor="p-link">Website link <span>optional</span></label>
                <input
                  id="p-link"
                  name="website_link"
                  type="url"
                  placeholder="https://example.com/product-page"
                  defaultValue={editing?.website_link}
                />
              </div>
            </div>
          </fieldset>

          {formError && (
            <p className="admin-field-error admin-form__error" role="alert">
              <Icon name="alert" size={14} />
              {formError}
            </p>
          )}

          <div className="admin-form__actions admin-form__actions--sticky">
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

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Product details"
        sub={viewing?.name || ""}
        drawer
      >
        <ProductDetailDrawer
          product={viewing}
          onClose={() => setViewing(null)}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* export documents                                                    */
/* ------------------------------------------------------------------ */

const blankExportItem = () => ({ product_name: "", qty: "", unit_value: "", unit_net_weight: "", uom: "PCS" });

function ExportDocuments() {
  const { pushToast } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([blankExportItem()]);
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const load = () => api("/admin/export-documents").then(setRows).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const setItem = (index, key, value) => setItems((old) => old.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const removeItem = (index) => setItems((old) => old.filter((_, itemIndex) => itemIndex !== index));
  const addPastedItems = () => {
    const parsed = paste.split(/\r?\n/).map((line) => {
      const [product_name, qty, unit_value, unit_net_weight] = line.split(/\t|,/).map((value) => value.trim());
      return product_name ? { product_name, qty, unit_value, unit_net_weight, uom: "PCS" } : null;
    }).filter(Boolean);
    if (!parsed.length) return setError("Paste one product per line: Product name, Quantity, Unit price, Unit net weight.");
    setItems((old) => old.filter((item) => item.product_name || item.qty || item.unit_value || item.unit_net_weight).concat(parsed));
    setPaste(""); setError("");
  };
  const create = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    const header = Object.fromEntries(new FormData(event.currentTarget));
    const hasInvalidItem = !items.length || items.some((item) =>
      !item.product_name.trim() || Number(item.qty) <= 0 || item.unit_value === "" || Number(item.unit_value) < 0 || item.unit_net_weight === "" || Number(item.unit_net_weight) < 0,
    );
    if (hasInvalidItem) {
      setSaving(false);
      setError("Add at least one product with a name, quantity, unit price, and unit net weight.");
      return;
    }
    try {
      const document = await api("/admin/export-documents", { method: "POST", body: JSON.stringify({ ...header, items }) });
      setGenerated(document);
      pushToast("success", "Export document generated and ready for review.");
      setItems([blankExportItem()]); event.currentTarget.reset(); load();
    } catch (err) { setError(err.message || "Could not generate export document."); }
    finally { setSaving(false); }
  };
  const totals = items.reduce((all, item) => ({
    quantity: all.quantity + (Number(item.qty) || 0),
    value: all.value + (Number(item.qty) || 0) * (Number(item.unit_value) || 0),
    weight: all.weight + (Number(item.qty) || 0) * (Number(item.unit_net_weight) || 0),
  }), { quantity: 0, value: 0, weight: 0 });
  const total = totals.value;
  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Orders report</p><h2>Generate export documents</h2></div><p>Add products, review calculated totals, then generate a professional proforma invoice.</p></div>
    <form className="admin-card admin-form" onSubmit={create}>
      <div className="admin-card__head"><div><h3>Document information</h3><p>Required fields are marked below.</p></div></div>
      <div className="admin-form-grid"><div className="admin-field"><label>Invoice no. <span>required</span></label><input name="invoice_no" required placeholder="PI-2026-001" /></div><div className="admin-field"><label>Shipment date</label><input name="shipment_date" type="date" /></div><div className="admin-field"><label>Importer name <span>required</span></label><input name="importer_name" required placeholder="Customer company" /></div><div className="admin-field"><label>Importer email</label><input name="importer_email" type="email" placeholder="buyer@example.com" /></div><div className="admin-field admin-field--full"><label>Importer address</label><textarea name="importer_address" rows="2" placeholder="Full importer address" /></div><div className="admin-field"><label>Currency</label><input name="currency_code" defaultValue="USD" /></div><div className="admin-field"><label>Incoterms</label><input name="incoterms" placeholder="FOB / CIF / EXW" /></div></div>
      <div className="admin-card__head" style={{ marginTop: 28 }}><div><h3>Products</h3><p>Add individually, or paste rows in the format below.</p></div></div>
      <div className="admin-field"><label>Paste product list</label><textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows="3" placeholder={'T-Shirt, 100, 8.50, 0.18\nHoodie, 50, 16.00, 0.55'} /><small>Columns: Product name, Quantity, Unit price, Unit net weight (kg).</small><button className="admin-btn admin-btn--soft" type="button" onClick={addPastedItems} style={{ marginTop: 8 }}><Icon name="plus" size={15} /> Add pasted products</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Unit net weight (kg)</th><th>Line total</th><th /></tr></thead><tbody>{items.map((item, index) => <tr key={index}><td><input value={item.product_name} onChange={(e) => setItem(index, "product_name", e.target.value)} required placeholder="Product name" /></td><td><input value={item.qty} onChange={(e) => setItem(index, "qty", e.target.value)} required type="number" min="0.001" step="any" /></td><td><input value={item.unit_value} onChange={(e) => setItem(index, "unit_value", e.target.value)} required type="number" min="0" step="0.01" /></td><td><input value={item.unit_net_weight} onChange={(e) => setItem(index, "unit_net_weight", e.target.value)} required type="number" min="0" step="0.001" /></td><td>{((Number(item.qty) || 0) * (Number(item.unit_value) || 0)).toFixed(2)}</td><td><button type="button" className="admin-icon-btn admin-icon-btn--danger" disabled={items.length === 1} onClick={() => setItems((old) => old.filter((_, i) => i !== index))} aria-label="Remove product"><Icon name="trash" size={15} /></button></td></tr>)}</tbody></table></div>
      <div className="admin-form__actions"><button type="button" className="admin-btn admin-btn--soft" onClick={() => setItems((old) => [...old, blankExportItem()])}><Icon name="plus" size={16} /> Add product</button><span style={{ marginLeft: "auto", fontWeight: 700 }}>Total: {total.toFixed(2)}</span><button className="admin-btn admin-btn--primary" disabled={saving}>{saving ? <Spinner size={16} /> : <Icon name="download" size={16} />}{saving ? "Generating…" : "Generate PDF"}</button></div>
      {error && <p className="admin-field-error" role="alert"><Icon name="alert" size={14} />{error}</p>}
    </form>
    {items.length > 0 && <div className="export-line-calculations" aria-label="Per-product calculations">
      {items.map((item, index) => <span key={index}><strong>{item.product_name || `Product ${index + 1}`}</strong> — value: {((Number(item.qty) || 0) * (Number(item.unit_value) || 0)).toFixed(2)}, net weight: {((Number(item.qty) || 0) * (Number(item.unit_net_weight) || 0)).toFixed(3)} kg</span>)}
    </div>}
    <section className="export-totals" aria-label="Export document totals">
      <div><span>Total quantity</span><strong>{totals.quantity.toFixed(3).replace(/\.000$/, "")}</strong></div>
      <div><span>Total value</span><strong>{totals.value.toFixed(2)}</strong></div>
      <div><span>Total net weight</span><strong>{totals.weight.toFixed(3)} kg</strong></div>
    </section>
    {generated && <section className="admin-card export-review" style={{ marginTop: 24 }}>
      <div className="admin-card__head">
        <div><p className="admin-eyebrow">Document ready</p><h3>Review: {generated.invoice_no}</h3><p>{generated.importer_name} · {generated.items?.length || 0} product{generated.items?.length === 1 ? "" : "s"}</p></div>
        <div className="export-review__actions"><button type="button" className="admin-btn admin-btn--soft" onClick={() => window.print()}><Icon name="file-text" size={16} /> Print review</button><button type="button" className="admin-btn admin-btn--primary" onClick={() => download(`/admin/export-documents/${generated.id}/pdf`, `${generated.invoice_no}.pdf`)}><Icon name="download" size={16} /> Download PDF</button></div>
      </div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Unit net weight</th><th>Total value</th><th>Total weight</th></tr></thead><tbody>{generated.items?.map((item) => <tr key={item.id}><td>{item.product_name}</td><td>{item.qty}</td><td>{item.unit_value}</td><td>{item.unit_net_weight} kg</td><td>{item.sub_total}</td><td>{(Number(item.qty) * Number(item.unit_net_weight)).toFixed(3)} kg</td></tr>)}</tbody></table></div>
      <div className="export-review__summary"><span>Total quantity: <strong>{generated.items?.reduce((sum, item) => sum + Number(item.qty), 0)}</strong></span><span>Total value: <strong>{generated.currency_code} {generated.total_goods_value}</strong></span><span>Total net weight: <strong>{generated.total_net_weight_kg} kg</strong></span></div>
    </section>}
    <section className="admin-card admin-card--table" style={{ marginTop: 24 }}><div className="admin-card__head"><div><h3>Generated documents</h3><p>Download any previous PDF.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Invoice</th><th>Importer</th><th>Products</th><th>Total</th><th>Date</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.invoice_no}</td><td>{row.importer_name}</td><td>{row.items?.length || 0}</td><td>{row.currency_code} {row.total_goods_value}</td><td>{fmtDate(row.createdAt)}</td><td><button type="button" className="admin-btn admin-btn--soft admin-btn--sm" onClick={() => download(`/admin/export-documents/${row.id}/pdf`, `${row.invoice_no}.pdf`)}><Icon name="download" size={14} /> PDF</button></td></tr>)}</tbody></table></div></section>
  </div>;
}

/* ------------------------------------------------------------------ */
/* contacts                                                            */
/* ------------------------------------------------------------------ */

function Contacts() {
  const { pushToast, confirm, query } = useOutletContext();
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

  const [busyId, setBusyId] = useState(null);

  const removeContact = async (row) => {
    const ok = await confirm({
      title: `Delete enquiry from "${row.name}"?`,
      message: "This will permanently remove this contact submission. This action cannot be undone.",
      confirmLabel: "Delete enquiry",
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api(`/admin/contact-submissions/${row.id}`, { method: "DELETE" });
      pushToast("success", "Enquiry deleted");
      setSelected((prev) => (prev && prev.id === row.id ? null : prev));
      load();
    } catch (err) {
      pushToast("error", err.message || "Could not delete enquiry");
    } finally {
      setBusyId(null);
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
                      <div className="row-actions">
                        <button
                          className="admin-icon-btn admin-icon-btn--soft"
                          title="View"
                          onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); removeContact(row); }}
                          disabled={busyId === row.id}
                        >
                          {busyId === row.id ? <Spinner size={15} /> : <Icon name="trash" size={16} />}
                        </button>
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
                      </div>
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
        <EnquiryDetailDrawer
          selected={selected}
          onClose={() => setSelected(null)}
          onRespond={(item) => respond(item)}
          onDelete={(item) => removeContact(item)}
          updating={updating}
          busyId={busyId}
          pushToast={pushToast}
        />
      </Modal>
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
            <Route path="export-documents" element={<ExportDocuments />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

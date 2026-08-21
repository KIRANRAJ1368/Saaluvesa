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
import { api, download, preview } from "../lib/api";
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
  exactWidth: 800,
  exactHeight: 600,
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
      if (w !== IMAGE_RULES.exactWidth || h !== IMAGE_RULES.exactHeight) {
        return resolve(
          `Image must be exactly 800 × 600 pixels (selected image is ${w} × ${h} px).`,
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
    { to: "/contacts", label: "Contacts", icon: "mail" },
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
  const imgs = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image
    ? [product.image]
    : [];

  return (
    <div className="admin-product-view">
      {/* 1. Product Images Gallery */}
      <div className="admin-product-view__media">
        {imgs.length > 0 ? (
          <div className="admin-product-view__gallery">
            <div className="admin-product-view__image-wrap">
              <img
                src={imgs[0]}
                alt={product.name}
                className="admin-product-view__image"
              />
            </div>
            {imgs.length > 1 && (
              <div className="admin-product-view__thumbs">
                {imgs.map((src, i) => (
                  <div className="admin-product-view__thumb" key={i}>
                    <img src={src} alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="admin-product-view__placeholder">
            <Icon name="image" size={36} />
            <p>No product image uploaded</p>
          </div>
        )}
      </div>

      {/* 2. Product Title & Info */}
      <div className="admin-product-view__body">
        <div className="admin-product-view__header">
          <div className="admin-product-view__meta-pills">
            <Badge tone={product.is_active ? "mint" : "gray"}>
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
            <span className="admin-product-view__order-pill">Order #{product.display_order ?? 0}</span>
          </div>
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

        {product.website_link && (
          <div className="admin-product-view__link-card">
            <span className="admin-product-view__link-label">Website Link</span>
            {product.website_link === "contact" ? (
              <span className="admin-product-view__link">
                <Icon name="external-link" size={14} />
                Contact Page
              </span>
            ) : (
              <a
                href={product.website_link}
                target="_blank"
                rel="noreferrer"
                className="admin-product-view__link"
              >
                <Icon name="external-link" size={14} />
                {product.website_link}
              </a>
            )}
          </div>
        )}
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
  const [formError, setFormError] = useState("");

  // Single-image state (exactly 1 image required, 800 × 600 px)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageRemovedNotice, setImageRemovedNotice] = useState("");

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
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setCurrentImage("");
    setImageError("");
    setImageRemovedNotice("");
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
    const existing = p.image || (Array.isArray(p.images) && p.images[0]) || "";
    setCurrentImage(existing);
    setOpen(true);
  };

  /** Handle single image file picked via file input */
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setImageRemovedNotice("");

    const error = await validateImageFile(file);
    if (error) {
      setImageError(error);
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview("");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /** Remove current or newly selected image */
  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setCurrentImage("");
    setImageRemovedNotice("Product image removed. Please upload an image with exactly 800 × 600 pixels.");
    setImageError("");
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") || "").trim();
    const description = (form.get("description") || "").trim();
    const website_link = (form.get("website_link") || "").trim();
    const website_link_preset = form.get("website_link_preset") || "";
    const resolvedLink = website_link_preset === "contact" ? "contact" : website_link;
    const display_order = (form.get("display_order") || "0").trim();
    const is_active = form.get("is_active") === "true";

    if (!name) return setFormError("Product name is required.");
    if (!description) return setFormError("Description is required.");
    if (!/^\d+$/.test(display_order)) {
      return setFormError("Display order must be a whole number of zero or greater.");
    }

    if (!imageFile && !currentImage) {
      return setImageError("A product image is required. Please upload an image with exactly 800 × 600 pixels.");
    }

    if (imageFile) {
      const error = await validateImageFile(imageFile);
      if (error) return setImageError(error);
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("description", description);
    payload.append("display_order", display_order);
    payload.append("is_active", String(is_active));
    if (resolvedLink) payload.append("website_link", resolvedLink);
    if (imageFile) {
      payload.append("image", imageFile, imageFile.name);
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
      pushToast("error", `Product "${p.name}" deleted from catalogue`);
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
        <div className="admin-page-heading__actions">
          <button
            className="admin-btn admin-btn--primary"
            onClick={openAdd}
          >
            <Icon name="plus" size={17} />
            Add product
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar__count">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
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
                      {p.website_link === "contact" ? (
                        <span className="cell-link" style={{ cursor: "default" }}>
                          <Icon name="external-link" size={14} />
                          Contact
                        </span>
                      ) : p.website_link ? (
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
                          title="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewing(p);
                          }}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--soft"
                          title="Edit product"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete product"
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
        title={editing ? "Edit Product" : "Add New Product"}
        sub={editing ? `Update details and image for “${editing.name}”` : "Fill in the details below to add a product to the catalogue"}
        wide
      >
        <form onSubmit={save} className="admin-form admin-product-form">
          {/* Product Fields */}
          <div className="admin-form-grid">
            <div className="admin-field admin-field--full">
              <label htmlFor="p-name">
                Product Name <span className="admin-req">*</span>
              </label>
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
              <label htmlFor="p-desc">
                Description <span className="admin-req">*</span>
              </label>
              <textarea
                id="p-desc"
                name="description"
                placeholder="Describe the product — materials, print techniques, sizing, export quality..."
                defaultValue={editing?.description}
                required
                rows={4}
                onChange={() => formError && setFormError("")}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="p-display-order">
                Display Order
              </label>
              <input
                id="p-display-order"
                name="display_order"
                type="number"
                min="0"
                step="1"
                defaultValue={editing?.display_order ?? 0}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="p-active">Catalogue Visibility</label>
              <label className="admin-toggle-card" htmlFor="p-active">
                <input
                  id="p-active"
                  name="is_active"
                  type="checkbox"
                  value="true"
                  defaultChecked={editing?.is_active ?? true}
                />
                <div className="admin-toggle-card__switch">
                  <span className="admin-toggle-card__slider" />
                </div>
                <div className="admin-toggle-card__content">
                  <strong>Active on Website</strong>
                  <small>Visible in public catalogue & products list</small>
                </div>
              </label>
            </div>
          </div>

          {/* Card 2: Single Product Image */}
          <div className="admin-form-card">
            <div className="admin-form-card__head">
              <div className="admin-form-card__icon">
                <Icon name="image" size={18} />
              </div>
              <div className="admin-form-card__head-text">
                <div className="admin-form-card__title-row">
                  <h3 className="admin-form-card__title">Product Image <span className="admin-req">*</span></h3>
                  <span className="admin-badge-count">Exactly 800 × 600 px</span>
                </div>
                <p className="admin-form-card__desc">Upload an image with exactly 800 × 600 pixels (JPG, PNG or WebP)</p>
              </div>
            </div>

            {/* Single image preview if an image is selected/existing */}
            {(imagePreview || currentImage) ? (
              <div className="admin-single-image-preview">
                <div className="admin-single-image-thumb">
                  <img src={imagePreview || currentImage} alt="Product preview" />
                  <span className="admin-single-image-badge">
                    {imagePreview ? "Selected (800 × 600 px)" : "Current Image (800 × 600 px)"}
                  </span>
                  <button
                    type="button"
                    className="admin-single-image-remove"
                    title="Remove this image"
                    onClick={removeImage}
                    aria-label="Remove image"
                  >
                    <Icon name="trash" size={14} />
                    <span>Remove image</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Dropzone (Single file) */
              <label className="admin-upload-dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFile}
                />
                <div className="admin-upload-dropzone__icon">
                  <Icon name="upload" size={22} />
                </div>
                <div className="admin-upload-dropzone__text">
                  <strong>Click or browse to upload product image</strong>
                  <span>Requires exactly 800 × 600 pixels · JPG, PNG or WebP · 1 image only</span>
                </div>
              </label>
            )}

            {imageError && (
              <div className="admin-image-error-box" role="alert">
                <Icon name="alert" size={16} />
                <span>{imageError}</span>
              </div>
            )}

            {imageRemovedNotice && (
              <div className="admin-image-removed-box" role="alert">
                <Icon name="trash" size={16} />
                <span>{imageRemovedNotice}</span>
              </div>
            )}
          </div>

          {/* Card 3: Additional Details */}
          <div className="admin-form-card">
            <div className="admin-form-card__head">
              <div className="admin-form-card__icon">
                <Icon name="external-link" size={18} />
              </div>
              <div className="admin-form-card__head-text">
                <h3 className="admin-form-card__title">
                  Website Link <span className="admin-optional">(Optional)</span>
                </h3>
                <p className="admin-form-card__desc">Direct link to an order or external product page</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-field admin-field--full">
                <label htmlFor="p-link">Website Link</label>
                <div className="admin-input-with-dropdown">
                  <input
                    id="p-link"
                    name="website_link"
                    type="url"
                    placeholder="https://castbull.co.in/custom-tshirts"
                    defaultValue={editing?.website_link === "contact" ? "" : editing?.website_link}
                    disabled={editing?.website_link === "contact"}
                  />
                  <select
                    name="website_link_preset"
                    className="admin-input-dropdown"
                    defaultValue={editing?.website_link === "contact" ? "contact" : ""}
                    onChange={(e) => {
                      const input = e.currentTarget.parentElement.querySelector('input[name="website_link"]');
                      if (e.target.value === "contact") {
                        input.value = "";
                        input.disabled = true;
                      } else {
                        input.disabled = false;
                        input.focus();
                      }
                    }}
                  >
                    <option value="">Custom URL</option>
                    <option value="contact">Contact</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

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
              {editing ? "Save Changes" : "Create Product"}
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

const blankExportItem = () => ({ product_name: "", qty: "", unit_value: "", unit_net_weight: "0.00", uom: "PCS" });

function LegacyExportDocumentPreview({ document, type }) {
  const title = { commercial: "COMMERCIAL INVOICE", proforma: "PROFORMA INVOICE", packing: "PACKING LIST" }[type];
  const party = (name, address, contact, email, taxId) => <div className="export-preview__party"><strong>{name || "—"}</strong><span>{address || "—"}</span>{type !== "packing" && <><span>Contact: {contact || "—"}</span><span>Email: {email || "—"}</span><span>Tax ID No.: {taxId || "—"}</span></>}</div>;
  return <article className="export-preview">
    <header className="export-preview__header"><h1>{title}</h1><h2>{document.sender_name || "SAALUVESA ENTERPRISES PRIVATE LIMITED"}</h2><p>{document.sender_address || ""}</p></header>
    <div className="export-preview__meta"><span>Date: {document.shipment_date || "—"}</span><span>Invoice Number: {document.invoice_no}</span><span>{type === "packing" ? "File Number" : "Air Waybill Number"}: {type === "packing" ? document.file_number || "—" : document.awb_bl_no || "—"}</span></div>
    {type === "packing" ? <div className="export-preview__grid export-preview__grid--three"><section><h3>SHIPPER</h3>{party(document.sender_name, document.sender_address, document.sender_contact, document.sender_email, document.sender_tax_id)}</section><section><h3>CONSIGNEE</h3>{party(document.receiver_name, document.receiver_address, document.receiver_contact, document.receiver_email, document.receiver_tax_id)}</section><section><h3>BILL TO</h3>{party(document.importer_name, document.importer_address, document.importer_contact, document.importer_email, document.importer_tax_id)}</section></div> : <><div className="export-preview__grid"><section><h3>Sender Details</h3>{party(document.sender_name, document.sender_address, document.sender_contact, document.sender_email, document.sender_tax_id)}</section><section><h3>Shipment Details</h3><p>Shipment Date: {document.shipment_date || "—"}</p><p>Reference No.: {document.shipment_ref_no || "—"}</p><p>Reason for Export: {document.reason_for_export || "—"}</p><p>Incoterms: {document.incoterms || "—"}</p><p>Currency: {document.currency_code || "—"}</p></section></div><div className="export-preview__grid"><section><h3>Receiver Details</h3>{party(document.receiver_name, document.receiver_address, document.receiver_contact, document.receiver_email, document.receiver_tax_id)}</section><section><h3>Importer of Record Details</h3>{party(document.importer_name, document.importer_address, document.importer_contact, document.importer_email, document.importer_tax_id)}</section></div></>}
    <table><thead><tr><th>No.</th><th>{type === "packing" ? "Description" : "Item Description"}</th><th>{type === "packing" ? "Quantity" : "Qty UOM"}</th>{type !== "packing" && <th>Unit Value</th>}<th>{type === "packing" ? "Net Weight (Grams)" : "Sub-Total Value"}</th></tr></thead><tbody>{document.items?.map((item, index) => <tr key={item.id || index}><td>{index + 1}</td><td>{item.product_name}</td><td>{item.qty} {item.uom || "PCS"}</td>{type !== "packing" && <td>{document.currency_code} {item.unit_value}</td>}<td>{type === "packing" ? (Number(item.unit_net_weight || 0) * 1000).toFixed(2) : item.sub_total}</td></tr>)}</tbody></table>
    <section className="export-preview__details"><h3>{type === "packing" ? "Shipment Information" : "Other Information and Compliance Details"}</h3><p>{type === "packing" ? `Mode of Transportation: ${document.mode_of_transportation || "—"} · Packages: ${document.no_of_packages || "—"} · Package Description: ${document.package_description || "—"}` : document.other_information_compliance_details || "—"}</p></section>
    <footer><p>Signature: ______________________________</p><p>Name: {document.signatory_name || "—"}</p><p>Designation/Title: {document.signatory_designation || "—"}</p></footer>
  </article>;
}

function formatDocDate(val) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(val).toUpperCase();
  }
}

function ExportDocumentPreview({ document, type }) {
  const isPacking = type === "packing";
  const value = (entry) => (entry === undefined || entry === null || entry === "" ? "N/A" : String(entry));
  const weightGrams = (Number(document.total_net_weight_kg || 0) * 1000).toFixed(2);
  const Field = ({ label, children }) => (
    <p><b>{label}:</b> <span>{value(children)}</span></p>
  );

  const senderName = document.sender_name || "Saaluvesa Enterprises Private Limited";
  const senderAddress = document.sender_address || "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459";
  const senderContact = document.sender_contact || "+91 94884 10884";
  const senderEmail = document.sender_email || "info@saaluvesa.com";
  const senderTaxId = document.sender_tax_id || "33ABRCS3304A1ZR";

  const receiverName = document.receiver_name || document.importer_name || "Aswin";
  const receiverAddress = document.receiver_address || document.importer_address || "Govind Apartments, Coimbatore, - 641048 India";
  const receiverContact = document.receiver_contact || document.importer_contact || "7598154129";
  const receiverEmail = document.receiver_email || document.importer_email || "saswin.sts@gmail.com";
  const receiverTaxId = document.receiver_tax_id || document.importer_tax_id || "N/A";

  const complianceText = document.other_information_compliance_details || "Good Condition";
  const signatoryName = document.signatory_name || "Saaluvesa Enterprises Private Limited";
  const signatoryDesignation = document.signatory_designation || "Manager";

  const itemRows = document.items?.map((item, index) =>
    isPacking ? (
      <tr key={item.id || index}>
        <td>{index + 1}</td>
        <td>{item.qty || 1}</td>
        <td>
          <b>{item.product_name}</b>
          {(item.size || item.color) && (
            <div style={{ fontSize: "10px", color: "#555" }}>
              {[item.size && `- Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(" ")}
            </div>
          )}
        </td>
        <td>{item.hs_code || document.hs_code || "84433210"}</td>
        <td>{(Number(item.unit_net_weight || 0) * 1000).toFixed(2)}</td>
        <td>{item.uom || "PCS"}</td>
      </tr>
    ) : (
      <tr key={item.id || index}>
        <td>{index + 1}</td>
        <td>
          {item.product_name}
          {(item.size || item.color) && (
            <div style={{ fontSize: "10px", color: "#555" }}>
              {[item.size && `- Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(" ")}
            </div>
          )}
        </td>
        <td>{item.hs_code || document.hs_code || "84433210"}</td>
        <td>{item.country_of_origin || document.country_of_origin || "India"}</td>
        <td>{item.qty || 1} {item.uom || "PCS"}</td>
        <td>${Number(item.unit_value || 0).toFixed(2)}</td>
        <td>${Number(item.sub_total || Number(item.qty || 1) * Number(item.unit_value || 0) || 0).toFixed(2)}</td>
        <td>{(Number(item.unit_net_weight || 0) * 1000).toFixed(2)}</td>
      </tr>
    )
  );

  return (
    <article className={`export-document export-document--${type}`}>
      {/* ── Header ── */}
      <div className="export-document__title">
        {isPacking ? "PACKING LIST" : type === "commercial" ? "COMMERCIAL INVOICE" : "PROFORMA INVOICE"}
      </div>
      <header>
        <img className="export-document__logo" src="/favicon.jpeg" alt="Saaluvesa Enterprises" />
        <div className="export-document__header-info">
          <h2>{document.sender_name || "SAALUVESA ENTERPRISES PRIVATE LIMITED"}</h2>
          <p>{document.sender_address || "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459"}</p>
          <p className="export-document__reg-details">
            {document.additional_company_details || (
              <>
                <b>C.I.N :</b> U46900TZ2025PTC36041 | <b>ROC COIMBATORE - REG. NO :</b> 036041<br />
                <b>GST -</b> 33ABRCS3304A1ZR | <b>Import Export code -</b> ABRCS3304A | <b>ICEGATE ID -</b> ABRCS3304APIE000
              </>
            )}
          </p>
        </div>
      </header>

      {/* ── Dashed Separator Box ── */}
      <div className="export-document__dashed-box" />

      {isPacking ? (
        <>
          {/* ── Packing List: right-aligned meta ── */}
          <div className="export-document__packing-meta">
            <span><b>Page:</b> <span style={{ textDecoration: "underline" }}>1 of 1</span></span>
            <span><b>Date:</b> {formatDocDate(document.shipment_date)}</span>
            <span><b>Invoice Number:</b> {value(document.invoice_no)}</span>
            <span><b>SHIPMENT DATE:</b> {formatDocDate(document.shipment_date)}</span>
          </div>
          {/* ── References row ── */}
          <div className="export-document__references">
            <span className="export-document__ref-underline"><b>Invoice No:</b> {value(document.shipment_ref_no || document.invoice_no)}</span>
            <span className="export-document__ref-right">
              <span><b>Invoice Date:</b> {formatDocDate(document.shipment_date)}</span>
              <span><b>File Number:</b> {value(document.file_number)}</span>
            </span>
          </div>
          {/* ── SHIPPER / CONSIGNEE / BILL TO ── */}
          <div className="export-document__grid export-document__grid--three">
            <section>
              <h3>SHIPPER</h3>
              <div className="export-doc-party">
                <b>{senderName}</b>
                <span>{senderAddress}</span>
              </div>
            </section>
            <section>
              <h3>CONSIGNEE</h3>
              <div className="export-doc-party">
                <b>{receiverName}</b>
                <span>{receiverAddress}</span>
              </div>
            </section>
            <section>
              <h3>BILL TO</h3>
              <div className="export-doc-party">
                <b>{value(document.importer_name || receiverName)}</b>
                <span>{value(document.importer_address || receiverAddress)}</span>
              </div>
            </section>
          </div>
          {/* ── Shipment Information ── */}
          <section className="export-document__shipment">
            <h3>SHIPMENT INFORMATION</h3>
            <div>
              <Field label="Letter of Credit No">{document.letter_of_credit_no}</Field>
              <Field label="Customer PO No">{document.customer_po_no}</Field>
              <Field label="PO Date">{formatDocDate(document.po_date)}</Field>
              <Field label="Currency">{document.currency_code || "USD"}</Field>
              <Field label="Ref No">{document.shipment_ref_no}</Field>
              <Field label="Payment Terms">{document.payment_method || "Bank Transfer"}</Field>
              <Field label="Incoterms Desc.">{document.incoterms || "DAP"}</Field>
              <Field label="AWB/BL No">{document.awb_bl_no}</Field>
            </div>
            <div>
              <Field label="Mode of Transportation">{document.mode_of_transportation || "Air"}</Field>
              <Field label="Transportation Terms">{document.transportation_terms || "EXW"}</Field>
              <Field label="Number of Packages">{document.no_of_packages || "1"}</Field>
              <Field label="Gross Weight(Kg)">{document.total_net_weight_kg || "0.00"}</Field>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* ── Commercial / Proforma: date/invoice/awb row ── */}
          <div className="export-document__meta">
            <span><b>Date:</b> {formatDocDate(document.shipment_date)}</span>
            <span><b>Invoice Number:</b> {value(document.invoice_no)}</span>
            <span><b>Air Waybill Number:</b> {value(document.awb_bl_no)}</span>
          </div>
          <h3 className="export-document__bar">General Information</h3>
          <div className="export-document__grid">
            <section>
              <h3>Sender Details</h3>
              <div className="export-doc-party">
                <Field label="Name">{senderName}</Field>
                <Field label="Address">{senderAddress}</Field>
                <Field label="Contact Number">{senderContact}</Field>
                <Field label="Email">{senderEmail}</Field>
                <Field label="Tax ID No.">{senderTaxId}</Field>
              </div>
            </section>
            <section>
              <h3>Shipment Details</h3>
              <div className="export-doc-party">
                <Field label="SHIPMENT DATE">{formatDocDate(document.shipment_date)}</Field>
                <Field label="Shipment Reference No.">{document.shipment_ref_no}</Field>
                <Field label="Reason for Export">{document.reason_for_export || "Commercial"}</Field>
                <Field label="Type of Export">{document.type_of_export || "Permanent"}</Field>
                <Field label="Export License No.">{document.export_license_no}</Field>
                <Field label="Import License No.">{document.import_license_no}</Field>
                <Field label="INCOTERMS">{document.incoterms || "DAP"}</Field>
                <Field label="Currency Code">{document.currency_code || "USD"}</Field>
                <Field label="Payment Method">{document.payment_method || "Bank Transfer"}</Field>
              </div>
            </section>
          </div>
          <div className="export-document__grid" style={{ borderTop: "none" }}>
            <section>
              <h3>Receiver Details</h3>
              <div className="export-doc-party">
                <Field label="Name">{receiverName}</Field>
                <Field label="Address">{receiverAddress}</Field>
                <Field label="Contact Number">{receiverContact}</Field>
                <Field label="Email">{receiverEmail}</Field>
                <Field label="Tax ID No.">{receiverTaxId}</Field>
              </div>
            </section>
            <section>
              <h3>Importer of Record Details</h3>
              <div className="export-doc-party">
                <Field label="Name">{document.importer_name || "N/A"}</Field>
                <Field label="Address">{document.importer_address || "N/A"}</Field>
                <Field label="Contact Number">{document.importer_contact || "N/A"}</Field>
                <Field label="Email">{document.importer_email || "N/A"}</Field>
                <Field label="Tax ID No.">{document.importer_tax_id || "N/A"}</Field>
              </div>
            </section>
          </div>
        </>
      )}

      {/* ── Items table ── */}
      <table>
        <thead>
          <tr>
            {isPacking ? (
              <><th>NOs</th><th>QUANTITY</th><th>DESCRIPTION</th><th>HSN CODE</th><th>NET WEIGHT IN<br />GRAMS</th><th>UNIT</th></>
            ) : (
              <><th>No.</th><th>Item Description</th><th>HS Code</th><th>Country of<br />Origin</th><th>Qty UOM</th><th>Unit Value</th><th>Sub-Total<br />Value</th><th>Unit Net<br />Weight</th></>
            )}
          </tr>
        </thead>
        <tbody>
          {itemRows}
          {/* blank filler rows to match the image */}
          <tr><td colSpan={isPacking ? 6 : 8} style={{ height: "20px" }}></td></tr>
          <tr><td colSpan={isPacking ? 6 : 8} style={{ height: "20px" }}></td></tr>
        </tbody>
      </table>

      {/* ── Totals / compliance / package ── */}
      {isPacking ? (
        <>
          <div className="export-document__packing-totals-wrapper">
            <b className="export-document__packing-totals-label">TOTAL:</b>
            <table className="export-document__packing-totals-table">
              <thead>
                <tr>
                  <th>NO.<br />PKGS</th>
                  <th>TOTAL GROSS<br />WEIGHT<br />GRAMS</th>
                  <th>NET WEIGHT<br />LBS</th>
                  <th>NET WEIGHT<br />KGS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{value(document.no_of_packages || "1")}</td>
                  <td>{(Number(document.total_net_weight_kg || 0) * 1000).toFixed(0)}</td>
                  <td>{document.total_net_weight_lbs || 0}</td>
                  <td>{document.total_net_weight_kg || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <section className="export-document__package">
            <b>PACKAGE DESCRIPTION:</b>
            <p>{value(document.package_description)}</p>
          </section>
        </>
      ) : (
        <>
          <div className="export-document__compliance-wrap">
            <b>OTHER INFORMATION AND COMPLIANCE DETAILS:</b>
            <div className="export-document__compliance-body">
              <div className="export-document__compliance-box">
                {complianceText}
              </div>
              <div className="export-document__compliance-totals">
                <div><span>No. of Packages</span><span>{value(document.no_of_packages || "1")}</span></div>
                <div><span>Total Goods Value</span><span>${Number(document.total_goods_value || 0).toFixed(2)}</span></div>
                <div><span><b>Total Weight<br />GRAMS</b></span><span>{weightGrams}</span></div>
              </div>
            </div>
          </div>
          <p className="export-document__certify">I/We certify the information on this invoice is true and correct and that the contents of this shipment are as stated above.</p>
        </>
      )}

      {/* ── Signature footer ── */}
      <footer className="export-document__footer">
        <div className="export-document__footer-row">
          <span><b>Signature:</b></span>
          <span className="export-document__footer-line"></span>
        </div>
        <div className="export-document__footer-row">
          <span><b>Name:</b></span>
          <span className="export-document__footer-line">{signatoryName}</span>
        </div>
        <div className="export-document__footer-row">
          <span><b>Designation/Title:</b></span>
          <span className="export-document__footer-line">{signatoryDesignation}</span>
        </div>
      </footer>
    </article>
  );
}


const defaultExportDocValues = () => ({
  sender_name: "Saaluvesa Enterprises Private Limited",
  sender_email: "info@saaluvesa.com",
  sender_address: "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459",
  additional_company_details: "C.I.N : U46900TZ2025PTC36041 | ROC COIMBATORE - REG. NO : 036041\nGST - 33ABRCS3304A1ZR | Import Export code - ABRCS3304A | ICEGATE ID - ABRCS3304APIE000",
  sender_contact: "+91 94884 10884",
  sender_tax_id: "33ABRCS3304A1ZR",
  importer_name: "",
  importer_email: "",
  importer_address: "",
  importer_contact: "",
  importer_tax_id: "",
  receiver_name: "",
  receiver_email: "",
  receiver_address: "",
  receiver_contact: "",
  receiver_tax_id: "",
  invoice_no: `PI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
  shipment_date: new Date().toISOString().split("T")[0],
  shipment_ref_no: "",
  reason_for_export: "Commercial",
  type_of_export: "Permanent",
  export_license_no: "",
  import_license_no: "",
  incoterms: "DAP",
  currency_code: "USD",
  payment_method: "Bank Transfer",
  letter_of_credit_no: "",
  customer_po_no: "",
  po_date: "",
  file_number: "",
  tax_type: "",
  tax_rate: "",
  mode_of_transportation: "Air",
  transportation_terms: "EXW",
  awb_bl_no: "",
  no_of_packages: "1",
  package_description: "Apparel and Textiles in corrugated boxes",
  total_gross_weight_unit: "GRAMS",
  hs_code: "61091000",
  country_of_origin: "India",
  other_information_compliance_details: "Good Condition. Export cargo properly packaged and verified.",
  signatory_name: "Saaluvesa Enterprises Private Limited",
  signatory_designation: "Authorized Signatory",
});

function ExportDocuments() {
  const { pushToast, confirm, query: shellQuery } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [activeSavedDoc, setActiveSavedDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewingHtmlType, setViewingHtmlType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [paste, setPaste] = useState("");

  const [formState, setFormState] = useState(defaultExportDocValues());
  const [items, setItems] = useState([blankExportItem()]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api("/admin/export-documents");
      const docList = Array.isArray(data) ? data : [];
      setRows(docList);
      setActiveSavedDoc((current) => {
        if (current) return docList.find((doc) => doc.id === current.id) || null;
        return docList[0] || null;
      });
      return docList;
    } catch (err) {
        pushToast("error", err.message || "Failed to load export documents.");
        setRows([]);
        return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormState(defaultExportDocValues());
    setItems([blankExportItem()]);
    setError("");
    setShowBulkPaste(false);
    setFormOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setActiveSavedDoc(doc);
    setFormState({
      sender_name: doc.sender_name ?? "",
      sender_email: doc.sender_email ?? "",
      sender_address: doc.sender_address ?? "",
      additional_company_details: doc.additional_company_details ?? "",
      sender_contact: doc.sender_contact ?? "",
      sender_tax_id: doc.sender_tax_id ?? "",
      importer_name: doc.importer_name ?? "",
      importer_email: doc.importer_email ?? "",
      importer_address: doc.importer_address ?? "",
      importer_contact: doc.importer_contact ?? "",
      importer_tax_id: doc.importer_tax_id ?? "",
      receiver_name: doc.receiver_name ?? "",
      receiver_email: doc.receiver_email ?? "",
      receiver_address: doc.receiver_address ?? "",
      receiver_contact: doc.receiver_contact ?? "",
      receiver_tax_id: doc.receiver_tax_id ?? "",
      invoice_no: doc.invoice_no ?? "",
      shipment_date: doc.shipment_date ? doc.shipment_date.split("T")[0] : "",
      shipment_ref_no: doc.shipment_ref_no ?? "",
      reason_for_export: doc.reason_for_export ?? "Commercial",
      type_of_export: doc.type_of_export ?? "Permanent",
      export_license_no: doc.export_license_no ?? "",
      import_license_no: doc.import_license_no ?? "",
      incoterms: doc.incoterms ?? "DAP",
      currency_code: doc.currency_code ?? "USD",
      payment_method: doc.payment_method ?? "Bank Transfer",
      letter_of_credit_no: doc.letter_of_credit_no ?? "",
      customer_po_no: doc.customer_po_no ?? "",
      po_date: doc.po_date ? doc.po_date.split("T")[0] : "",
      file_number: doc.file_number ?? "",
      tax_type: doc.tax_type ?? "",
      tax_rate: doc.tax_rate !== null && doc.tax_rate !== undefined ? String(doc.tax_rate) : "",
      mode_of_transportation: doc.mode_of_transportation ?? "Air",
      transportation_terms: doc.transportation_terms ?? "EXW",
      awb_bl_no: doc.awb_bl_no ?? "",
      no_of_packages: doc.no_of_packages !== null && doc.no_of_packages !== undefined ? String(doc.no_of_packages) : "1",
      package_description: doc.package_description ?? "",
      total_gross_weight_unit: doc.total_gross_weight_unit ?? "GRAMS",
      hs_code: doc.hs_code ?? "",
      country_of_origin: doc.country_of_origin ?? "India",
      other_information_compliance_details: doc.other_information_compliance_details ?? "",
      signatory_name: doc.signatory_name ?? "",
      signatory_designation: doc.signatory_designation ?? "",
    });

    if (Array.isArray(doc.items) && doc.items.length > 0) {
      setItems(
        doc.items.map((it) => ({
          product_name: it.product_name ?? "",
          qty: it.qty !== undefined && it.qty !== null ? String(it.qty) : "",
          unit_value: it.unit_value !== undefined && it.unit_value !== null ? String(it.unit_value) : "",
          unit_net_weight: it.unit_net_weight !== undefined && it.unit_net_weight !== null ? String(Number(it.unit_net_weight) * 1000) : "0.00",
          uom: it.uom ?? "PCS",
          extra_price: it.extra_price ?? 0,
        })),
      );
    } else {
      setItems([blankExportItem()]);
    }
    setError("");
    setShowBulkPaste(false);
    setFormOpen(true);
  };

  const openViewModal = (doc) => {
    setViewingDoc(doc);
    setActiveSavedDoc(doc);
  };

  const deleteDocument = async (doc) => {
    const ok = await confirm({
      title: `Delete export document "${doc.invoice_no}"?`,
      message: `This will permanently delete export document "${doc.invoice_no}" for buyer "${doc.importer_name}". This action cannot be undone.`,
      confirmLabel: "Delete Document",
    });
    if (!ok) return;

    setDeletingId(doc.id);
    try {
      await api(`/admin/export-documents/${doc.id}`, { method: "DELETE" });
      pushToast("success", `Export document "${doc.invoice_no}" deleted successfully.`);
      if (viewingDoc && viewingDoc.id === doc.id) {
        setViewingDoc(null);
      }
      if (activeSavedDoc && activeSavedDoc.id === doc.id) {
        setActiveSavedDoc(null);
      }
      const remainingDocs = await load();
      setActiveSavedDoc(remainingDocs[0] || null);
    } catch (err) {
      pushToast("error", err.message || "Failed to delete export document.");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPdf = async (doc, documentType, filename) => {
    if (!doc) return;
    try {
      pushToast("info", `Downloading ${filename}...`);
      await download(`/admin/export-documents/${doc.id}/${documentType}/pdf?download=1`, filename);
      pushToast("success", `${filename} downloaded successfully.`);
    } catch (err) {
      pushToast("error", err.message || "Could not download PDF.");
    }
  };

  const previewPdf = async (doc, documentType) => {
    if (!doc) return;
    try {
      await preview(`/admin/export-documents/${doc.id}/${documentType}/pdf`);
    } catch (err) {
      pushToast("error", err.message || "Could not open the PDF preview.");
    }
  };

  const handleFieldChange = (key, val) => {
    setFormState((prev) => ({ ...prev, [key]: val }));
  };

  const setItem = (index, key, value) => {
    setItems((old) => old.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addItemRow = () => {
    setItems((old) => [...old, blankExportItem()]);
  };

  const removeItemRow = (index) => {
    setItems((old) => (old.length > 1 ? old.filter((_, i) => i !== index) : [blankExportItem()]));
  };

  const addPastedItems = () => {
    const parsed = paste
      .split(/\r?\n/)
      .map((line) => {
        const [product_name, qty, unit_value, unit_net_weight] = line.split(/\t|,/).map((value) => value.trim());
        return product_name ? { product_name, qty, unit_value, unit_net_weight: unit_net_weight || "0.00", uom: "PCS" } : null;
      })
      .filter(Boolean);

    if (!parsed.length) {
      return setError("Paste format: Product Name, Quantity, Price, Unit Net Weight (Grams) per line.");
    }
    setItems((old) => old.filter((item) => item.product_name || item.qty || item.unit_value).concat(parsed));
    setPaste("");
    setError("");
    setShowBulkPaste(false);
  };

  const saveForm = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const hasInvalidItem =
      !items.length ||
      items.some(
        (item) => !item.product_name.trim() || Number(item.qty) <= 0 || item.unit_value === "" || Number(item.unit_value) < 0,
      );

    if (hasInvalidItem) {
      setError("Please add at least one product with a valid name, quantity > 0, and unit price.");
      return;
    }

    setSaving(true);
    try {
      const emptyToNull = (value) => (typeof value === "string" && !value.trim() ? null : value);
      const payload = {
        ...formState,
        sender_email: emptyToNull(formState.sender_email),
        importer_email: emptyToNull(formState.importer_email),
        receiver_email: emptyToNull(formState.receiver_email),
        shipment_date: emptyToNull(formState.shipment_date),
        po_date: emptyToNull(formState.po_date),
        items: items.map((item) => ({
          ...item,
          unit_net_weight: Number(item.unit_net_weight || 0) / 1000,
        })),
      };

      let resultDoc = null;
      if (editingDoc) {
        resultDoc = await api(`/admin/export-documents/${editingDoc.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("success", `Export document "${resultDoc.invoice_no}" updated successfully.`);
        if (viewingDoc && viewingDoc.id === editingDoc.id) {
          setViewingDoc(resultDoc);
        }
      } else {
        resultDoc = await api("/admin/export-documents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("success", `Export document "${resultDoc.invoice_no}" created successfully.`);
        setEditingDoc(resultDoc);
      }

      setActiveSavedDoc(resultDoc);
      await load();
      return resultDoc;
    } catch (err) {
      setError(err.message || "Failed to save export document details.");
    } finally {
      setSaving(false);
    }
  };

  // Live calculations for form summary
  const formTotals = items.reduce(
    (all, item) => ({
      quantity: all.quantity + (Number(item.qty) || 0),
      value: all.value + (Number(item.qty) || 0) * (Number(item.unit_value) || 0),
      weight: all.weight + (Number(item.qty) || 0) * (Number(item.unit_net_weight) || 0),
    }),
    { quantity: 0, value: 0, weight: 0 },
  );
  const numTaxRate = Number(formState.tax_rate) || 0;
  const calculatedTax = formTotals.value * (numTaxRate / 100);
  const calculatedFinalTotal = formTotals.value + calculatedTax;

  const currentPreviewDoc = activeSavedDoc || {
    ...formState,
    items: items.map((it, idx) => ({
      id: idx + 1,
      product_name: it.product_name || `Product ${idx + 1}`,
      qty: it.qty || 1,
      unit_value: it.unit_value || 0,
      sub_total: (Number(it.qty || 1) * Number(it.unit_value || 0)).toFixed(2),
      unit_net_weight: Number(it.unit_net_weight || 0) / 1000,
      uom: it.uom || "PCS",
    })),
    total_goods_value: formTotals.value.toFixed(2),
    final_total_amount: calculatedFinalTotal.toFixed(2),
    total_net_weight_kg: (formTotals.weight / 1000).toFixed(3),
    total_net_weight_lbs: ((formTotals.weight / 1000) * 2.20462262).toFixed(3),
  };

  const searchQuery = (localSearch || shellQuery || "").trim().toLowerCase();
  const filteredRows = rows.filter((r) => {
    if (!searchQuery) return true;
    const searchString = [
      r.invoice_no,
      r.importer_name,
      r.importer_email,
      r.importer_address,
      r.receiver_name,
      r.country_of_origin,
      r.mode_of_transportation,
      r.incoterms,
      r.currency_code,
      ...(r.items || []).map((it) => it.product_name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchString.includes(searchQuery);
  });

  return (
    <div className="admin-page">
      {/* ── Page Header matching reference image ── */}
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Orders report</p>
          <h2>Export documents</h2>
        </div>
        <div className="admin-page-heading__actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={openCreateModal}
          >
            <Icon name="plus" size={17} />
            <span>Add export document</span>
          </button>
        </div>
      </div>

      {/* ── Main Saved Documents Table Card ── */}
      <div className="admin-card admin-card--table">
        <div className="export-docs-toolbar">
          <div className="export-docs-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search by invoice no, buyer, product, country..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                className="admin-icon-btn"
                style={{ width: 22, height: 22 }}
                onClick={() => setLocalSearch("")}
                aria-label="Clear search"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
          <span className="export-docs-count">
            {filteredRows.length} {filteredRows.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Importer / Buyer</th>
                  <th>Shipment / Logistics</th>
                  <th>Products</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((doc) => (
                  <tr key={doc.id} className="admin-row" onClick={() => openViewModal(doc)}>
                    <td>
                      <span className="cell-invoice-badge">
                        <Icon name="file-text" size={14} />
                        {doc.invoice_no}
                      </span>
                      <small className="cell-meta-sub">Created: {fmtDate(doc.createdAt)}</small>
                    </td>
                    <td>
                      <strong>{doc.importer_name}</strong>
                      <small className="cell-meta-sub">
                        {doc.importer_email || doc.importer_address || "—"}
                      </small>
                    </td>
                    <td>
                      <span>{doc.shipment_date ? fmtDate(doc.shipment_date) : "—"}</span>
                      <small className="cell-meta-sub">
                        {doc.mode_of_transportation || "Air"} · {doc.incoterms || "DAP"}
                      </small>
                    </td>
                    <td>
                      <Badge tone="mint">
                        {doc.items?.length || 0} {doc.items?.length === 1 ? "item" : "items"}
                      </Badge>
                      <small className="cell-meta-sub">
                        {doc.total_net_weight_kg ? `${Number(doc.total_net_weight_kg).toFixed(2)} kg` : "—"}
                      </small>
                    </td>
                    <td>
                      <span className="cell-amount-strong">
                        {doc.currency_code || "USD"}{" "}
                        {Number(doc.final_total_amount || doc.total_goods_value || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <small className="cell-meta-sub">
                        Goods: {doc.currency_code || "USD"} {Number(doc.total_goods_value || 0).toFixed(2)}
                      </small>
                    </td>
                    <td>
                      <Badge tone={statusTone(doc.status)}>{doc.status || "Generated"}</Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="admin-actions-cell">
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--view"
                          onClick={() => openViewModal(doc)}
                          title="View document details and PDF downloads"
                        >
                          <Icon name="eye" size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--edit"
                          onClick={() => openEditModal(doc)}
                          title="Edit export document"
                        >
                          <Icon name="pencil" size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--delete"
                          onClick={() => deleteDocument(doc)}
                          disabled={deletingId === doc.id}
                          title="Delete export document"
                        >
                          {deletingId === doc.id ? <Spinner size={13} /> : <Icon name="trash" size={14} />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="file-text"
            title="No export documents found"
            hint={
              searchQuery
                ? "No export documents match your search criteria. Try a different query."
                : "Create your first export document to generate commercial invoices, proforma invoices, and packing lists."
            }
            action={
              <button type="button" className="admin-btn admin-btn--primary" onClick={openCreateModal}>
                <Icon name="plus" size={16} />
                <span>Add export document</span>
              </button>
            }
          />
        )}
      </div>

      {/* ── Add / Edit Export Document Modal (Sections 1 to 8 + Document Options) ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingDoc ? `Generate Export Documents: ${editingDoc.invoice_no}` : "Generate Export Documents"}
        sub={
          editingDoc
            ? "Update shipment, buyer, and product details for this export document."
            : "Fill in the details below to generate and save your export document."
        }
        wide
      >
        <form className="admin-form" onSubmit={saveForm}>
          {/* Section 1: Sender Details */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>1. Sender Details</h3>
                <p>Company information appearing as the exporter / shipper</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Sender Name</label>
                <input
                  value={formState.sender_name}
                  onChange={(e) => handleFieldChange("sender_name", e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="admin-field">
                <label>Sender Email</label>
                <input
                  type="email"
                  value={formState.sender_email}
                  onChange={(e) => handleFieldChange("sender_email", e.target.value)}
                  placeholder="info@saaluvesa.com"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>Sender Address</label>
                <textarea
                  rows="2"
                  value={formState.sender_address}
                  onChange={(e) => handleFieldChange("sender_address", e.target.value)}
                  placeholder="Full registered company address"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>Additional Company Details (Appears below company info)</label>
                <textarea
                  rows="2"
                  value={formState.additional_company_details}
                  onChange={(e) => handleFieldChange("additional_company_details", e.target.value)}
                  placeholder="C.I.N, ROC, GST, Import Export code, ICEGATE ID"
                />
              </div>
              <div className="admin-field">
                <label>Sender Contact Number</label>
                <input
                  value={formState.sender_contact}
                  onChange={(e) => handleFieldChange("sender_contact", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="admin-field">
                <label>Sender Tax ID No.</label>
                <input
                  value={formState.sender_tax_id}
                  onChange={(e) => handleFieldChange("sender_tax_id", e.target.value)}
                  placeholder="33ABRCS3304A1ZR"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Importer of Record Details */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>2. Importer of Record Details</h3>
                <p>Primary international customer or billing recipient</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>
                  Importer Name <span>required</span>
                </label>
                <input
                  required
                  value={formState.importer_name}
                  onChange={(e) => handleFieldChange("importer_name", e.target.value)}
                  placeholder="Customer / Importer company name"
                />
              </div>
              <div className="admin-field">
                <label>Importer Email</label>
                <input
                  type="email"
                  value={formState.importer_email}
                  onChange={(e) => handleFieldChange("importer_email", e.target.value)}
                  placeholder="buyer@example.com"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>Importer Address</label>
                <textarea
                  rows="2"
                  value={formState.importer_address}
                  onChange={(e) => handleFieldChange("importer_address", e.target.value)}
                  placeholder="Full international billing address"
                />
              </div>
              <div className="admin-field">
                <label>Importer Contact Number</label>
                <input
                  value={formState.importer_contact}
                  onChange={(e) => handleFieldChange("importer_contact", e.target.value)}
                  placeholder="+1 555-0199"
                />
              </div>
              <div className="admin-field">
                <label>Importer Tax ID No.</label>
                <input
                  value={formState.importer_tax_id}
                  onChange={(e) => handleFieldChange("importer_tax_id", e.target.value)}
                  placeholder="VAT / EIN / Tax registration"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Recipient / User Data Details */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>3. Recipient / User Data Details</h3>
                <p>Consignee / delivery details (leave blank if same as Importer)</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Receiver Name</label>
                <input
                  value={formState.receiver_name}
                  onChange={(e) => handleFieldChange("receiver_name", e.target.value)}
                  placeholder="Consignee company or recipient name"
                />
              </div>
              <div className="admin-field">
                <label>Receiver Email</label>
                <input
                  type="email"
                  value={formState.receiver_email}
                  onChange={(e) => handleFieldChange("receiver_email", e.target.value)}
                  placeholder="consignee@example.com"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>Receiver Address</label>
                <textarea
                  rows="2"
                  value={formState.receiver_address}
                  onChange={(e) => handleFieldChange("receiver_address", e.target.value)}
                  placeholder="Consignee destination shipping address"
                />
              </div>
              <div className="admin-field">
                <label>Receiver Contact Number</label>
                <input
                  value={formState.receiver_contact}
                  onChange={(e) => handleFieldChange("receiver_contact", e.target.value)}
                  placeholder="Receiver phone number"
                />
              </div>
              <div className="admin-field">
                <label>Receiver Tax ID No.</label>
                <input
                  value={formState.receiver_tax_id}
                  onChange={(e) => handleFieldChange("receiver_tax_id", e.target.value)}
                  placeholder="Receiver tax ID"
                />
              </div>
            </div>
          </div>

          {/* Section 4: General Information / Shipment Information */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>4. General Information / Shipment Information</h3>
                <p>Shipment reference, dates, incoterms, and financial metadata</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>
                  Invoice No. <span>required</span>
                </label>
                <input
                  required
                  value={formState.invoice_no}
                  onChange={(e) => handleFieldChange("invoice_no", e.target.value)}
                  placeholder="INV-202608-0014"
                />
              </div>
              <div className="admin-field">
                <label>Shipment Date</label>
                <input
                  type="date"
                  value={formState.shipment_date}
                  onChange={(e) => handleFieldChange("shipment_date", e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label>Shipment Reference No. / Ref No.</label>
                <input
                  value={formState.shipment_ref_no}
                  onChange={(e) => handleFieldChange("shipment_ref_no", e.target.value)}
                  placeholder="REF-1002"
                />
              </div>
              <div className="admin-field">
                <label>Reason for Export</label>
                <input
                  value={formState.reason_for_export}
                  onChange={(e) => handleFieldChange("reason_for_export", e.target.value)}
                  placeholder="Commercial"
                />
              </div>
              <div className="admin-field">
                <label>Type of Export</label>
                <input
                  value={formState.type_of_export}
                  onChange={(e) => handleFieldChange("type_of_export", e.target.value)}
                  placeholder="Permanent"
                />
              </div>
              <div className="admin-field">
                <label>Export License No.</label>
                <input
                  value={formState.export_license_no}
                  onChange={(e) => handleFieldChange("export_license_no", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-field">
                <label>Import License No.</label>
                <input
                  value={formState.import_license_no}
                  onChange={(e) => handleFieldChange("import_license_no", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-field">
                <label>INCOTERMS / Incoterms Desc.</label>
                <input
                  value={formState.incoterms}
                  onChange={(e) => handleFieldChange("incoterms", e.target.value)}
                  placeholder="DAP / FOB / EXW"
                />
              </div>
              <div className="admin-field">
                <label>Currency Code</label>
                <select
                  value={formState.currency_code}
                  onChange={(e) => handleFieldChange("currency_code", e.target.value)}
                >
                  <option value="USD">USD – US Dollar</option>
                  <option value="INR">INR – Indian Rupee</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                  <option value="AED">AED – UAE Dirham</option>
                  <option value="SAR">SAR – Saudi Riyal</option>
                  <option value="CAD">CAD – Canadian Dollar</option>
                  <option value="AUD">AUD – Australian Dollar</option>
                  <option value="SGD">SGD – Singapore Dollar</option>
                  <option value="JPY">JPY – Japanese Yen</option>
                  <option value="CNY">CNY – Chinese Yuan</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Payment Method / Payment Terms</label>
                <input
                  value={formState.payment_method}
                  onChange={(e) => handleFieldChange("payment_method", e.target.value)}
                  placeholder="Bank Transfer"
                />
              </div>
              <div className="admin-field">
                <label>Letter of Credit No.</label>
                <input
                  value={formState.letter_of_credit_no}
                  onChange={(e) => handleFieldChange("letter_of_credit_no", e.target.value)}
                  placeholder="LC-8823"
                />
              </div>
              <div className="admin-field">
                <label>Customer PO No.</label>
                <input
                  value={formState.customer_po_no}
                  onChange={(e) => handleFieldChange("customer_po_no", e.target.value)}
                  placeholder="PO-2026-44"
                />
              </div>
              <div className="admin-field">
                <label>PO Date</label>
                <input
                  type="date"
                  value={formState.po_date}
                  onChange={(e) => handleFieldChange("po_date", e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label>File Number</label>
                <input
                  value={formState.file_number}
                  onChange={(e) => handleFieldChange("file_number", e.target.value)}
                  placeholder="FN-902"
                />
              </div>
              <div className="admin-field">
                <label>Tax / VAT Type</label>
                <input
                  value={formState.tax_type}
                  onChange={(e) => handleFieldChange("tax_type", e.target.value)}
                  placeholder="e.g. GST, VAT, IGST"
                />
              </div>
              <div className="admin-field">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formState.tax_rate}
                  onChange={(e) => handleFieldChange("tax_rate", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Packing / Item Details */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3 style={{ color: "#2563eb" }}>Packing / Item Details</h3>
                <p>Mode of transportation, packages, and logistics compliance</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Mode of Transportation</label>
                <input
                  value={formState.mode_of_transportation}
                  onChange={(e) => handleFieldChange("mode_of_transportation", e.target.value)}
                  placeholder="Air"
                />
              </div>
              <div className="admin-field">
                <label>Transportation Terms</label>
                <input
                  value={formState.transportation_terms}
                  onChange={(e) => handleFieldChange("transportation_terms", e.target.value)}
                  placeholder="EXW"
                />
              </div>
              <div className="admin-field">
                <label>AWB / BL No.</label>
                <input
                  value={formState.awb_bl_no}
                  onChange={(e) => handleFieldChange("awb_bl_no", e.target.value)}
                  placeholder="Air Waybill or BL No."
                />
              </div>
              <div className="admin-field">
                <label>Number of Packages</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.no_of_packages}
                  onChange={(e) => handleFieldChange("no_of_packages", e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>Package Description</label>
                <textarea
                  rows="2"
                  value={formState.package_description}
                  onChange={(e) => handleFieldChange("package_description", e.target.value)}
                  placeholder="Apparel and Textiles in corrugated boxes"
                />
              </div>
              <div className="admin-field">
                <label>Total Gross Weight Unit</label>
                <select
                  value={formState.total_gross_weight_unit}
                  onChange={(e) => handleFieldChange("total_gross_weight_unit", e.target.value)}
                >
                  <option value="GRAMS">GRAMS</option>
                  <option value="KILOGRAMS">KILOGRAMS</option>
                  <option value="TONNES">TONNES</option>
                </select>
              </div>
              <div className="admin-field">
                <label>HS Code</label>
                <input
                  value={formState.hs_code}
                  onChange={(e) => handleFieldChange("hs_code", e.target.value)}
                  placeholder="84433210"
                />
              </div>
              <div className="admin-field">
                <label>Country of Origin</label>
                <input
                  value={formState.country_of_origin}
                  onChange={(e) => handleFieldChange("country_of_origin", e.target.value)}
                  placeholder="India"
                />
              </div>
              <div className="admin-field admin-field--full">
                <label>OTHER INFORMATION AND COMPLIANCE DETAILS</label>
                <textarea
                  rows="2"
                  value={formState.other_information_compliance_details}
                  onChange={(e) => handleFieldChange("other_information_compliance_details", e.target.value)}
                  placeholder="Good Condition"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Product Details */}
          <div className="export-form-section">
            <div className="export-items-header">
              <div>
                <h3 style={{ margin: 0, color: "var(--admin-navy)" }}>6. Product Details</h3>
                <p style={{ margin: "2px 0 0", color: "var(--admin-ink-soft)", fontSize: "0.78rem" }}>
                  Add products with Product Name, Quantity, and Price ({formState.currency_code || "USD"})
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                  onClick={() => setShowBulkPaste((prev) => !prev)}
                >
                  <Icon name="copy" size={14} />
                  <span>{showBulkPaste ? "Hide Bulk Paste" : "Bulk Paste"}</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--soft"
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                  onClick={addItemRow}
                >
                  <Icon name="plus" size={14} />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {showBulkPaste && (
              <div className="export-bulk-paste-box">
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "var(--admin-ink-soft)" }}>
                  Paste rows from Excel or TSV (Columns: Product, Quantity, Price, Unit Net Weight in Grams):
                </p>
                <textarea
                  rows="3"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="Product 1&#9;10&#9;100&#9;180&#10;Product 2&#9;20&#9;250&#9;210"
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  onClick={addPastedItems}
                >
                  Import Pasted Rows
                </button>
              </div>
            )}

            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "50%" }}>Product</th>
                    <th style={{ width: "20%" }}>Quantity</th>
                    <th style={{ width: "22%" }}>Price ({formState.currency_code || "USD"})</th>
                    <th style={{ width: "8%", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          required
                          value={item.product_name}
                          onChange={(e) => setItem(index, "product_name", e.target.value)}
                          placeholder={`Product ${index + 1}`}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--admin-line)",
                            borderRadius: "8px",
                            fontSize: "0.86rem",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          required
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.qty}
                          onChange={(e) => setItem(index, "qty", e.target.value)}
                          placeholder="Quantity"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--admin-line)",
                            borderRadius: "8px",
                            fontSize: "0.86rem",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_value}
                          onChange={(e) => setItem(index, "unit_value", e.target.value)}
                          placeholder="Price"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--admin-line)",
                            borderRadius: "8px",
                            fontSize: "0.86rem",
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--delete"
                          onClick={() => removeItemRow(index)}
                          title="Remove item"
                          style={{ padding: "6px 8px" }}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7: Individual Product Unit Net Weights */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>7. Individual Product Unit Net Weights</h3>
                <p>Enter the unit net weight in grams for each added product</p>
              </div>
            </div>
            <div className="admin-form-grid">
              {items.map((item, index) => (
                <div key={index} className="admin-field">
                  <label>
                    {item.product_name.trim() || `Product ${index + 1}`} Unit Net Weight (Grams)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_net_weight}
                    onChange={(e) => setItem(index, "unit_net_weight", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 8: Signatory Details */}
          <div className="export-form-section">
            <div className="export-form-section__head">
              <div>
                <h3>8. Signatory Details</h3>
                <p>Authorized signature and designation</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Signatory Name</label>
                <input
                  value={formState.signatory_name}
                  onChange={(e) => handleFieldChange("signatory_name", e.target.value)}
                  placeholder="Saaluvesa Enterprises Private Limited"
                />
              </div>
              <div className="admin-field">
                <label>Signatory Designation</label>
                <input
                  value={formState.signatory_designation}
                  onChange={(e) => handleFieldChange("signatory_designation", e.target.value)}
                  placeholder="Manager"
                />
              </div>
            </div>
          </div>

          {/* Live Calculations Summary Box */}
          <div className="export-form-live-summary">
            <div className="export-form-live-summary__item">
              <span className="export-form-live-summary__label">Total Products</span>
              <span className="export-form-live-summary__val">{items.length}</span>
            </div>
            <div className="export-form-live-summary__item">
              <span className="export-form-live-summary__label">Total Quantity</span>
              <span className="export-form-live-summary__val">{formTotals.quantity}</span>
            </div>
            <div className="export-form-live-summary__item">
              <span className="export-form-live-summary__label">Goods Value</span>
              <span className="export-form-live-summary__val">
                {formState.currency_code || "USD"} {formTotals.value.toFixed(2)}
              </span>
            </div>
            {numTaxRate > 0 && (
              <div className="export-form-live-summary__item">
                <span className="export-form-live-summary__label">
                  {formState.tax_type || "Tax"} ({numTaxRate}%)
                </span>
                <span className="export-form-live-summary__val">
                  {formState.currency_code || "USD"} {calculatedTax.toFixed(2)}
                </span>
              </div>
            )}
            <div className="export-form-live-summary__item">
              <span className="export-form-live-summary__label">Final Total</span>
              <span className="export-form-live-summary__val">
                {formState.currency_code || "USD"} {calculatedFinalTotal.toFixed(2)}
              </span>
            </div>
            <div className="export-form-live-summary__item">
              <span className="export-form-live-summary__label">Total Weight</span>
              <span className="export-form-live-summary__val">
                {(formTotals.weight / 1000).toFixed(3)} kg ({formTotals.weight.toFixed(0)} g)
              </span>
            </div>
          </div>

          {error && (
            <p className="admin-field-error" style={{ marginTop: 12 }} role="alert">
              <Icon name="alert" size={14} />
              {error}
            </p>
          )}

          {/* ── Save Details Button matching screenshot ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, marginBottom: 16 }}>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ padding: "10px 22px", fontSize: "0.92rem", fontWeight: 600, background: "#2563eb", borderColor: "#2563eb" }}
              disabled={saving}
            >
              {saving ? <Spinner size={16} /> : <Icon name="save" size={16} />}
              <span>{saving ? "Saving Details…" : "Save Details"}</span>
            </button>
          </div>

          {/* ── Under Save Details: Commercial Invoice, Proforma Invoice, Packing List (View, PDF) ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            {/* Commercial Invoice */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <strong style={{ color: "#2563eb", fontSize: "14px", fontWeight: 700 }}>Commercial Invoice</strong>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 8px",
                  }}
                  onClick={() => {
                    setViewingDoc(currentPreviewDoc);
                    setViewingHtmlType("commercial");
                  }}
                >
                  <Icon name="eye" size={14} />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  style={{
                    background: "#2563eb",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 14px",
                  }}
                  onClick={async () => {
                    if (!activeSavedDoc?.id) {
                      const saved = await saveForm();
                      if (saved?.id) previewPdf(saved, "commercial");
                    } else {
                      previewPdf(activeSavedDoc, "commercial");
                    }
                  }}
                >
                  <Icon name="download" size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Proforma Invoice */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <strong style={{ color: "#f97316", fontSize: "14px", fontWeight: 700 }}>Proforma Invoice</strong>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#f97316",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 8px",
                  }}
                  onClick={() => {
                    setViewingDoc(currentPreviewDoc);
                    setViewingHtmlType("proforma");
                  }}
                >
                  <Icon name="eye" size={14} />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  style={{
                    background: "#f97316",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 14px",
                  }}
                  onClick={async () => {
                    if (!activeSavedDoc?.id) {
                      const saved = await saveForm();
                      if (saved?.id) previewPdf(saved, "proforma");
                    } else {
                      previewPdf(activeSavedDoc, "proforma");
                    }
                  }}
                >
                  <Icon name="download" size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Packing List */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <strong style={{ color: "#0d9488", fontSize: "14px", fontWeight: 700 }}>Packing List</strong>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0d9488",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 8px",
                  }}
                  onClick={() => {
                    setViewingDoc(currentPreviewDoc);
                    setViewingHtmlType("packing");
                  }}
                >
                  <Icon name="eye" size={14} />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  style={{
                    background: "#0d9488",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 14px",
                  }}
                  onClick={async () => {
                    if (!activeSavedDoc?.id) {
                      const saved = await saveForm();
                      if (saved?.id) previewPdf(saved, "packing");
                    } else {
                      previewPdf(activeSavedDoc, "packing");
                    }
                  }}
                >
                  <Icon name="download" size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── View Export Document Details Modal ── */}
      <Modal
        open={!!viewingDoc && !viewingHtmlType}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc ? `Export Document: ${viewingDoc.invoice_no}` : "Document Details"}
        sub={viewingDoc ? `Buyer: ${viewingDoc.importer_name} · Shipment Date: ${viewingDoc.shipment_date ? fmtDate(viewingDoc.shipment_date) : "—"}` : ""}
        wide
      >
        {viewingDoc && (
          <div className="export-view-container">
            {/* Quick Actions / PDF Downloads Toolbar */}
            <div className="export-view-hero">
              <div className="export-view-hero__left">
                <div className="export-view-hero__icon">
                  <Icon name="file-text" size={24} />
                </div>
                <div className="export-view-hero__titles">
                  <h3>{viewingDoc.invoice_no}</h3>
                  <p>
                    {viewingDoc.importer_name} · {viewingDoc.items?.length || 0} product
                    {viewingDoc.items?.length === 1 ? "" : "s"} · Created {fmtDateTime(viewingDoc.createdAt)}
                  </p>
                </div>
              </div>
              <div className="export-view-hero__right">
                <Badge tone={statusTone(viewingDoc.status)}>{viewingDoc.status || "Generated"}</Badge>
                <button
                  type="button"
                  className="admin-btn admin-btn--soft"
                  onClick={() => {
                    openEditModal(viewingDoc);
                  }}
                >
                  <Icon name="pencil" size={14} />
                  <span>Edit Document</span>
                </button>
              </div>
            </div>

            {/* Document PDF Generation & HTML Preview Cards */}
            <div className="export-view-downloads">
              <div className="export-view-download-card">
                <div>
                  <strong>Commercial Invoice</strong>
                  <small>For customs declaration & international trade</small>
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => setViewingHtmlType("commercial")}
                  >
                    <Icon name="eye" size={13} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--edit"
                    onClick={() => previewPdf(viewingDoc, "commercial")}
                  >
                    <Icon name="external-link" size={13} />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => downloadPdf(viewingDoc, "commercial", `${viewingDoc.invoice_no}-commercial.pdf`)}
                  >
                    <Icon name="download" size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="export-view-download-card">
                <div>
                  <strong>Proforma Invoice</strong>
                  <small>Preliminary bill of sale for buyer approval</small>
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => setViewingHtmlType("proforma")}
                  >
                    <Icon name="eye" size={13} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--edit"
                    onClick={() => previewPdf(viewingDoc, "proforma")}
                  >
                    <Icon name="external-link" size={13} />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => downloadPdf(viewingDoc, "proforma", `${viewingDoc.invoice_no}-proforma.pdf`)}
                  >
                    <Icon name="download" size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="export-view-download-card">
                <div>
                  <strong>Packing List</strong>
                  <small>Itemized package weights, cartons & dimensions</small>
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => setViewingHtmlType("packing")}
                  >
                    <Icon name="eye" size={13} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--edit"
                    onClick={() => previewPdf(viewingDoc, "packing")}
                  >
                    <Icon name="external-link" size={13} />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--view"
                    onClick={() => downloadPdf(viewingDoc, "packing", `${viewingDoc.invoice_no}-packing-list.pdf`)}
                  >
                    <Icon name="download" size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="export-view-grid">
              <div className="export-view-card">
                <div className="export-view-card__title">
                  <Icon name="user" size={16} />
                  <h4>Sender & Buyer</h4>
                </div>
                <div className="export-view-card__body">
                  <p><strong>Sender:</strong> {viewingDoc.sender_name || "Saaluvesa Enterprises Private Limited"}</p>
                  <p><strong>Buyer (Importer):</strong> {viewingDoc.importer_name}</p>
                  <p><strong>Buyer Email:</strong> {viewingDoc.importer_email || "—"}</p>
                  <p><strong>Buyer Address:</strong> {viewingDoc.importer_address || "—"}</p>
                  {viewingDoc.receiver_name && <p><strong>Consignee:</strong> {viewingDoc.receiver_name}</p>}
                </div>
              </div>

              <div className="export-view-card">
                <div className="export-view-card__title">
                  <Icon name="truck" size={16} />
                  <h4>Shipment Logistics</h4>
                </div>
                <div className="export-view-card__body">
                  <p><strong>Shipment Date:</strong> {viewingDoc.shipment_date ? fmtDate(viewingDoc.shipment_date) : "—"}</p>
                  <p><strong>Mode:</strong> {viewingDoc.mode_of_transportation || "Air"}</p>
                  <p><strong>Incoterms:</strong> {viewingDoc.incoterms || "DAP"}</p>
                  <p><strong>AWB / BL:</strong> {viewingDoc.awb_bl_no || "—"}</p>
                  <p><strong>Packages:</strong> {viewingDoc.no_of_packages || 1}</p>
                </div>
              </div>

              <div className="export-view-card">
                <div className="export-view-card__title">
                  <Icon name="dollar-sign" size={16} />
                  <h4>Financial Totals</h4>
                </div>
                <div className="export-view-card__body">
                  <p><strong>Goods Value:</strong> {viewingDoc.currency_code || "USD"} {Number(viewingDoc.total_goods_value || 0).toFixed(2)}</p>
                  {viewingDoc.tax_rate > 0 && (
                    <p><strong>{viewingDoc.tax_type || "Tax"} ({viewingDoc.tax_rate}%):</strong> {viewingDoc.currency_code || "USD"} {Number(viewingDoc.tax_amount || 0).toFixed(2)}</p>
                  )}
                  <p><strong>Final Amount:</strong> {viewingDoc.currency_code || "USD"} {Number(viewingDoc.final_total_amount || viewingDoc.total_goods_value || 0).toFixed(2)}</p>
                  <p><strong>Total Weight:</strong> {viewingDoc.total_net_weight_kg || "0.00"} kg ({viewingDoc.total_net_weight_lbs || "0.00"} lbs)</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="admin-table-wrap" style={{ marginTop: 16 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    <th>Unit Wt. (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingDoc.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{it.product_name}</strong>
                      </td>
                      <td>{it.qty} {it.uom || "PCS"}</td>
                      <td>{viewingDoc.currency_code || "USD"} {Number(it.unit_value || 0).toFixed(2)}</td>
                      <td>{viewingDoc.currency_code || "USD"} {Number(it.sub_total || Number(it.qty) * Number(it.unit_value) || 0).toFixed(2)}</td>
                      <td>{(Number(it.unit_net_weight || 0) * 1000).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Document HTML Preview Modal ── */}
      <Modal
        open={Boolean(viewingHtmlType && viewingDoc)}
        onClose={() => setViewingHtmlType(null)}
        title={
          viewingHtmlType === "packing"
            ? "Packing List"
            : viewingHtmlType === "commercial"
              ? "Commercial Invoice"
              : "Proforma Invoice"
        }
        sub={`Previewing document for ${viewingDoc?.invoice_no}`}
        wide
      >
        {viewingDoc && viewingHtmlType && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "14px" }}>
              <button
                type="button"
                className="admin-btn admin-btn--soft"
                onClick={() => previewPdf(viewingDoc, viewingHtmlType)}
              >
                <Icon name="external-link" size={14} />
                <span>Open PDF</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() =>
                  downloadPdf(
                    viewingDoc,
                    viewingHtmlType,
                    `${viewingDoc.invoice_no}-${viewingHtmlType}.pdf`,
                  )
                }
              >
                <Icon name="download" size={14} />
                <span>Download PDF</span>
              </button>
            </div>
            <div style={{ border: "1px solid var(--admin-line)", borderRadius: 8, padding: 12, background: "#ffffff", overflowX: "auto" }}>
              <ExportDocumentPreview document={viewingDoc} type={viewingHtmlType} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
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
            <Route path="contacts" element={<Contacts />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

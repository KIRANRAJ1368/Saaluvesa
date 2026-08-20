import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./LanguageSelector.css";

export const LANGUAGES = [
  { code: "en",    label: "English",    native: "English" },
  { code: "ta",    label: "Tamil",      native: "தமிழ்" },
  { code: "hi",    label: "Hindi",      native: "हिन्दी" },
  { code: "te",    label: "Telugu",     native: "తెలుగు" },
  { code: "kn",    label: "Kannada",    native: "ಕನ್ನಡ" },
  { code: "ml",    label: "Malayalam",  native: "മലയാളം" },
  { code: "mr",    label: "Marathi",    native: "मराठी" },
  { code: "bn",    label: "Bengali",    native: "বাংলা" },
  { code: "gu",    label: "Gujarati",   native: "ગુજરાતી" },
  { code: "pa",    label: "Punjabi",    native: "ਪੰਜਾਬੀ" },
  { code: "ur",    label: "Urdu",       native: "اردو" },
  { code: "ar",    label: "Arabic",     native: "العربية" },
  { code: "fr",    label: "French",     native: "Français" },
  { code: "de",    label: "German",     native: "Deutsch" },
  { code: "es",    label: "Spanish",    native: "Español" },
  { code: "zh-CN", label: "Chinese",    native: "中文" },
  { code: "ja",    label: "Japanese",   native: "日本語" },
  { code: "ko",    label: "Korean",     native: "한국어" },
  { code: "ru",    label: "Russian",    native: "Русский" },
  { code: "pt",    label: "Portuguese", native: "Português" },
  { code: "it",    label: "Italian",    native: "Italiano" },
];

export function getSavedLanguageCode() {
  try {
    const saved = localStorage.getItem("saalu_selected_lang");
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch (e) {}
  return "en";
}

export function applyLanguage(langCode, retriesLeft = 15) {
  if (typeof window.triggerGoogleTranslate === "function") {
    const ok = window.triggerGoogleTranslate(langCode);
    if (ok) return;
  }

  const select = document.querySelector(".goog-te-combo");
  if (select && select.options && select.options.length > 0) {
    let targetIndex = -1;
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (langCode === "en") {
        if (opt.value === "" || opt.value === "en" || opt.text.toLowerCase().includes("select") || opt.text.toLowerCase().includes("english")) {
          targetIndex = i;
          break;
        }
      } else {
        if (opt.value.toLowerCase() === langCode.toLowerCase()) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== -1) {
      select.selectedIndex = targetIndex;
      select.value = select.options[targetIndex].value;
      select.options[targetIndex].selected = true;
    } else {
      select.value = langCode === "en" ? "" : langCode;
    }

    try {
      const evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", true, true);
      select.dispatchEvent(evt);
    } catch (e) {}

    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.dispatchEvent(new Event("input", { bubbles: true }));

    if (typeof select.onchange === "function") {
      try { select.onchange(); } catch (e) {}
    }
    return;
  }

  if (retriesLeft > 0) {
    setTimeout(() => applyLanguage(langCode, retriesLeft - 1), 150);
  }
}

export default function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => {
    const code = getSavedLanguageCode();
    return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  });
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync state if language changes elsewhere
  useEffect(() => {
    const handleLangChange = (e) => {
      const code = e.detail || getSavedLanguageCode();
      const lang = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
      setSelected(lang);
    };

    window.addEventListener("saalu_language_changed", handleLangChange);
    return () => window.removeEventListener("saalu_language_changed", handleLangChange);
  }, []);

  // Focus search input on open, clear search on close
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector(".lang-selector__trigger")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Filtered languages by search term
  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (lang) =>
        lang.label.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Handle language selection
  const handleSelect = useCallback((lang) => {
    setSelected(lang);
    setOpen(false);
    try {
      localStorage.setItem("saalu_selected_lang", lang.code);
    } catch (e) {}

    window.dispatchEvent(new CustomEvent("saalu_language_changed", { detail: lang.code }));
    applyLanguage(lang.code);
  }, []);

  return (
    <div
      className={`lang-selector${open ? " lang-selector--open" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="lang-selector__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${selected.label}. Click to change language.`}
        onClick={() => setOpen((v) => !v)}
        title="Select language"
      >
        <svg
          className="lang-selector__globe"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
          <ellipse cx="10" cy="10" rx="3.5" ry="8.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1.5 7.5h17M1.5 12.5h17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>

        <span className="lang-selector__label">{selected.native}</span>

        <svg
          className="lang-selector__chevron"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="lang-selector__dropdown">
          <div className="lang-selector__search-box">
            <svg
              className="lang-selector__search-icon"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="lang-selector__search-input"
              placeholder="Type language (e.g. Tamil, French, English...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredLanguages.length === 1) {
                  e.preventDefault();
                  handleSelect(filteredLanguages[0]);
                }
              }}
              aria-label="Search language"
            />
            {search && (
              <button
                type="button"
                className="lang-selector__search-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <ul
            className="lang-selector__list"
            role="listbox"
            aria-label="Language options"
          >
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <li
                  key={lang.code}
                  role="option"
                  aria-selected={selected.code === lang.code}
                  className={`lang-selector__option${selected.code === lang.code ? " is-active" : ""}`}
                  onClick={() => handleSelect(lang)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(lang);
                    }
                  }}
                  tabIndex={0}
                >
                  <span className="lang-selector__option-text">
                    <span className="lang-selector__option-native">{lang.native}</span>
                    <span className="lang-selector__option-secondary">({lang.label})</span>
                  </span>
                  {selected.code === lang.code && (
                    <svg
                      className="lang-selector__check"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.5L6.5 11.5L12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              ))
            ) : (
              <li className="lang-selector__empty">No languages found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef, useCallback } from "react";
import "./LanguageSelector.css";

export const LANGUAGES = [
  { code: "en",    label: "English",    native: "English" },
  { code: "ta",    label: "Tamil",      native: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd" },
  { code: "hi",    label: "Hindi",      native: "\u0939\u093f\u0928\u094d\u0926\u0940" },
  { code: "te",    label: "Telugu",     native: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41" },
  { code: "kn",    label: "Kannada",    native: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1" },
  { code: "ml",    label: "Malayalam",  native: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02" },
  { code: "mr",    label: "Marathi",    native: "\u092e\u0930\u093e\u0920\u0940" },
  { code: "bn",    label: "Bengali",    native: "\u09ac\u09be\u0982\u09b2\u09be" },
  { code: "gu",    label: "Gujarati",   native: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0" },
  { code: "pa",    label: "Punjabi",    native: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40" },
  { code: "ur",    label: "Urdu",       native: "\u0627\u0631\u062f\u0648" },
  { code: "ar",    label: "Arabic",     native: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
  { code: "fr",    label: "French",     native: "Fran\u00e7ais" },
  { code: "de",    label: "German",     native: "Deutsch" },
  { code: "es",    label: "Spanish",    native: "Espa\u00f1ol" },
  { code: "zh-CN", label: "Chinese",    native: "\u4e2d\u6587" },
  { code: "ja",    label: "Japanese",   native: "\u65e5\u672c\u8a9e" },
  { code: "ko",    label: "Korean",     native: "\ud55c\uad6d\uc5b4" },
  { code: "ru",    label: "Russian",    native: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
  { code: "pt",    label: "Portuguese", native: "Portugu\u00eas" },
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
  const [selected, setSelected] = useState(() => {
    const code = getSavedLanguageCode();
    return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  });
  const containerRef = useRef(null);

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
        <ul
          className="lang-selector__dropdown"
          role="listbox"
          aria-label="Language options"
        >
          {LANGUAGES.map((lang) => (
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
              <span className="lang-selector__option-native">{lang.native}</span>
              <span className="lang-selector__option-en">{lang.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
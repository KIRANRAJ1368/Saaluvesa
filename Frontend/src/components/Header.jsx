import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Header.css";
import logo from "../assets/logo.jpeg";
import LanguageSelector from "./LanguageSelector";

const NAV_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "About", to: "/about" },
  { label: "Products", to: "/products" },
  { label: "Contact Us", to: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const renderLink = (link, onClick) =>
    link.to ? (
      <Link key={link.label} to={link.to} onClick={onClick}>
        {link.label}
      </Link>
    ) : (
      <a key={link.label} href={link.href} onClick={onClick}>
        {link.label}
      </a>
    );

  return (
    <div className="header-wrapper">
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="wrap site-header__row">
          <Link to="/" className="brand" aria-label="Saaluvesa Home" onClick={closeMenu}>
            <img className="brand__logo" src={logo} alt="Saaluvesa" />
            <span className="brand__text">
              SAALU<span>VESA</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => renderLink(link))}
          </nav>

          {/* Language selector - desktop (visible above 960px) */}
          <div className="site-header__lang-desktop">
            <LanguageSelector />
          </div>

          <a
            href="https://castbull.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--mint btn--pill site-header__cta"
          >
            Order Apparels
          </a>

          {/* Language selector - mobile/tablet (visible below 960px, next to hamburger) */}
          <div className="site-header__lang-mobile">
            <LanguageSelector />
          </div>

          <button
            className={`nav-toggle ${menuOpen ? "is-active" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" className="site-nav--mobile" aria-label="Mobile">
            {NAV_LINKS.map((link) => renderLink(link, closeMenu))}
            <a
              href="https://castbull.co.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--mint btn--pill site-nav--mobile-cta"
              onClick={closeMenu}
            >
              Order Apparels
            </a>
          </nav>
        )}
      </header>
    </div>
  );
}

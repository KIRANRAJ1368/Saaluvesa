import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Header.css";
import logo from "../assets/logo.jpeg";

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
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <Link to="/" className="brand" aria-label="Saaluvesa — Home">
            <img className="brand__logo" src={logo} alt="Saaluvesa" />
            <span className="brand__text">
              SAALU<span>VESA</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => renderLink(link))}
          </nav>

          <a href="https://castbull.co.in/" target="_blank" rel="noopener noreferrer" className="btn btn--pill site-header__cta">
            Order Apparels
          </a>

          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <nav className="site-nav--mobile" aria-label="Mobile">
            {NAV_LINKS.map((link) => renderLink(link, () => setMenuOpen(false)))}
            <a
              href="https://castbull.co.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--pill"
              onClick={() => setMenuOpen(false)}
            >
              Order on CastBull
            </a>
          </nav>
        )}
      </header>
    </div>
  );
}
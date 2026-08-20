import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";
import logo from "../assets/logo.jpeg";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__brand-row">
            <img className="brand__logo" src={logo} alt="Saaluvesa" />
            <span className="brand__text">
              SAALU<span>VESA</span>
            </span>
          </div>
          <p>
            Saaluvesa Enterprises Private Limited — Premier custom apparel manufacturing, textile production, and global export solutions.
          </p>
        </div>

        <div className="site-footer__col">
          <h4>Navigate</h4>
          <a href="/#home">Home</a>
          <Link to="/about">About Us</Link>
          <Link to="/products">Products</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="site-footer__col">
          <h4>Order</h4>
          <a href="https://castbull.co.in" target="_blank" rel="noopener noreferrer">
            castbull.co.in
          </a>
          <a href="mailto:contact@saaluvesa.com">contact@saaluvesa.com</a>
          <a href="tel:+919488410884">+91 94884 10884</a>
        </div>

        <div className="site-footer__col">
          <h4>Registered Office</h4>
          <p>
            Dr.No.18/76, Thiru.Ve.Ka. St,
            <br />
            Punjai Puliampatti, Sathyamangalam,
            <br />
            Erode, Tamil Nadu – 638459
          </p>
        </div>
      </div>

      <div className="wrap site-footer__bottom">
        <span className="site-footer__copy">
          Copyright &copy; {year} Saaluvesa Enterprises Private Limited.
        </span>
        <span className="site-footer__dev">
          Developed by <strong>Sai Techno Solutions</strong>
        </span>
      </div>
    </footer>
  );
}

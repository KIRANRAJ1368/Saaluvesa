import React from "react";
import { Link } from "react-router-dom";
import "./ConnectWithUs.css";
import useScrollAnimation from "../hooks/useScrollAnimation";

export default function ConnectWithUs() {
  const animRef = useScrollAnimation();

  return (
    <section id="connect" className="connect" ref={animRef}>
      <div className="wrap connect__grid">
        <div className="connect__copy" data-animate="fade-left">
          <div className="eyebrow connect__eyebrow">Global Sourcing & Export</div>
          <h2>
            Expanding Opportunities
            <br />
            Beyond Custom Apparel.
          </h2>
          <p>
            In addition to apparel, we are also open to the export of any product as per
            your submitted requirements. We ensure reliable sourcing, verification, and
            delivery to meet your business requirements.
          </p>
          <div className="connect__actions">
            <a href="#products" className="btn btn--mint">
              Explore PRODUCTS
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="https://castbull.co.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline-dark"
            >
              Order Apparel on CastBull
            </a>
          </div>
        </div>

        <div className="connect__box" data-animate="card">
          <h3>Partner With Us Globally</h3>
          <p>
            Partner with us to bring your vision to life, whether in textiles or any other
            export opportunities. Let’s explore how we can serve your needs globally.
          </p>

          <ol className="connect__steps">
            <li data-animate="fade-up" className="delay-1">
              <span className="connect__steps-mark">1</span>
              <div>
                <h3>Submit Requirements</h3>
                <p>Tell us your specific product specs, quantity, and target market.</p>
              </div>
            </li>
            <li data-animate="fade-up" className="delay-2">
              <span className="connect__steps-mark">2</span>
              <div>
                <h3>Verification & Sourcing</h3>
                <p>We perform end-to-end quality inspection and reliable sourcing.</p>
              </div>
            </li>
            <li data-animate="fade-up" className="delay-3">
              <span className="connect__steps-mark">3</span>
              <div>
                <h3>Global Delivery</h3>
                <p>Track your shipment smoothly from factory dispatch to destination.</p>
              </div>
            </li>
          </ol>

          <div className="connect__box-cta">
            <Link to="/contact" className="btn btn--mint">
              Contact Us Page
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

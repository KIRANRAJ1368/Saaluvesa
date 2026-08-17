import React from "react";
import "./Hero.css";
import heroBg from "../assets/saaluvesa_export_bg.jpg";

export default function Hero() {
  const heroStyle = {
    backgroundImage: `radial-gradient(50% 60% at 85% 15%, rgba(121, 246, 194, 0.15), transparent 70%), linear-gradient(105deg, rgba(5, 10, 60, 0.94) 0%, rgba(5, 10, 60, 0.85) 45%, rgba(7, 16, 91, 0.70) 100%), url(${heroBg})`
  };

  return (
    <section id="home" className="hero" style={heroStyle}>
      {/* signature stitch-line decoration */}
      <svg className="hero__stitch" viewBox="0 0 600 600" aria-hidden="true">
        <line
          x1="520" y1="0" x2="60" y2="600"
          stroke="var(--color-mint)" strokeOpacity="0.35"
          strokeWidth="2" strokeDasharray="10 10"
        />
        <line
          x1="600" y1="80" x2="140" y2="600"
          stroke="var(--color-mint)" strokeOpacity="0.2"
          strokeWidth="2" strokeDasharray="10 10"
        />
      </svg>

      <div className="hero__inner">
        <div className="hero__copy-col">
          <div className="hero__copy">
            <div className="eyebrow hero__eyebrow stitch-line">
              {/* <span style={{ background: "var(--color-mint)" }} /> */}
              Welcome to SAALUVESA ENTERPRISES PRIVATE LIMITED
            </div>

            <h1 className="hero__headline">
              Crafting Custom Apparel <span>for the World.</span>
            </h1>

            <p className="hero__sub">
              Now we concentrate on the textile and garment sector, with a strategic focus
              on the export of custom-printed T-shirts and apparel. Our mission is to deliver
              high-quality, tailor-made clothing solutions that meet diverse customer requirements
              across global markets.
            </p>

            <div className="hero__actions">
              <a
                href="https://castbull.co.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--mint"
              >
                Order on CastBull
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="#products" className="btn btn--outline-light">
                View Products
              </a>
            </div>
          </div>
        </div>

        {/* Right panel — fabric visual showcase */}
        <div className="hero__visual" aria-hidden="true">
          <img src={heroBg} alt="Apparel and Textile Manufacturing" className="hero__visual-img" />
          <div className="hero__visual-overlay" />
          {/* floating stat badges */}
          <div className="hero__badge hero__badge--tl">
            <span className="hero__badge-num">100%</span>
            <span className="hero__badge-label">Tailor-Made Solutions</span>
          </div>
          <div className="hero__badge hero__badge--br">
            <span className="hero__badge-num">Global</span>
            <span className="hero__badge-label">Export & Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
}

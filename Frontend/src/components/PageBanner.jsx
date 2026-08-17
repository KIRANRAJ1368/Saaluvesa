import React from "react";
import "./PageBanner.css";

export default function PageBanner({ title, subtitle, bgImage }) {
  return (
    <section
      className="page-banner"
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
    >
      <div className="page-banner__overlay" />

      <svg className="page-banner__stitch" viewBox="0 0 600 600" aria-hidden="true">
        <line
          x1="520" y1="0" x2="60" y2="600"
          stroke="#FFFFFF" strokeOpacity="0.35"
          strokeWidth="2" strokeDasharray="10 10"
        />
        <line
          x1="600" y1="80" x2="140" y2="600"
          stroke="#FFFFFF" strokeOpacity="0.22"
          strokeWidth="2" strokeDasharray="10 10"
        />
      </svg>

      <div className="page-banner__content">
        <div className="page-banner__separator">
          <span />
          <span />
          <span />
        </div>
        <h1 className="page-banner__title">{title}</h1>
        {subtitle && <p className="page-banner__subtitle">{subtitle}</p>}
      </div>
    </section>
  );
}



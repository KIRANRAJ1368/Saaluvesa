import React from "react";
import "./ValueStrip.css";
import useScrollAnimation from "../hooks/useScrollAnimation";

const VALUES = [
  {
    title: "Quality",
    body: "Strict quality control and premium standards for plain and custom-printed apparel orders.",
  },
  {
    title: "Reliability",
    body: "End-to-end verification and dependable sourcing for textiles and diverse export products.",
  },
  {
    title: "Export-Ready",
    body: "Seamless paperwork, international compliance, and efficient global shipment logistics.",
  },
];

export default function ValueStrip() {
  const animRef = useScrollAnimation();

  return (
    <section id="about" className="value-strip" ref={animRef}>
      <div className="wrap">
        <div className="value-strip__head" data-animate="fade-up">
          <div className="eyebrow value-strip__eyebrow">Why Saaluvesa</div>
          <h2>Built for Quality, Scale, and Global Trust</h2>
        </div>
        <div className="value-strip__grid">
          {VALUES.map((v, i) => (
            <div
              className={`value-card delay-${i + 1}`}
              data-animate="card"
              key={v.title}
            >
              <span className="">
                <span />
                <span />
                <span />
              </span>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

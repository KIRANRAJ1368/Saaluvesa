import React from "react";
import "./ProductsProcess.css";
import useScrollAnimation from "../hooks/useScrollAnimation";

const ICONS = {
  "file-text": (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  package: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
};

const STEPS = [
  {
    icon: "file-text",
    title: "Share Your Requirement",
    body: "Send your product type, quantity, sizes, colors, and print design — or let us suggest options.",
  },
  {
    icon: "sparkles",
    title: "Design & Approval",
    body: "We prepare a mockup with sample choices and refine it until you fully approve.",
  },
  {
    icon: "shield-check",
    title: "Production & Quality Check",
    body: "Printing and stitching with multi-stage quality inspection before anything gets packed.",
  },
  {
    icon: "package",
    title: "Packing & Global Delivery",
    body: "Secure export packing with tracked shipping, delivered to your doorstep worldwide.",
  },
];

export default function ProductsProcess() {
  const animRef = useScrollAnimation();

  return (
    <section id="process" className="products-process" ref={animRef}>
      <div className="wrap">
        <div className="products-process__head" data-animate="fade-up">
          <div className="eyebrow products-process__eyebrow">How It Works</div>
          <h2>From Requirement to Doorstep.</h2>
          <p>
            A simple, transparent ordering flow built around custom-printed T-shirts and apparel
            export — from your first message to final delivery.
          </p>
        </div>

        <div className="products-process__grid">
          {STEPS.map((step, i) => (
            <article
              className={`products-process__step delay-${i + 1}`}
              data-animate="card"
              key={step.title}
            >
              <span className="products-process__num">0{i + 1}</span>
              <span className="products-process__icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[step.icon]}
                </svg>
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

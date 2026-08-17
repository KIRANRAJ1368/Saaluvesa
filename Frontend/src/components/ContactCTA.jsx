import React from "react";
import "./ContactCTA.css";
import useScrollAnimation from "../hooks/useScrollAnimation";

export default function ContactCTA() {
  const animRef = useScrollAnimation();

  return (
    <section className="contact-cta" ref={animRef}>
      <div className="wrap contact-cta__row" data-animate="fade-up">
        <div>
          <h2>Ready to start your custom order or export inquiry?</h2>
          <p>Partner with Saaluvesa Enterprises Pvt Ltd for reliable manufacturing, custom printing, and global sourcing.</p>
        </div>
        <div className="contact-cta__buttons">
          <a href="#contact" className="btn btn--mint">
            Contact Us
          </a>
          <a
            href="https://castbull.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline-light"
          >
            Place Order on CastBull
          </a>
        </div>
      </div>
    </section>
  );
}
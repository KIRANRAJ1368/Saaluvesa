import React from "react";
import "../index.css";
import "./About.css";
import useScrollAnimation from "../hooks/useScrollAnimation";

import Header from "../components/Header";
import PageBanner from "../components/PageBanner";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import aboutBannerBg from "../assets/hero_bg.jpg";
import ourStoryImg from "../assets/about_our_story.jpg";
import journeyImg from "../assets/about_journey_ahead.jpg";

const ICONS = {
  shirt: (
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
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
  "trending-up": (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

const WHAT_WE_DO = [
  {
    icon: "shirt",
    title: "Custom-Printed T-Shirts",
    body: "Tailored designs for families, groups, businesses, events, and organizations — plus retail and any other purpose as per the customer's requirement.",
  },
  {
    icon: "globe",
    title: "Garment Exports",
    body: "High-quality apparel sourced from different manufacturers and shipped globally to meet international demand.",
  },
  {
    icon: "sparkles",
    title: "Personalized Solutions",
    body: "Flexible printing and design options built around each customer's specific needs and brand identity.",
  },
  {
    icon: "package",
    title: "Bulk & Retail Orders",
    body: "Scalable sourcing capacity across multiple manufacturers for both small and large consignments.",
  },
];

const WHY_CHOOSE_US = [
  {
    icon: "trending-up",
    num: "01",
    title: "Export Expertise",
    body: "Strong understanding of international trade and compliance standards.",
  },
  {
    icon: "shield-check",
    num: "02",
    title: "Quality Commitment",
    body: "Rigorous quality checks ensure durability and comfort in every consignment.",
  },
  {
    icon: "users",
    num: "03",
    title: "Customer-Centric Approach",
    body: "Designs and solutions tailored to each client's requirements.",
  },
  {
    icon: "globe",
    num: "04",
    title: "Global Reach",
    body: "Efficient logistics and supply chain management for timely delivery worldwide.",
  },
];

export default function About() {
  const animRef = useScrollAnimation();

  return (
    <div className="about-page" ref={animRef}>
      <Header />

      {/* ---------- Banner ---------- */}
      <PageBanner
        bgImage={aboutBannerBg}
        title="About Us"
        subtitle="Trusted Global Partner in the Apparel Industry"
      />

      {/* ---------- Company Overview ---------- */}
      <section className="about-section about-section--ivory">
        <div className="wrap about-overview">
          <div className="about-overview__layout">
            <div className="about-overview__text" data-animate="fade-left">
              <div className="about-section__head">
                <div className="eyebrow about-section__eyebrow">Our Story</div>
                <div className="about-established">
                  <span className="about-established__label">Established</span>
                  <span className="about-established__year">2025</span>
                </div>
                <h2>Who We Are.</h2>
              </div>
              <p>
                Saaluvesa Enterprises Private Limited was incorporated on 14 September 2025 in INDIA
                with a broad vision to engage in wholesale and retail trading, importing, exporting,
                and distribution of a wide range of goods and commodities across India and
                international markets.
              </p>
              <p>
                Our incorporation objectives empower us to operate retail outlets, warehouses, online
                platforms, and trading facilities, while also aiming to build strong partnerships at
                national and international level. Over time, we have strategically focused our
                expertise on the textile and garment sector, specializing in the export of
                custom-printed T-shirts and apparel designed to meet diverse customer requirements
                worldwide.
              </p>
            </div>
            <div className="about-overview__image-wrap" data-animate="fade-right">
              <img
                src={ourStoryImg}
                alt="Saaluvesa textile garment manufacturing studio"
                className="about-overview__image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What We Do ---------- */}
      <section className="about-section about-section--navy">
        <div className="wrap">
          <div className="about-section__head" data-animate="fade-up">
            <div className="eyebrow about-section__eyebrow">What We Do</div>
            <h2>Creativity, Technology, and Craftsmanship.</h2>
            <p>
              At Saaluvesa Enterprises, we combine creativity, technology, and quality
              craftsmanship to deliver garments that reflect individuality and brand identity.
            </p>
          </div>

          <div className="about-grid">
            {WHAT_WE_DO.map((item, i) => (
              <div
                className={`about-card about-card--dark delay-${i + 1}`}
                data-animate="card"
                key={item.title}
              >
                <span className="about-card__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="about-card__icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[item.icon]}
                  </svg>
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Vision & Mission ---------- */}
      <section className="about-section about-section--ivory-deep">
        <div className="wrap">
          <div className="about-section__head" data-animate="fade-up">
            <div className="eyebrow about-section__eyebrow">Vision & Mission</div>
            <h2>Guided by Purpose, Driven by Quality.</h2>
          </div>

          <div className="about-vm-grid">
            <div className="about-vm-card delay-1" data-animate="card">
              <h3>Our Vision</h3>
              <p>
                To become a trusted global partner in the apparel industry by delivering
                innovative, high quality, and customized garments that empower individuals and
                businesses to express themselves.
              </p>
            </div>

            <div className="about-vm-card delay-2" data-animate="card">
              <h3>Our Mission</h3>
              <ul>
                <li>Provide world-class custom-printed garments at competitive export standards.</li>
                <li>Build long-term relationships with clients through reliability, transparency, and timely delivery.</li>
                <li>Continuously innovate in textile design, printing technology, and sustainable production practices.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Why Choose Us ---------- */}
      <section className="about-section about-section--navy">
        <div className="wrap">
          <div className="about-section__head" data-animate="fade-up">
            <div className="eyebrow about-section__eyebrow">Why Choose Us</div>
            <h2>Built on Expertise, Quality, and Reach.</h2>
          </div>

          <div className="about-why-grid">
            {WHY_CHOOSE_US.map((item, i) => (
              <div
                className={`about-why-card about-why-card--light delay-${i + 1}`}
                data-animate="card"
                key={item.title}
              >
                <div className="about-why-card__top">
                  <span className="about-why-card__num">{item.num}</span>
                  <span className="about-why-card__icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {ICONS[item.icon]}
                    </svg>
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          {/* Castbull Apparel Brand Website Callout */}
          <div className="about-why-cta" data-animate="fade-up">
            <div className="about-why-cta__content">
              <div className="about-why-cta__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <polyline points="3.29 7 12 12 20.71 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
              </div>
              <p className="about-why-cta__text">
                Requested to proceed with our Integrated Customer-friendly Apparel Brand Website,{" "}
                <a
                  href="https://castbull.co.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://castbull.co.in/
                </a>
                , to place your Plain and Custom Printed Requirements, with our own branding.
              </p>
            </div>
            <a
              href="https://castbull.co.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--mint btn--pill about-why-cta__btn"
            >
              <span>Visit Castbull</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Our Journey Ahead ---------- */}
      <section className="about-section about-section--ivory">
        <div className="wrap about-overview">
          <div className="about-overview__layout about-overview__layout--reverse">
            <div className="about-overview__text" data-animate="fade-right">
              <div className="about-section__head">
                <div className="eyebrow about-section__eyebrow">Our Journey Ahead</div>
                <h2>Rooted in Textiles, Reaching the World.</h2>
              </div>
              <p>
                While our incorporation objectives allow us to explore diverse industries, our
                current journey is driven by passion for textiles and apparel. Saaluvesa Enterprises
                Private Limited is committed to expanding its footprint in the global garment export
                market, strengthening India's reputation in the textile industry, and delivering
                products that combine tradition, innovation, and modern style.
              </p>
              <p>
                Partner with us to bring your vision to life, whether in textiles or any other export
                related requirements. Let's explore how we can serve your needs globally.
              </p>
            </div>
            <div className="about-overview__image-wrap" data-animate="fade-left">
              <img
                src={journeyImg}
                alt="Global garment and textile export operations"
                className="about-overview__image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Contact Section ---------- */}
      <ContactSection />

      <Footer />
    </div>
  );
}

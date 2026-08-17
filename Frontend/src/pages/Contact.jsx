import React from "react";
import "../index.css";
import "./Contact.css";
import useScrollAnimation from "../hooks/useScrollAnimation";
import Header from "../components/Header";
import PageBanner from "../components/PageBanner";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import contactBannerBg from "../assets/whatwedo_exports.jpg";

export default function Contact() {
  const animRef = useScrollAnimation();
  const mapAddressQuery = encodeURIComponent(
    "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, Sathyamangalam, Erode, Tamil Nadu 638459"
  );
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapAddressQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="contact-page" ref={animRef}>
      <Header />

      {/* ---------- Banner ---------- */}
      <PageBanner
        bgImage={contactBannerBg}
        title="Contact Us"
        subtitle="Get in touch — we'd love to hear from you"
      />

      {/* Existing Contact Section reused directly */}
      <ContactSection />

      {/* Location / Google Map Section */}
      <section className="contact-map-section">
        <div className="wrap">
          <div className="contact-map-section__head" data-animate="fade-up">
            <div className="eyebrow contact-map-section__eyebrow">Our Location</div>
            <h2>Visit Our Registered Office.</h2>
            <p>
              Located in Punjai Puliampatti, Sathyamangalam, Erode district, Tamil Nadu.
            </p>
          </div>

          <div className="contact-map-frame-wrapper delay-1" data-animate="fade-up">
            <iframe
              title="Saaluvesa Registered Office Location Map"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
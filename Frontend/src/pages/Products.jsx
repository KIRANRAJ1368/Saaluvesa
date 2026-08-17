import React from "react";
import "../index.css";
import "./Product.css";

import Header from "../components/Header";
import PageBanner from "../components/PageBanner";
import ProductsTeaser from "../components/ProductsTeaser";
import ProductsProcess from "../components/ProductsProcess";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import productsBannerBg from "../assets/product_textiles.jpg";

export default function Products() {
  return (
    <div className="products-page">
      <Header />

      {/* ---------- Banner ---------- */}
      <PageBanner
        bgImage={productsBannerBg}
        title="Products"
        subtitle="Apparel & Beyond — Built for Global Export"
      />

      {/* Existing Products section reused directly */}
      <ProductsTeaser />

      {/* How It Works process section */}
      <ProductsProcess />

      {/* Contact Form Section */}
      <ContactSection />

      <Footer />
    </div>
  );
}

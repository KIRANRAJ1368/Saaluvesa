import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./ProductsTeaser.css";
import useScrollAnimation from "../hooks/useScrollAnimation";
import { PRODUCT_CATALOG } from "../data/products";
import { api, assetUrl } from "../lib/api";

const FALLBACK = PRODUCT_CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  description: p.shortDescription,
  image: p.images[0],
}));

export default function ProductsTeaser() {
  const animRef = useScrollAnimation();
  const [products, setProducts] = useState(FALLBACK);

  useEffect(() => {
    let isMounted = true;
    api("/products")
      .then((rows) => {
        if (!isMounted || !Array.isArray(rows) || !rows.length) return;
        setProducts(
          rows.map((product) => {
            const staticMatch = PRODUCT_CATALOG.find((item) => item.id === product.slug);
            return {
              id: product.slug || product.id,
              name: product.name,
              category: staticMatch?.category || "Catalogue",
              description: product.description,
              image: assetUrl(product.image) || staticMatch?.images[0] || FALLBACK[0].image,
            };
          }),
        );
      })
      .catch(() => { /* static catalogue stays available while the API is offline */ });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="products" className="products-teaser" ref={animRef}>
      <div className="wrap">
        <div className="products-teaser__head" data-animate="fade-up">
          <div>
            <div className="eyebrow products-teaser__eyebrow">Our Products</div>
            <h2>Apparel & Beyond — Built for Global Export.</h2>
          </div>
          <a href="#contact" className="btn btn--outline-light">
            Request Custom Product Quote
          </a>
        </div>

        <div className="products-teaser__grid">
          {products.map((p, i) => (
            <article
              className={`product-card delay-${i + 1}`}
              data-animate="card"
              key={p.id}
            >
              <Link
                to={`/products/${encodeURIComponent(p.id)}`}
                className="product-card__image-container"
                aria-label={`View details for ${p.name}`}
              >
                <img src={p.image} alt={p.name} className="product-card__image" />
                <span className="product-card__category">{p.category}</span>
              </Link>
              <div className="product-card__content">
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <Link to={`/products/${encodeURIComponent(p.id)}`} className="product-card__link">
                  View details
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

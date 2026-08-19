import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./ProductDetails.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactSection from "../components/ContactSection";
import { PRODUCT_CATALOG } from "../data/products";
import { api, assetUrl } from "../lib/api";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8h8M8.5 4l4 4-4 4" />
    </svg>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  let productId = "";
  try {
    productId = decodeURIComponent(id || "");
  } catch {
    productId = id || "";
  }

  const catalogProduct =
    PRODUCT_CATALOG.find(
      (item) =>
        item.id === productId ||
        item.id.toLowerCase() === productId.toLowerCase() ||
        item.name.toLowerCase() === productId.toLowerCase(),
    ) || null;

  const [apiProduct, setApiProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(!catalogProduct);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(!catalogProduct);
    setLoadError(false);
    setNotFound(false);
    setApiProduct(null);

    api(`/products/${encodeURIComponent(productId)}`)
      .then((product) => {
        if (isMounted) setApiProduct(product);
      })
      .catch((error) => {
        if (isMounted) {
          if (error.message === "Product not found") setNotFound(true);
          else if (!catalogProduct) setLoadError(true);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [catalogProduct, productId, retryKey]);

  const matchedCatalog =
    catalogProduct ||
    (apiProduct
      ? PRODUCT_CATALOG.find(
          (item) =>
            item.id === apiProduct.slug ||
            item.name.toLowerCase() === apiProduct.name?.toLowerCase(),
        )
      : null);

  const product = (() => {
    if (notFound && !matchedCatalog) return null;
    if (matchedCatalog && apiProduct) {
      const image = assetUrl(apiProduct.image);
      return {
        ...matchedCatalog,
        id: apiProduct.slug || matchedCatalog.id,
        name: apiProduct.name || matchedCatalog.name,
        shortDescription: apiProduct.description || matchedCatalog.shortDescription,
        description: matchedCatalog.description || apiProduct.description,
        images: [
          image || matchedCatalog.images[0],
          ...matchedCatalog.images.slice(1),
        ],
        website_link: apiProduct.website_link || matchedCatalog.website_link || "https://castbull.co.in/",
      };
    }
    if (matchedCatalog) return matchedCatalog;
    if (apiProduct) {
      return {
        id: apiProduct.slug || String(apiProduct.id),
        name: apiProduct.name,
        category: "Apparel Sector",
        tagline: "High-quality custom apparel, manufactured for global export.",
        shortDescription: apiProduct.description,
        aboutHeading: "Crafted for Performance, Scale, and Comfort.",
        description: apiProduct.description,
        features: [
          "Premium export-grade cotton & fabric blends",
          "High-definition, wash-durable printing & stitching",
          "Flexible order volumes from sampling to bulk containers",
          "Dedicated quality inspection prior to packaging",
          "Worldwide tracked dispatch & door-to-door delivery",
        ],
        customizations: [
          { title: "Print Method", options: ["DTF", "DTG", "Screen Printing", "Embroidery"] },
          { title: "Fabric Options", options: ["100% Cotton", "Cotton Blend", "Heavy Weight"] },
          { title: "Sizing", options: ["XS – 5XL", "Kids Sizes", "Custom Fit"] },
          { title: "Order Quantities", options: ["Single Piece", "Small Batch", "Bulk / Wholesale"] },
        ],
        images: [assetUrl(apiProduct.image) || PRODUCT_CATALOG[0].images[0]],
        website_link: apiProduct.website_link || "https://castbull.co.in/",
      };
    }
    return null;
  })();

  if (isLoading) {
    return (
      <div className="product-details-page">
        <Header />
        <main className="details-not-found">
          <p className="eyebrow">Product Catalogue</p>
          <h1>Loading product details…</h1>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError && !product) {
    return (
      <div className="product-details-page">
        <Header />
        <main className="details-not-found">
          <p className="eyebrow">Product Catalogue</p>
          <h1>We couldn't load this product.</h1>
          <p className="details-not-found__hint">
            Something went wrong while fetching the product details. Please try again.
          </p>
          <div className="details-not-found__actions">
            <button type="button" className="btn btn--mint" onClick={() => setRetryKey((k) => k + 1)}>
              Try again
            </button>
            <Link className="btn btn--outline-light" to="/products">Back to products</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-page">
        <Header />
        <main className="details-not-found">
          <p className="eyebrow">Product Catalogue</p>
          <h1>That product is not available.</h1>
          <Link className="btn btn--mint" to="/products">Back to products</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const related = PRODUCT_CATALOG.filter((item) => item.id !== product.id);
  const activeImage =
    (product.images && product.images[0]) ||
    PRODUCT_CATALOG[0].images[0];

  return (
    <div className="product-details-page">
      <Header />
      <main>
        <nav className="details-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">Products</Link>
          <span>/</span>
          <strong>{product.name}</strong>
        </nav>

        {/* Hero Section */}
        <section className="details-hero">
          <div className="wrap details-hero__grid">
            <div className="details-gallery">
              <div className="details-gallery__main">
                <img
                  src={activeImage}
                  alt={product.name}
                  onError={(e) => {
                    const fallback =
                      matchedCatalog?.images?.[0] ||
                      PRODUCT_CATALOG[0].images[0];
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>
            </div>

            <div className="details-summary">
              <h1>{product.name}</h1>
              <p className="details-summary__description">{product.shortDescription || product.description}</p>
              <div className="details-summary__actions">
                <a
                  href={product.website_link || "https://castbull.co.in/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--mint details-summary__button"
                >
                  Order Apparels
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        <section className="details-related">
          <div className="wrap">
            <div className="details-section-head">
              <p className="eyebrow">Explore More</p>
              <h2>Related products.</h2>
            </div>
            <div className="details-related__grid">
              {related.map((item) => (
                <Link
                  className="details-related-card"
                  to={`/products/${item.id}`}
                  key={item.id}
                  aria-label={`View details for ${item.name}`}
                >
                  <div className="details-related-card__image">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      onError={(e) => {
                        const fallback =
                          PRODUCT_CATALOG.find((c) => c.id === item.id)?.images[0] ||
                          PRODUCT_CATALOG[0].images[0];
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  </div>
                  <div className="details-related-card__body">
                    <p>{item.category}</p>
                    <h3>{item.name}</h3>
                    <span>View details <ArrowIcon /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

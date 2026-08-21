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
  const [allProducts, setAllProducts] = useState(PRODUCT_CATALOG);
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

    Promise.allSettled([
      api(`/products/${encodeURIComponent(productId)}`),
      api("/products"),
    ]).then(([detailResult, listResult]) => {
      if (!isMounted) return;

      if (listResult.status === "fulfilled" && Array.isArray(listResult.value) && listResult.value.length > 0) {
        const mapped = listResult.value.map((p) => {
          const staticMatch = PRODUCT_CATALOG.find(
            (item) =>
              item.id === p.slug ||
              String(item.id) === String(p.id) ||
              item.name?.toLowerCase() === p.name?.toLowerCase(),
          );
          const images = Array.isArray(p.images) && p.images.length
            ? p.images.map((img) => assetUrl(img) || img).filter(Boolean)
            : p.image
            ? [assetUrl(p.image) || p.image].filter(Boolean)
            : staticMatch?.images || [PRODUCT_CATALOG[0].images[0]];

          return {
            id: p.slug || String(p.id),
            rawId: p.id,
            slug: p.slug,
            name: p.name,
            category: staticMatch?.category || "Apparel Sector",
            description: p.description,
            images,
          };
        });
        setAllProducts(mapped);
      }

      if (detailResult.status === "fulfilled") {
        setApiProduct(detailResult.value);
        setIsLoading(false);
      } else {
        const error = detailResult.reason;
        if (error?.message === "Product not found") setNotFound(true);
        else if (!catalogProduct) setLoadError(true);
        setIsLoading(false);
      }
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
      const apiImages = Array.isArray(apiProduct.images) && apiProduct.images.length
        ? apiProduct.images.map((img) => assetUrl(img) || img).filter(Boolean)
        : apiProduct.image
        ? [assetUrl(apiProduct.image)].filter(Boolean)
        : [];
      return {
        ...matchedCatalog,
        id: apiProduct.slug || matchedCatalog.id,
        rawId: apiProduct.id,
        slug: apiProduct.slug,
        name: apiProduct.name || matchedCatalog.name,
        shortDescription: apiProduct.description || matchedCatalog.shortDescription,
        description: matchedCatalog.description || apiProduct.description,
        images: apiImages.length > 0 ? apiImages : matchedCatalog.images,
        website_link: apiProduct.website_link || matchedCatalog.website_link || "https://castbull.co.in/",
      };
    }
    if (matchedCatalog) return matchedCatalog;
    if (apiProduct) {
      const apiImages = Array.isArray(apiProduct.images) && apiProduct.images.length
        ? apiProduct.images.map((img) => assetUrl(img) || img).filter(Boolean)
        : apiProduct.image
        ? [assetUrl(apiProduct.image)].filter(Boolean)
        : [PRODUCT_CATALOG[0].images[0]];
      return {
        id: apiProduct.slug || String(apiProduct.id),
        rawId: apiProduct.id,
        slug: apiProduct.slug,
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
        images: apiImages,
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

  // Related products selection:
  // Strictly excludes the current product, and picks the next available products sequentially.
  const related = (() => {
    const list = allProducts && allProducts.length > 0 ? allProducts : PRODUCT_CATALOG;

    const isCurrentProduct = (item) => {
      if (!item) return false;
      const sameId =
        (product.id && String(item.id).toLowerCase() === String(product.id).toLowerCase()) ||
        (product.slug && String(item.slug || "").toLowerCase() === String(product.slug).toLowerCase()) ||
        (product.rawId && String(item.rawId || "") === String(product.rawId)) ||
        (product.id && String(item.rawId || "") === String(product.id));
      const sameName =
        item.name && product.name && item.name.trim().toLowerCase() === product.name.trim().toLowerCase();
      return Boolean(sameId || sameName);
    };

    const currentIndex = list.findIndex(isCurrentProduct);

    const candidates = [];
    if (currentIndex !== -1) {
      // Cycle through next items in order starting right after currentIndex
      for (let i = 1; i < list.length; i++) {
        const candidate = list[(currentIndex + i) % list.length];
        if (!isCurrentProduct(candidate) && !candidates.some((c) => String(c.id) === String(candidate.id))) {
          candidates.push(candidate);
        }
      }
    } else {
      for (const item of list) {
        if (!isCurrentProduct(item) && !candidates.some((c) => String(c.id) === String(item.id))) {
          candidates.push(item);
        }
      }
    }

    return candidates.slice(0, 2);
  })();

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
                {product.website_link === "contact" ? (
                  <Link
                    to="/contact"
                    className="btn btn--mint details-summary__button"
                  >
                    Order Apparels
                  </Link>
                ) : (
                  <a
                    href={product.website_link || "https://castbull.co.in/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--mint details-summary__button"
                  >
                    Order Apparels
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
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
                    to={`/products/${encodeURIComponent(item.id)}`}
                    key={item.id}
                    aria-label={`View details for ${item.name}`}
                  >
                    <div className="details-related-card__image">
                      <img
                        src={(item.images && item.images[0]) || item.image || PRODUCT_CATALOG[0].images[0]}
                        alt={item.name}
                        onError={(e) => {
                          const fallback =
                            PRODUCT_CATALOG.find((c) => c.id === item.id)?.images?.[0] ||
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
        )}

        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

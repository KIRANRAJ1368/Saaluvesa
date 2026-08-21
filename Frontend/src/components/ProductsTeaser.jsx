import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ProductsTeaser.css";
import useScrollAnimation from "../hooks/useScrollAnimation";
import { PRODUCT_CATALOG } from "../data/products";
import { api, assetUrl } from "../lib/api";

/* ------------------------------------------------------------------ */
/* Image Slider                                                        */
/* ------------------------------------------------------------------ */

/**
 * Shows a slideshow within a product card's image area.
 * When the product has 1–3 images: static display (no slider UI).
 * When the product has >3 images: left/right arrows appear on hover.
 */
function ProductImageSlider({ images, productName, productId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const showArrows = images.length > 3;

  const prev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const next = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  const staticMatch = PRODUCT_CATALOG.find(
    (item) => item.id === productId || item.name === productName,
  );
  const fallback = staticMatch?.images[0] || PRODUCT_CATALOG[0].images[0];

  return (
    <div
      className="product-card__slider"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={images[currentIndex]}
        alt={productName}
        className="product-card__image"
        onError={(e) => {
          if (e.currentTarget.src !== fallback) {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallback;
          }
        }}
      />

      {/* Dot indicators — always visible when >1 image */}
      {images.length > 1 && (
        <div className="product-card__slider-dots">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`product-card__slider-dot${idx === currentIndex ? " is-active" : ""}`}
              aria-label={`Go to image ${idx + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
            />
          ))}
        </div>
      )}

      {/* Arrow buttons — only when >3 images, visible on hover */}
      {showArrows && (
        <>
          <button
            type="button"
            className={`product-card__slider-arrow product-card__slider-arrow--left${isHovered ? " is-visible" : ""}`}
            aria-label="Previous image"
            onClick={prev}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`product-card__slider-arrow product-card__slider-arrow--right${isHovered ? " is-visible" : ""}`}
            aria-label="Next image"
            onClick={next}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 18l6-6-6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product Card (shared)                                               */
/* ------------------------------------------------------------------ */

function ProductCard({ p, i }) {
  return (
    <article
      className={`product-card delay-${i + 1}`}
      data-animate="card"
    >
      <Link
        to={`/products/${encodeURIComponent(p.id)}`}
        className="product-card__image-container"
        aria-label={`View details for ${p.name}`}
      >
        <ProductImageSlider
          images={p.images.length ? p.images : [PRODUCT_CATALOG[0].images[0]]}
          productName={p.name}
          productId={p.id}
        />
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
  );
}

/* ------------------------------------------------------------------ */
/* Product Carousel (only when products.length > 3)                   */
/* ------------------------------------------------------------------ */

/**
 * Horizontal drag-and-click carousel with left/right arrow navigation.
 * Shows ~3 cards at a time on desktop, 2 on tablet, 1 (+peek) on mobile.
 * Arrows are disabled at the start/end of the list.
 *
 * Slide width is measured directly from the rendered viewport element
 * (clientWidth, minus its own padding) rather than derived from a
 * vw-based CSS formula. vw includes the page scrollbar and doesn't
 * necessarily match the real content width of `.wrap`, which is what
 * was causing the right-most card to be clipped at the edge of the
 * viewport. Measuring the real element removes that mismatch entirely.
 */
function ProductCarousel({ products }) {
  const viewportRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0); // slideWidth + gap, used for scroll math

  const recomputeLayout = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const trackEl = viewport.querySelector(".products-carousel__track");
    const viewportStyles = getComputedStyle(viewport);
    const paddingX =
      (parseFloat(viewportStyles.paddingLeft) || 0) +
      (parseFloat(viewportStyles.paddingRight) || 0);

    // Real available width for the track's children — not 100vw.
    const containerWidth = viewport.clientWidth - paddingX;
    if (containerWidth <= 0) return;

    const gap = trackEl ? parseFloat(getComputedStyle(trackEl).gap) || 0 : 0;

    let count = 3;
    if (window.innerWidth <= 600) {
      count = 1;
    } else if (window.innerWidth <= 960) {
      count = 2;
    }

    let width;
    if (count === 1) {
      // Mobile: show one full card with a small peek of the next one
      width = containerWidth * 0.88;
    } else {
      width = (containerWidth - gap * (count - 1)) / count;
    }

    setSlideWidth(width);
    setCardWidth(width + gap);
    setActiveIndex((idx) => Math.max(0, Math.min(idx, products.length - 1)));
  }, [products.length]);

  useEffect(() => {
    recomputeLayout();

    const handleResize = () => recomputeLayout();
    window.addEventListener("resize", handleResize);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined" && viewportRef.current) {
      resizeObserver = new ResizeObserver(() => recomputeLayout());
      resizeObserver.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [recomputeLayout]);

  // Scroll by one card in either direction
  const scrollTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(index, products.length - 1));
      setActiveIndex(clamped);
      if (viewportRef.current && cardWidth > 0) {
        viewportRef.current.scrollTo({ left: clamped * cardWidth, behavior: "smooth" });
      }
    },
    [cardWidth, products.length],
  );

  // Sync activeIndex when the user drags/scrolls manually
  const onScroll = useCallback(() => {
    if (!viewportRef.current || cardWidth === 0) return;
    const scrollLeft = viewportRef.current.scrollLeft;
    const nearestIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(nearestIndex, products.length - 1)));
  }, [cardWidth, products.length]);

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < products.length - 1;

  return (
    <div className="products-carousel">
      {/* Left arrow */}
      <button
        type="button"
        className={`products-carousel__arrow products-carousel__arrow--left${canPrev ? "" : " is-disabled"}`}
        aria-label="Previous product"
        onClick={() => scrollTo(activeIndex - 1)}
        disabled={!canPrev}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Scrollable track */}
      <div
        className="products-carousel__viewport"
        ref={viewportRef}
        onScroll={onScroll}
      >
        <div className="products-carousel__track">
          {products.map((p, i) => (
            <div
              className="products-carousel__slide"
              key={p.id}
              style={slideWidth ? { width: `${slideWidth}px` } : undefined}
            >
              <ProductCard p={p} i={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <button
        type="button"
        className={`products-carousel__arrow products-carousel__arrow--right${canNext ? "" : " is-disabled"}`}
        aria-label="Next product"
        onClick={() => scrollTo(activeIndex + 1)}
        disabled={!canNext}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="products-carousel__dots" role="tablist" aria-label="Product slides">
        {products.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            aria-label={`Go to product ${idx + 1}`}
            className={`products-carousel__dot${idx === activeIndex ? " is-active" : ""}`}
            onClick={() => scrollTo(idx)}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Products Teaser Section                                             */
/* ------------------------------------------------------------------ */

/**
 * Three-state behaviour:
 *  null  → still loading (render nothing — avoids flash)
 *  []    → API returned an empty list → hide the section entirely
 *  [...] → show the product grid (with optional slider per card)
 *
 * Static FALLBACK is only used when the API call *errors* (server offline).
 */

export default function ProductsTeaser() {
  // null = loading, [] = no products, [...] = loaded
  const [products, setProducts] = useState(null);
  const animRef = useScrollAnimation(0.12, "0px 0px -8% 0px", products);

  useEffect(() => {
    let isMounted = true;
    api("/products")
      .then((rows) => {
        if (!isMounted) return;
        if (!Array.isArray(rows)) {
          // Unexpected shape — fall back to static catalog
          setProducts(
            PRODUCT_CATALOG.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              description: p.shortDescription,
              images: p.images,
            })),
          );
          return;
        }
        setProducts(
          rows.map((product) => {
            const staticMatch = PRODUCT_CATALOG.find(
              (item) =>
                item.id === product.slug ||
                String(item.id) === String(product.id) ||
                item.name.toLowerCase() === product.name?.toLowerCase(),
            );
            // Prefer API images array; fall back to primary image; then static
            const apiImages = Array.isArray(product.images) && product.images.length
              ? product.images
              : product.image
              ? [assetUrl(product.image)].filter(Boolean)
              : staticMatch?.images || [];
            return {
              id: product.slug || product.id,
              name: product.name,
              category: staticMatch?.category || "Apparel Sector",
              description: product.description,
              images: apiImages.map((img) => assetUrl(img) || img).filter(Boolean),
            };
          }),
        );
      })
      .catch(() => {
        // API offline — show static fallback so the page still looks good
        if (isMounted) {
          setProducts(
            PRODUCT_CATALOG.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              description: p.shortDescription,
              images: p.images,
            })),
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Still fetching — render nothing to avoid flash of wrong content
  if (products === null) return null;

  // API returned empty list — hide the section so the next section moves up
  if (products.length === 0) return null;

  return (
    <section id="products" className="products-teaser" ref={animRef}>
      <div className="wrap">
        <div className="products-teaser__head" data-animate="fade-up">
          <div>
            <div className="eyebrow products-teaser__eyebrow">Our Products</div>
            <h2>Apparel &amp; Beyond — Built for Global Export.</h2>
          </div>
        </div>

        {products.length > 3 ? (
          <ProductCarousel products={products} />
        ) : (
          <div className="products-teaser__grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} p={p} i={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
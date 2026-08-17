import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./ProductDetails.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactSection from "../components/ContactSection";
import { PRODUCT_CATALOG } from "../data/products";
import { api, assetUrl } from "../lib/api";

function ArrowIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h8M8.5 4l4 4-4 4" /></svg>;
}

export default function ProductDetails() {
  const { id } = useParams();
  const productId = decodeURIComponent(id || "");
  const catalogProduct = PRODUCT_CATALOG.find((item) => item.id === productId);
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
        // Static catalogue entries can still render from their bundled data
        // if the API is unavailable. A genuine missing dynamic product stays
        // on the not-found state below.
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

  const product = (() => {
    if (notFound) return null;
    if (catalogProduct && apiProduct) {
      const image = assetUrl(apiProduct.image);
      return {
        ...catalogProduct,
        name: apiProduct.name || catalogProduct.name,
        shortDescription: apiProduct.description || catalogProduct.shortDescription,
        description: apiProduct.description || catalogProduct.description,
        images: [
          image || catalogProduct.images[0],
          ...catalogProduct.images.slice(1),
        ],
        website_link: apiProduct.website_link || "https://castbull.co.in/",
      };
    }
    if (catalogProduct) return catalogProduct;
    if (apiProduct) {
      return {
        id: apiProduct.id,
        name: apiProduct.name,
        category: "Catalogue",
        shortDescription: apiProduct.description,
        description: apiProduct.description,
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
        <main className="details-not-found"><p className="eyebrow">Product Catalogue</p><h1>Loading product details…</h1></main>
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
          <p className="details-not-found__hint">Something went wrong while fetching the product details. Please try again.</p>
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

  return (
    <div className="product-details-page">
      <Header />
      <main>
        <nav className="details-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span>/</span><Link to="/products">Products</Link><span>/</span>
          <strong>{product.name}</strong>
        </nav>

        <section className="details-hero">
          <div className="wrap details-hero__grid">
            <div className="details-gallery">
              <div className="details-gallery__main">
                <img src={product.images[0]} alt={product.name} />
              </div>
            </div>

            <div className="details-summary">
              <h1>{product.name}</h1>
              <p className="details-summary__description">{product.shortDescription}</p>
              <a className="btn btn--mint details-summary__button" href={product.website_link} target="_blank" rel="noopener noreferrer">Order Apparels</a>
            </div>
          </div>
        </section>

        <section className="details-related">
          <div className="wrap">
            <div className="details-section-head">
              <p className="eyebrow">Explore More</p><h2>Related products.</h2>
            </div>
            <div className="details-related__grid">
              {related.map((item) => (
                <Link className="details-related-card" to={`/products/${item.id}`} key={item.id} aria-label={`View details for ${item.name}`}>
                  <div className="details-related-card__image"><img src={item.images[0]} alt={item.name} /></div>
                  <div className="details-related-card__body"><p>{item.category}</p><h3>{item.name}</h3><span>View details <ArrowIcon /></span></div>
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

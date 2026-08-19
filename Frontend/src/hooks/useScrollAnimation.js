import { useEffect, useRef } from "react";

/**
 * Attach an IntersectionObserver to a container element.
 * Any child with `data-animate` will get the `is-visible` class
 * when it enters the viewport, triggering CSS keyframe animations.
 * Also uses MutationObserver so dynamically loaded/replaced items
 * are automatically observed and never remain hidden.
 */
export default function useScrollAnimation(
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  contentVersion,
) {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      const all = container.querySelectorAll("[data-animate]");
      all.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin },
    );

    const observeTargets = () => {
      const targets = container.querySelectorAll(
        "[data-animate]:not(.is-visible)",
      );
      targets.forEach((el) => observer.observe(el));
    };

    observeTargets();

    // Observe dynamic children addition or replacement
    let mutationObserver = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        observeTargets();
      });
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [threshold, rootMargin, contentVersion]);

  return ref;
}

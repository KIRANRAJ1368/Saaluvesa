import { useEffect, useRef } from "react";

/**
 * Attach an IntersectionObserver to a container element.
 * Any child with `data-animate` will get the `is-visible` class
 * when it enters the viewport, triggering CSS keyframe animations.
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

    const targets = container.querySelectorAll("[data-animate]");
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // animate once
          }
        });
      },
      { threshold, rootMargin }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  // Dynamic lists can add elements after the initial observer is installed.
  // Re-register them when the caller's content version changes so they do not
  // remain hidden by the pre-animation opacity rule.
  }, [threshold, rootMargin, contentVersion]);

  return ref;
}

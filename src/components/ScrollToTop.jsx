import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global Route Scroll Restoration Component
 *
 * Ensures that whenever navigation changes to a different FixMyFile route:
 * 1. Scroll position resets to top (0, 0) instantly.
 * 2. Does not use smooth scrolling for route resets.
 * 3. Preserves legitimate in-page hash anchor navigation (e.g. #tools-phase3).
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If a hash anchor is specified, scroll that anchor into view
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView();
        return;
      }
    }

    // Temporarily bypass any CSS smooth scrolling to guarantee instant reset
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    } catch {
      window.scrollTo(0, 0);
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    document.documentElement.style.scrollBehavior = prevScrollBehavior;
  }, [pathname, hash]);

  return null;
}

import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SEO, { updateDocumentSEO } from './SEO';
import Header from './Header';
import Footer from './Footer';
import LoadingFallback from './LoadingFallback';
import ErrorBoundary from './ErrorBoundary';

function RouteContent() {
  const location = useLocation();

  useEffect(() => {
    // Re-enforce authoritative central SEO after child chunk mounts
    updateDocumentSEO(location.pathname);
  });

  return <Outlet />;
}

export default function Layout() {
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <SEO />
      <Header />
      <main className="main-content" id="main-content" tabIndex="-1">
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <RouteContent />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

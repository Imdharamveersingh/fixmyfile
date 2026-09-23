import React from 'react';
import { Outlet } from 'react-router-dom';
import SEO from './SEO';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="app-layout">
      <SEO />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

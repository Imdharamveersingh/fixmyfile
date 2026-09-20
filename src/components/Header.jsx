import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="brand-logo" aria-label="FixMyFile Home">
          <img
            src="/logo.png"
            alt="FixMyFile Logo"
            className="brand-logo-img"
            width="32"
            height="32"
          />
          <span className="brand-name">FixMyFile</span>
          <span className="brand-badge">Phase 3</span>
        </Link>

        <nav className="site-nav" aria-label="Main Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            All Tools
          </NavLink>

          <div className="nav-dropdown">
            <span className="nav-dropdown-label">
              PDF Tools
              <svg className="dropdown-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
            <div className="nav-dropdown-menu">
              <Link to="/jpg-to-pdf">JPG to PDF</Link>
              <Link to="/pdf-to-word">PDF to Word</Link>
              <Link to="/pdf-to-jpg">PDF to JPG</Link>
              <Link to="/word-to-pdf">Word to PDF</Link>
              <Link to="/merge-pdf">Merge PDF</Link>
              <Link to="/compress-pdf">Compress PDF</Link>
              <Link to="/split-pdf">Split PDF</Link>
              <Link to="/pdf-to-excel">PDF to Excel</Link>
              <Link to="/pdf-to-powerpoint">PDF to PowerPoint</Link>
              <Link to="/rotate-pdf">Rotate PDF</Link>
              <Link to="/protect-pdf">Protect PDF</Link>
            </div>
          </div>

          <div className="nav-dropdown">
            <span className="nav-dropdown-label">
              Image Tools
              <svg className="dropdown-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
            <div className="nav-dropdown-menu">
              <Link to="/background-remover">Background Remover</Link>
              <Link to="/image-compressor">Image Compressor</Link>
              <Link to="/image-resizer">Image Resizer</Link>
              <Link to="/image-converter">Image Converter</Link>
              <Link to="/jpg-to-png">JPG to PNG</Link>
              <Link to="/png-to-jpg">PNG to JPG</Link>
            </div>
          </div>

          <div className="nav-dropdown">
            <span className="nav-dropdown-label">
              Generators
              <svg className="dropdown-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
            <div className="nav-dropdown-menu">
              <Link to="/qr-code-generator">QR Code Generator</Link>
              <Link to="/barcode-generator">Barcode Generator</Link>
              <Link to="/currency-converter">Currency Converter</Link>
              <Link to="/percentage-calculator">Percentage Calculator</Link>
              <Link to="/password-generator">Password Generator</Link>
              <Link to="/word-counter">Word Counter</Link>
              <Link to="/emi-calculator">EMI Calculator</Link>
            </div>
          </div>
        </nav>

        <div className="header-actions">
          <Link to="/#tools-phase3" className="header-cta-btn">
            Explore Tools
          </Link>
        </div>
      </div>
    </header>
  );
}

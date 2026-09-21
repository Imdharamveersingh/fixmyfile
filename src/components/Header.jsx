import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getToolByPath } from '../tools/toolsRegistry';

export default function Header() {
  const location = useLocation();
  const currentTool = getToolByPath(location.pathname);
  const brandBadgeText = currentTool?.phase || 'Phase 7 Complete';

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
          <span className="brand-badge">{brandBadgeText}</span>
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
              <Link to="/unlock-pdf">Unlock PDF</Link>
              <Link to="/pdf-to-text">PDF to Text</Link>
              <Link to="/extract-pdf-pages">Extract PDF Pages</Link>
              <Link to="/delete-pdf-pages">Delete PDF Pages</Link>
              <Link to="/reorder-pdf-pages">Reorder PDF Pages</Link>
              <Link to="/pdf-ocr">PDF OCR</Link>
              <Link to="/extract-text-from-pdf">Extract Text from PDF</Link>
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
              <Link to="/image-cropper">Image Cropper</Link>
              <Link to="/image-to-text">Image to Text</Link>
              <Link to="/jpg-to-text">JPG to Text</Link>
              <Link to="/png-to-text">PNG to Text</Link>
              <Link to="/screenshot-to-text">Screenshot to Text</Link>
              <Link to="/heic-to-jpg">HEIC to JPG</Link>
              <Link to="/webp-to-jpg">WebP to JPG</Link>
              <Link to="/jpg-to-webp">JPG to WebP</Link>
              <Link to="/webp-to-png">WebP to PNG</Link>
              <Link to="/image-rotate-flip">Image Rotate / Flip</Link>
              <Link to="/image-watermark">Image Watermark</Link>
              <Link to="/image-to-pdf">Image to PDF</Link>
              <Link to="/image-upscaler">Image Upscaler</Link>
              <Link to="/image-to-base64">Image to Base64</Link>
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
          <Link to="/#tools-phase1" className="header-cta-btn">
            Explore Tools
          </Link>
        </div>
      </div>
    </header>
  );
}

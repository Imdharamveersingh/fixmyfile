import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo2 from '../assets/logo 2.png';

export default function Header() {
  const location = useLocation();

  const [activeDropdown, setActiveDropdown] = useState(null);
  const headerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Close dropdown on route change
  useEffect(() => {
    setActiveDropdown(null);
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Close on Escape key and return focus to triggering button
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && activeDropdown) {
        const btnId = `nav-dropdown-btn-${activeDropdown}`;
        setActiveDropdown(null);
        setTimeout(() => {
          const btn = document.getElementById(btnId);
          if (btn) btn.focus();
        }, 0);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDropdown]);

  const handleMouseEnter = (menuName) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      setActiveDropdown(menuName);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      closeTimeoutRef.current = setTimeout(() => {
        setActiveDropdown(null);
      }, 150);
    }
  };

  const toggleDropdown = (menuName) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActiveDropdown((prev) => (prev === menuName ? null : menuName));
  };

  const handleDropdownKeyDown = (e, menuName) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      toggleDropdown(menuName);
    }
  };

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-container">
        <Link to="/" className="brand-logo" aria-label="FixMyFile Home">
          <img
            src={logo2}
            alt="FixMyFile"
            className="brand-logo-img"
            width="140"
            height="57"
          />
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

          {/* 1. PDF Tools Mega-Menu (18 Tools, 3 Columns) */}
          <div
            className={`nav-dropdown ${activeDropdown === 'pdf' ? 'is-open' : ''}`}
            onMouseEnter={() => handleMouseEnter('pdf')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              id="nav-dropdown-btn-pdf"
              className={`nav-dropdown-btn ${activeDropdown === 'pdf' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'pdf'}
              aria-haspopup="true"
              aria-controls="nav-dropdown-menu-pdf"
              onClick={() => toggleDropdown('pdf')}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'pdf')}
            >
              <span className="nav-dropdown-label">
                PDF Tools
                <svg
                  className="dropdown-caret"
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              id="nav-dropdown-menu-pdf"
              className={`nav-dropdown-menu mega-menu mega-menu-pdf ${activeDropdown === 'pdf' ? 'is-open' : ''}`}
              role="region"
              aria-labelledby="nav-dropdown-btn-pdf"
            >
              <div className="mega-menu-grid mega-menu-3col">
                {/* Column 1: PDF Conversion */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>PDF Conversion</span>
                    <span className="mega-menu-col-badge">6</span>
                  </div>
                  <Link to="/jpg-to-pdf">JPG to PDF</Link>
                  <Link to="/pdf-to-word">PDF to Word</Link>
                  <Link to="/pdf-to-jpg">PDF to JPG</Link>
                  <Link to="/word-to-pdf">Word to PDF</Link>
                  <Link to="/pdf-to-excel">PDF to Excel</Link>
                  <Link to="/pdf-to-powerpoint">PDF to PowerPoint</Link>
                </div>

                {/* Column 2: PDF Edit & Security */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Edit & Security</span>
                    <span className="mega-menu-col-badge">6</span>
                  </div>
                  <Link to="/merge-pdf">Merge PDF</Link>
                  <Link to="/compress-pdf">Compress PDF</Link>
                  <Link to="/split-pdf">Split PDF</Link>
                  <Link to="/rotate-pdf">Rotate PDF</Link>
                  <Link to="/protect-pdf">Protect PDF</Link>
                  <Link to="/unlock-pdf">Unlock PDF</Link>
                </div>

                {/* Column 3: Pages & Text OCR */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Pages & OCR</span>
                    <span className="mega-menu-col-badge">6</span>
                  </div>
                  <Link to="/extract-pdf-pages">Extract PDF Pages</Link>
                  <Link to="/delete-pdf-pages">Delete PDF Pages</Link>
                  <Link to="/reorder-pdf-pages">Reorder PDF Pages</Link>
                  <Link to="/pdf-to-text">PDF to Text</Link>
                  <Link to="/pdf-ocr">PDF OCR</Link>
                  <Link to="/extract-text-from-pdf">Extract Text from PDF</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Image Tools Mega-Menu (20 Tools, 3 Columns) */}
          <div
            className={`nav-dropdown ${activeDropdown === 'image' ? 'is-open' : ''}`}
            onMouseEnter={() => handleMouseEnter('image')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              id="nav-dropdown-btn-image"
              className={`nav-dropdown-btn ${activeDropdown === 'image' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'image'}
              aria-haspopup="true"
              aria-controls="nav-dropdown-menu-image"
              onClick={() => toggleDropdown('image')}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'image')}
            >
              <span className="nav-dropdown-label">
                Image Tools
                <svg
                  className="dropdown-caret"
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              id="nav-dropdown-menu-image"
              className={`nav-dropdown-menu mega-menu mega-menu-image ${activeDropdown === 'image' ? 'is-open' : ''}`}
              role="region"
              aria-labelledby="nav-dropdown-btn-image"
            >
              <div className="mega-menu-grid mega-menu-3col">
                {/* Column 1: Image Editing & Optimization */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Edit & Optimize</span>
                    <span className="mega-menu-col-badge">7</span>
                  </div>
                  <Link to="/image-compressor">Image Compressor</Link>
                  <Link to="/image-resizer">Image Resizer</Link>
                  <Link to="/image-cropper">Image Cropper</Link>
                  <Link to="/background-remover">Background Remover</Link>
                  <Link to="/image-rotate-flip">Image Rotate / Flip</Link>
                  <Link to="/image-watermark">Image Watermark</Link>
                  <Link to="/image-upscaler">Image Upscaler</Link>
                </div>

                {/* Column 2: Image Conversion */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Conversion</span>
                    <span className="mega-menu-col-badge">8</span>
                  </div>
                  <Link to="/image-converter">Image Converter</Link>
                  <Link to="/jpg-to-png">JPG to PNG</Link>
                  <Link to="/png-to-jpg">PNG to JPG</Link>
                  <Link to="/heic-to-jpg">HEIC to JPG</Link>
                  <Link to="/webp-to-jpg">WebP to JPG</Link>
                  <Link to="/jpg-to-webp">JPG to WebP</Link>
                  <Link to="/webp-to-png">WebP to PNG</Link>
                  <Link to="/image-to-pdf">Image to PDF</Link>
                </div>

                {/* Column 3: OCR & Utilities */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>OCR & Utilities</span>
                    <span className="mega-menu-col-badge">5</span>
                  </div>
                  <Link to="/image-to-text">Image to Text</Link>
                  <Link to="/jpg-to-text">JPG to Text</Link>
                  <Link to="/png-to-text">PNG to Text</Link>
                  <Link to="/screenshot-to-text">Screenshot to Text</Link>
                  <Link to="/image-to-base64">Image to Base64</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Media Tools Compact Dropdown (4 Tools, 2 Columns) */}
          <div
            className={`nav-dropdown ${activeDropdown === 'media' ? 'is-open' : ''}`}
            onMouseEnter={() => handleMouseEnter('media')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              id="nav-dropdown-btn-media"
              className={`nav-dropdown-btn ${activeDropdown === 'media' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'media'}
              aria-haspopup="true"
              aria-controls="nav-dropdown-menu-media"
              onClick={() => toggleDropdown('media')}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'media')}
            >
              <span className="nav-dropdown-label">
                Media Tools
                <svg
                  className="dropdown-caret"
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              id="nav-dropdown-menu-media"
              className={`nav-dropdown-menu mega-menu mega-menu-media ${activeDropdown === 'media' ? 'is-open' : ''}`}
              role="region"
              aria-labelledby="nav-dropdown-btn-media"
            >
              <div className="mega-menu-grid mega-menu-2col">
                {/* Column 1: Audio Extraction */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Audio</span>
                    <span className="mega-menu-col-badge">1</span>
                  </div>
                  <Link to="/mp4-to-mp3">MP4 to MP3</Link>
                </div>

                {/* Column 2: Video & Animation */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Video & Animation</span>
                    <span className="mega-menu-col-badge">3</span>
                  </div>
                  <Link to="/video-compressor">Video Compressor</Link>
                  <Link to="/video-to-gif">Video to GIF</Link>
                  <Link to="/gif-maker">GIF Maker</Link>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Generators & Calculators Dropdown (7 Tools, 2 Columns) */}
          <div
            className={`nav-dropdown ${activeDropdown === 'generators' ? 'is-open' : ''}`}
            onMouseEnter={() => handleMouseEnter('generators')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              id="nav-dropdown-btn-generators"
              className={`nav-dropdown-btn ${activeDropdown === 'generators' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'generators'}
              aria-haspopup="true"
              aria-controls="nav-dropdown-menu-generators"
              onClick={() => toggleDropdown('generators')}
              onKeyDown={(e) => handleDropdownKeyDown(e, 'generators')}
            >
              <span className="nav-dropdown-label">
                Generators
                <svg
                  className="dropdown-caret"
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            <div
              id="nav-dropdown-menu-generators"
              className={`nav-dropdown-menu mega-menu mega-menu-generators ${activeDropdown === 'generators' ? 'is-open' : ''}`}
              role="region"
              aria-labelledby="nav-dropdown-btn-generators"
            >
              <div className="mega-menu-grid mega-menu-2col">
                {/* Column 1: Code & Security */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Generators</span>
                    <span className="mega-menu-col-badge">3</span>
                  </div>
                  <Link to="/qr-code-generator">QR Code Generator</Link>
                  <Link to="/barcode-generator">Barcode Generator</Link>
                  <Link to="/password-generator">Password Generator</Link>
                </div>

                {/* Column 2: Calculators & Utilities */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Calculators & Text</span>
                    <span className="mega-menu-col-badge">4</span>
                  </div>
                  <Link to="/currency-converter">Currency Converter</Link>
                  <Link to="/percentage-calculator">Percentage Calculator</Link>
                  <Link to="/emi-calculator">EMI Calculator</Link>
                  <Link to="/word-counter">Word Counter</Link>
                </div>
              </div>
            </div>
          </div>

          <NavLink
            to="/blog"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Blog
          </NavLink>
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

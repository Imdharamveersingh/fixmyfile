import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import ToolIcon from './ToolIcon';

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
            src={logo}
            alt="FixMyFile"
            className="brand-logo-img"
            width="784"
            height="318"
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
                  <Link to="/jpg-to-pdf" className="mega-menu-link">
                    <ToolIcon icon="jpg-to-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">JPG to PDF</span>
                  </Link>
                  <Link to="/pdf-to-word" className="mega-menu-link">
                    <ToolIcon icon="pdf-to-word" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF to Word</span>
                  </Link>
                  <Link to="/pdf-to-jpg" className="mega-menu-link">
                    <ToolIcon icon="pdf-to-jpg" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF to JPG</span>
                  </Link>
                  <Link to="/word-to-pdf" className="mega-menu-link">
                    <ToolIcon icon="word-to-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Word to PDF</span>
                  </Link>
                  <Link to="/pdf-to-excel" className="mega-menu-link">
                    <ToolIcon icon="pdf-to-excel" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF to Excel</span>
                  </Link>
                  <Link to="/pdf-to-powerpoint" className="mega-menu-link">
                    <ToolIcon icon="pdf-to-powerpoint" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF to PowerPoint</span>
                  </Link>
                </div>

                {/* Column 2: PDF Edit & Security */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Edit & Security</span>
                    <span className="mega-menu-col-badge">6</span>
                  </div>
                  <Link to="/merge-pdf" className="mega-menu-link">
                    <ToolIcon icon="merge-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Merge PDF</span>
                  </Link>
                  <Link to="/compress-pdf" className="mega-menu-link">
                    <ToolIcon icon="compress-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Compress PDF</span>
                  </Link>
                  <Link to="/split-pdf" className="mega-menu-link">
                    <ToolIcon icon="split-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Split PDF</span>
                  </Link>
                  <Link to="/rotate-pdf" className="mega-menu-link">
                    <ToolIcon icon="rotate-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Rotate PDF</span>
                  </Link>
                  <Link to="/protect-pdf" className="mega-menu-link">
                    <ToolIcon icon="protect-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Protect PDF</span>
                  </Link>
                  <Link to="/unlock-pdf" className="mega-menu-link">
                    <ToolIcon icon="unlock-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Unlock PDF</span>
                  </Link>
                </div>

                {/* Column 3: Pages & Text OCR */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Pages & OCR</span>
                    <span className="mega-menu-col-badge">6</span>
                  </div>
                  <Link to="/extract-pdf-pages" className="mega-menu-link">
                    <ToolIcon icon="extract-pdf-pages" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Extract PDF Pages</span>
                  </Link>
                  <Link to="/delete-pdf-pages" className="mega-menu-link">
                    <ToolIcon icon="delete-pdf-pages" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Delete PDF Pages</span>
                  </Link>
                  <Link to="/reorder-pdf-pages" className="mega-menu-link">
                    <ToolIcon icon="reorder-pdf-pages" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Reorder PDF Pages</span>
                  </Link>
                  <Link to="/pdf-to-text" className="mega-menu-link">
                    <ToolIcon icon="pdf-to-text" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF to Text</span>
                  </Link>
                  <Link to="/pdf-ocr" className="mega-menu-link">
                    <ToolIcon icon="pdf-ocr" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PDF OCR</span>
                  </Link>
                  <Link to="/extract-text-from-pdf" className="mega-menu-link">
                    <ToolIcon icon="extract-text-from-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Extract Text from PDF</span>
                  </Link>
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
                  <Link to="/image-compressor" className="mega-menu-link">
                    <ToolIcon icon="image-compressor" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Compressor</span>
                  </Link>
                  <Link to="/image-resizer" className="mega-menu-link">
                    <ToolIcon icon="image-resizer" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Resizer</span>
                  </Link>
                  <Link to="/image-cropper" className="mega-menu-link">
                    <ToolIcon icon="image-cropper" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Cropper</span>
                  </Link>
                  <Link to="/background-remover" className="mega-menu-link">
                    <ToolIcon icon="background-remover" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Background Remover</span>
                  </Link>
                  <Link to="/image-rotate-flip" className="mega-menu-link">
                    <ToolIcon icon="image-rotate-flip" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Rotate / Flip</span>
                  </Link>
                  <Link to="/image-watermark" className="mega-menu-link">
                    <ToolIcon icon="image-watermark" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Watermark</span>
                  </Link>
                  <Link to="/image-upscaler" className="mega-menu-link">
                    <ToolIcon icon="image-upscaler" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Upscaler</span>
                  </Link>
                </div>

                {/* Column 2: Image Conversion */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Conversion</span>
                    <span className="mega-menu-col-badge">8</span>
                  </div>
                  <Link to="/image-converter" className="mega-menu-link">
                    <ToolIcon icon="image-converter" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image Converter</span>
                  </Link>
                  <Link to="/jpg-to-png" className="mega-menu-link">
                    <ToolIcon icon="jpg-to-png" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">JPG to PNG</span>
                  </Link>
                  <Link to="/png-to-jpg" className="mega-menu-link">
                    <ToolIcon icon="png-to-jpg" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PNG to JPG</span>
                  </Link>
                  <Link to="/heic-to-jpg" className="mega-menu-link">
                    <ToolIcon icon="heic-to-jpg" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">HEIC to JPG</span>
                  </Link>
                  <Link to="/webp-to-jpg" className="mega-menu-link">
                    <ToolIcon icon="webp-to-jpg" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">WebP to JPG</span>
                  </Link>
                  <Link to="/jpg-to-webp" className="mega-menu-link">
                    <ToolIcon icon="jpg-to-webp" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">JPG to WebP</span>
                  </Link>
                  <Link to="/webp-to-png" className="mega-menu-link">
                    <ToolIcon icon="webp-to-png" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">WebP to PNG</span>
                  </Link>
                  <Link to="/image-to-pdf" className="mega-menu-link">
                    <ToolIcon icon="image-to-pdf" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image to PDF</span>
                  </Link>
                </div>

                {/* Column 3: OCR & Utilities */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>OCR & Utilities</span>
                    <span className="mega-menu-col-badge">5</span>
                  </div>
                  <Link to="/image-to-text" className="mega-menu-link">
                    <ToolIcon icon="image-to-text" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image to Text</span>
                  </Link>
                  <Link to="/jpg-to-text" className="mega-menu-link">
                    <ToolIcon icon="jpg-to-text" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">JPG to Text</span>
                  </Link>
                  <Link to="/png-to-text" className="mega-menu-link">
                    <ToolIcon icon="png-to-text" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">PNG to Text</span>
                  </Link>
                  <Link to="/screenshot-to-text" className="mega-menu-link">
                    <ToolIcon icon="screenshot-to-text" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Screenshot to Text</span>
                  </Link>
                  <Link to="/image-to-base64" className="mega-menu-link">
                    <ToolIcon icon="image-to-base64" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Image to Base64</span>
                  </Link>
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
                  <Link to="/mp4-to-mp3" className="mega-menu-link">
                    <ToolIcon icon="mp4-to-mp3" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">MP4 to MP3</span>
                  </Link>
                </div>

                {/* Column 2: Video & Animation */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Video & Animation</span>
                    <span className="mega-menu-col-badge">3</span>
                  </div>
                  <Link to="/video-compressor" className="mega-menu-link">
                    <ToolIcon icon="video-compressor" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Video Compressor</span>
                  </Link>
                  <Link to="/video-to-gif" className="mega-menu-link">
                    <ToolIcon icon="video-to-gif" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Video to GIF</span>
                  </Link>
                  <Link to="/gif-maker" className="mega-menu-link">
                    <ToolIcon icon="gif-maker" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">GIF Maker</span>
                  </Link>
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
                  <Link to="/qr-code-generator" className="mega-menu-link">
                    <ToolIcon icon="qr-code-generator" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">QR Code Generator</span>
                  </Link>
                  <Link to="/barcode-generator" className="mega-menu-link">
                    <ToolIcon icon="barcode-generator" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Barcode Generator</span>
                  </Link>
                  <Link to="/password-generator" className="mega-menu-link">
                    <ToolIcon icon="password-generator" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Password Generator</span>
                  </Link>
                </div>

                {/* Column 2: Calculators & Utilities */}
                <div className="mega-menu-column">
                  <div className="mega-menu-col-header">
                    <span>Calculators & Text</span>
                    <span className="mega-menu-col-badge">4</span>
                  </div>
                  <Link to="/currency-converter" className="mega-menu-link">
                    <ToolIcon icon="currency-converter" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Currency Converter</span>
                  </Link>
                  <Link to="/percentage-calculator" className="mega-menu-link">
                    <ToolIcon icon="percentage-calculator" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Percentage Calculator</span>
                  </Link>
                  <Link to="/emi-calculator" className="mega-menu-link">
                    <ToolIcon icon="emi-calculator" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">EMI Calculator</span>
                  </Link>
                  <Link to="/word-counter" className="mega-menu-link">
                    <ToolIcon icon="word-counter" size={18} className="mega-menu-tool-icon" />
                    <span className="mega-menu-tool-name">Word Counter</span>
                  </Link>
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

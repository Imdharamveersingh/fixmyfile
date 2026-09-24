import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand Block */}
        <div className="footer-col brand-col">
          <Link to="/" className="footer-brand" aria-label="FixMyFile Home">
            <img
              src={logo}
              alt="FixMyFile"
              className="footer-logo-img brand-logo-img"
              width="784"
              height="318"
            />
          </Link>
          <p className="footer-desc">
            Fast, browser-based file utilities built with simplicity, privacy, and practical workflows in mind.
          </p>
          <div className="footer-trust-badge">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>100% Private & Browser-Based</span>
          </div>
        </div>

        {/* Tools Column */}
        <div className="footer-col">
          <h4 className="footer-heading">Tools</h4>
          <ul className="footer-links">
            <li><Link to="/compress-pdf">PDF Tools</Link></li>
            <li><Link to="/background-remover">Image Tools</Link></li>
            <li><Link to="/image-to-text">OCR & Text</Link></li>
            <li><Link to="/video-compressor">Media Tools</Link></li>
            <li><Link to="/qr-code-generator">Calculators & Generators</Link></li>
          </ul>
        </div>

        {/* Resources Column */}
        <div className="footer-col">
          <h4 className="footer-heading">Resources</h4>
          <ul className="footer-links">
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/why-fixmyfile">Why FixMyFile</Link></li>
          </ul>
        </div>

        {/* Company Column */}
        <div className="footer-col">
          <h4 className="footer-heading">Company</h4>
          <ul className="footer-links">
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        {/* Legal Column */}
        <div className="footer-col">
          <h4 className="footer-heading">Legal</h4>
          <ul className="footer-links">
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal / Copyright Row */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>&copy; {currentYear} FixMyFile. Built for simple, privacy-focused file utilities.</p>
          <div className="footer-bottom-links">
            <Link to="/">Home</Link>
            <span>•</span>
            <Link to="/why-fixmyfile">Why FixMyFile</Link>
            <span>•</span>
            <Link to="/privacy">Privacy</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

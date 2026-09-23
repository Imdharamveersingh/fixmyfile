import React from 'react';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div className="info-page contact-page">
      <header className="info-hero">
        <span className="info-tag">Get in Touch</span>
        <h1 className="info-title">Contact & Community Support</h1>
        <p className="info-lead">
          FixMyFile is an open, client-side digital utility platform.
          Whether you’ve encountered an issue, want to suggest a new tool, or have feedback on our architecture,
          we’re here to help.
        </p>
      </header>

      <div className="contact-grid">
        <div className="contact-card primary-contact-card">
          <div className="contact-card-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </div>
          <h2>GitHub Issues & Discussions</h2>
          <p>
            The fastest and most transparent way to report bugs, suggest file formats, or track platform enhancements
            is directly through our official GitHub repository.
          </p>
          <div className="contact-action-row">
            <a
              href="https://github.com/imdharamveersingh/fixmyfile/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="info-primary-btn"
            >
              Open a GitHub Issue &rarr;
            </a>
            <a
              href="https://github.com/imdharamveersingh/fixmyfile"
              target="_blank"
              rel="noopener noreferrer"
              className="info-secondary-btn"
            >
              View Repository
            </a>
          </div>
        </div>

        <div className="contact-card">
          <div className="contact-card-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h2>Frequently Asked Questions</h2>
          <p>
            Have a question about how our browser-based conversion works or where your files go?
            Our architecture guide explains how WebAssembly guarantees zero cloud retention.
          </p>
          <div className="contact-action-row">
            <Link to="/why-fixmyfile" className="info-secondary-btn">
              Read Why FixMyFile &rarr;
            </Link>
          </div>
        </div>

        <div className="contact-card">
          <div className="contact-card-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h2>Production Inquiries</h2>
          <p>
            For privacy inquiries, security responsible disclosure, or partnership questions,
            dedicated email support infrastructure is being established for production launch.
            In the interim, please open an issue on our GitHub repository.
          </p>
          <div className="contact-action-row">
            <Link to="/privacy" className="info-secondary-btn">
              Review Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

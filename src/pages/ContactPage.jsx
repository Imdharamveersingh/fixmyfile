import React, { useState, useRef, useEffect } from 'react';
import ToolIcon from '../components/ToolIcon';

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const contactEmail = 'garammasala365@gmail.com';

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(contactEmail);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = contactEmail;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Graceful fallback: still update visual feedback if execCommand was attempted
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="info-page contact-page">
      <header className="info-hero">
        <h1 className="info-title">Contact FixMyFile</h1>
        <p className="info-lead">
          Have a question, found an issue, or have a suggestion? Send us an email and we'll get back to you.
        </p>
      </header>

      <div className="contact-card-wrapper">
        <div className="contact-main-card">
          <div className="contact-mail-icon-wrap" aria-hidden="true">
            <ToolIcon icon="mail" size={26} />
          </div>

          <h2 className="contact-card-title">Contact Us</h2>
          <p className="contact-card-text">
            For questions, feedback, bug reports, suggestions, or partnership inquiries, reach us directly by email.
          </p>

          <div className="contact-email-box">
            <a
              href={`mailto:${contactEmail}`}
              className="contact-email-link"
              aria-label={`Send email to ${contactEmail}`}
            >
              {contactEmail}
            </a>
            <button
              type="button"
              className={`contact-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyEmail}
              aria-label={copied ? 'Email address copied' : 'Copy email address'}
            >
              <ToolIcon icon={copied ? 'check' : 'copy'} size={15} />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="sr-only" aria-live="polite">
            {copied ? 'Email address copied to clipboard' : ''}
          </div>

          <div className="contact-cta-wrap">
            <a
              href={`mailto:${contactEmail}`}
              className="btn-email-primary"
            >
              Email Us
            </a>
          </div>

          <div className="contact-topics-compact">
            <span className="contact-topics-heading">What you can reach us about:</span>
            <p className="contact-topics-inline">
              Bug reports · Tool feedback · Feature suggestions · File formats · General questions · Partnerships
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

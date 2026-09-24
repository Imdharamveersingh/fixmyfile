import React from 'react';
import ToolIcon from '../components/ToolIcon';

export default function ContactPage() {
  const contactTopics = [
    'Bug reports & technical issues',
    'Tool feedback & UX suggestions',
    'New file-format requests',
    'Feature suggestions & improvements',
    'General questions & inquiries',
    'Partnership & collaboration proposals'
  ];

  return (
    <div className="info-page contact-page">
      <header className="info-hero">
        <span className="info-badge">Get in Touch</span>
        <h1 className="info-title">Contact FixMyFile</h1>
        <p className="info-lead">
          Have a question, found an issue, or have a suggestion? Send us an email and we'll get back to you.
        </p>
      </header>

      <div className="contact-card-wrapper">
        <div className="contact-main-card">
          <div className="contact-mail-icon-wrap" aria-hidden="true">
            <ToolIcon icon="mail" size={32} />
          </div>

          <h2 className="contact-card-title">Contact Us</h2>
          <p className="contact-card-text">
            For questions, feedback, bug reports, suggestions, or partnership inquiries, reach us directly by email.
          </p>

          <div className="contact-email-box">
            <a
              href="mailto:garammasala365@gmail.com"
              className="contact-email-link"
              aria-label="Send email to garammasala365@gmail.com"
            >
              garammasala365@gmail.com
            </a>
          </div>

          <div className="contact-cta-wrap">
            <a
              href="mailto:garammasala365@gmail.com"
              className="btn-email-primary"
            >
              Email Us
            </a>
          </div>

          <div className="contact-topics-section">
            <h3 className="contact-topics-heading">What you can reach us about:</h3>
            <ul className="contact-topics-list">
              {contactTopics.map((topic, index) => (
                <li key={index} className="contact-topic-item">
                  <span className="topic-dot" aria-hidden="true" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

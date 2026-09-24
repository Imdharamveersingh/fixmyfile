import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPageSEO } from './src/config/seoConfig.js';

test('=== FIXMYFILE: CONTACT PAGE COMPACT POLISH (STEP 9.1B) TEST SUITE ===', async (t) => {
  const contactPageSrc = fs.readFileSync('src/pages/ContactPage.jsx', 'utf-8');
  const appCssSrc = fs.readFileSync('src/App.css', 'utf-8');

  // Requirement 1: "Get in Touch" eyebrow is removed
  await t.test('1. "Get in Touch" eyebrow is removed from ContactPage', () => {
    assert.ok(
      !contactPageSrc.includes('Get in Touch'),
      'ContactPage.jsx must not contain "Get in Touch" eyebrow'
    );
    assert.ok(
      !contactPageSrc.includes('info-badge'),
      'ContactPage.jsx must not contain .info-badge element'
    );
  });

  // Requirement 2: Contact heading remains
  await t.test('2. Contact heading remains ("Contact FixMyFile" H1 and "Contact Us" H2)', () => {
    assert.ok(
      contactPageSrc.includes('<h1 className="info-title">Contact FixMyFile</h1>'),
      'ContactPage.jsx must start directly with H1 "Contact FixMyFile"'
    );
    assert.ok(
      contactPageSrc.includes('<h2 className="contact-card-title">Contact Us</h2>'),
      'ContactPage.jsx must have H2 "Contact Us"'
    );
  });

  // Requirement 3: Email address exists
  await t.test('3. Email address garammasala365@gmail.com exists', () => {
    assert.ok(
      contactPageSrc.includes('garammasala365@gmail.com'),
      'ContactPage.jsx must display exact email garammasala365@gmail.com'
    );
  });

  // Requirement 4 & 5: Copy button exists with accessible name
  await t.test('4 & 5. Copy button exists with semantic <button> and accessible name', () => {
    assert.ok(
      contactPageSrc.includes('className={`contact-copy-btn'),
      'ContactPage.jsx must contain .contact-copy-btn'
    );
    assert.ok(
      contactPageSrc.includes('type="button"'),
      'Copy button must be a semantic <button type="button">'
    );
    assert.ok(
      contactPageSrc.includes("aria-label={copied ? 'Email address copied' : 'Copy email address'}"),
      'Copy button must have dynamic accessible name'
    );
    assert.ok(
      contactPageSrc.includes('aria-live="polite"'),
      'Copy button must have polite aria-live status message for screen readers'
    );
  });

  // Requirement 6: Copy action uses Clipboard API
  await t.test('6. Copy action uses Clipboard API (navigator.clipboard.writeText)', () => {
    assert.ok(
      contactPageSrc.includes('navigator.clipboard.writeText'),
      'handleCopyEmail must invoke navigator.clipboard.writeText'
    );
    assert.ok(
      contactPageSrc.includes('setCopied(true)'),
      'Must set copied state to true on copy'
    );
  });

  // Requirement 7: Copied feedback appears
  await t.test('7. Copied feedback appears in UI text', () => {
    assert.ok(
      contactPageSrc.includes("{copied ? 'Copied' : 'Copy'}"),
      'Copy button must display "Copied" when active and "Copy" otherwise'
    );
  });

  // Requirement 8: Email Us mailto link remains
  await t.test('8. Email Us mailto CTA exists and uses mailto:garammasala365@gmail.com', () => {
    assert.ok(
      contactPageSrc.includes('className="btn-email-primary"'),
      'ContactPage.jsx must contain .btn-email-primary CTA'
    );
    assert.ok(
      />\s*Email Us\s*<\/a>/.test(contactPageSrc),
      'CTA link text must be "Email Us"'
    );
    assert.ok(
      contactPageSrc.includes('mailto:${contactEmail}') || contactPageSrc.includes('mailto:garammasala365@gmail.com'),
      'CTA link href must be mailto:garammasala365@gmail.com'
    );
  });

  // Requirement 9: Email address mailto link remains
  await t.test('9. Email address mailto link remains separate and clickable', () => {
    assert.ok(
      contactPageSrc.includes('className="contact-email-link"'),
      'ContactPage.jsx must render clickable .contact-email-link'
    );
    // Button must NOT be nested inside anchor
    assert.ok(
      !/<a[^>]*contact-email-link[^>]*>(?:(?!<\/a>)[\s\S])*?<button/i.test(contactPageSrc),
      'Copy button must NOT be nested inside the email anchor'
    );
  });

  // Requirement 10: No fake contact form exists
  await t.test('10. No fake contact form, input, or textarea elements exist', () => {
    assert.ok(!contactPageSrc.includes('<form'), 'Must not contain <form> element');
    assert.ok(!contactPageSrc.includes('<input'), 'Must not contain <input> element');
    assert.ok(!contactPageSrc.includes('<textarea'), 'Must not contain <textarea> element');
    assert.ok(!contactPageSrc.includes('type="submit"'), 'Must not contain submit button');
  });

  // Requirement 11: No duplicate mailto CTA
  await t.test('11. Exactly one primary Email Us CTA button exists', () => {
    const primaryCtaMatches = contactPageSrc.match(/btn-email-primary/g);
    assert.strictEqual(primaryCtaMatches?.length, 1, 'Must have exactly one .btn-email-primary CTA');
  });

  // Requirement 12: CSS compaction and reduced spacing
  await t.test('12. CSS compaction: reduced top padding and compact card styling', () => {
    assert.ok(
      appCssSrc.includes('.contact-page {') && appCssSrc.includes('padding-top: 20px;'),
      'App.css must have reduced top padding of 20px for .contact-page'
    );
    assert.ok(
      appCssSrc.includes('.contact-copy-btn'),
      'App.css must include styling for .contact-copy-btn'
    );
    assert.ok(
      appCssSrc.includes('.contact-topics-compact'),
      'App.css must include compact topics styling'
    );
  });

  // SEO metadata check
  await t.test('13. SEO metadata remains preserved for /contact', () => {
    const seo = getPageSEO('/contact');
    assert.strictEqual(seo.title, 'Contact FixMyFile — Get in Touch');
    assert.strictEqual(
      seo.description,
      'Contact FixMyFile for questions, feedback, bug reports, suggestions, and partnership inquiries.'
    );
    assert.strictEqual(seo.canonical, 'https://fixmyfile.netlify.app/contact');
  });
});

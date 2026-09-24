import React from 'react';

/**
 * Reusable FixMyFile Brand Logo Component
 * Displays the canonical visual lockup (/logo.png + FixMyFile brand name).
 */
export default function Logo({ showBadge = false, badgeText = '', isFooter = false }) {
  return (
    <div className={`brand-logo-container ${isFooter ? 'is-footer' : ''}`}>
      <img
        src="/logo.png"
        alt="FixMyFile Logo"
        className={isFooter ? 'footer-logo-img brand-logo-img' : 'brand-logo-img'}
        width="32"
        height="32"
      />
      <span className={isFooter ? 'brand-title brand-name' : 'brand-name'}>FixMyFile</span>
      {showBadge && Boolean(badgeText) && (
        <span className="brand-badge">{badgeText}</span>
      )}
    </div>
  );
}

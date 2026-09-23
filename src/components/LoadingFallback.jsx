import React from 'react';

/**
 * Lightweight, design-system-matched loading fallback for asynchronously loaded tool routes.
 */
export default function LoadingFallback() {
  return (
    <div
      className="tool-loading-container"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '360px',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        className="tool-loading-spinner"
        aria-hidden="true"
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--border-subtle, #e2e8f0)',
          borderTopColor: 'var(--primary, #2563eb)',
          borderRadius: '50%',
          animation: 'fixmyfile-spin 0.8s linear infinite',
          marginBottom: '16px',
        }}
      />
      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--text-muted, #64748b)',
          margin: 0,
          fontWeight: 500,
        }}
      >
        Loading tool...
      </p>
      <style>{`
        @keyframes fixmyfile-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

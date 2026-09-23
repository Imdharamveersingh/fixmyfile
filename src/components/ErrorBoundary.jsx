import React, { Component } from 'react';

/**
 * Route-level Error Boundary to catch dynamic chunk loading failures gracefully.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught route error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="tool-error-container"
          role="alert"
          style={{
            maxWidth: '560px',
            margin: '48px auto',
            padding: '36px 28px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary, #0f172a)',
              marginBottom: '8px',
            }}
          >
            Unable to Load Tool
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary, #475569)',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            A network interruption or updated version prevented this tool from loading. Please refresh the page to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="btn-hero-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 22px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

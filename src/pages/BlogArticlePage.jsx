import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticleBySlug } from '../data/blogArticles';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="info-page article-not-found">
        <div className="info-hero">
          <span className="info-badge">Article Not Found</span>
          <h1 className="info-title">Looking for a Guide?</h1>
          <p className="info-lead">
            The article you requested could not be found or may have been relocated.
          </p>
          <div className="article-actions" style={{ marginTop: '1.5rem' }}>
            <Link to="/blog" className="btn btn-primary">
              ← Return to All Articles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-article-page info-page">
      {/* Breadcrumbs navigation */}
      <nav className="article-breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{article.title}</li>
        </ol>
      </nav>

      <header className="article-header">
        <div className="article-meta-top">
          <span className="blog-card-category">{article.category}</span>
          <span className="blog-card-readtime">{article.readTime}</span>
        </div>

        <h1 className="article-title">{article.title}</h1>

        <div className="article-byline">
          <span className="article-author">By {article.author}</span>
          <span className="meta-dot" aria-hidden="true">•</span>
          <time dateTime={article.publishDate} className="article-date">
            Published {article.publishDate}
          </time>
        </div>

        <p className="article-lead-excerpt">{article.excerpt}</p>
      </header>

      <div className="article-body">
        {article.sections.map((sec, idx) => (
          <section key={idx} className="article-section">
            <h2 className="article-heading">{sec.heading}</h2>
            <div className="article-content">
              {sec.content.split('\n').map((paragraph, pIdx) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
                return <p key={pIdx}>{trimmed}</p>;
              })}
            </div>
          </section>
        ))}
      </div>

      {article.relatedTools && article.relatedTools.length > 0 && (
        <section className="article-related-tools" aria-label="Related FixMyFile Tools">
          <h2 className="related-tools-title">Try Related Tools on FixMyFile</h2>
          <p className="related-tools-subtitle">
            All tools run 100% locally in your browser with zero file uploads.
          </p>
          <div className="related-tools-grid">
            {article.relatedTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="related-tool-card"
              >
                <div className="related-tool-info">
                  <span className="related-tool-name">{tool.name}</span>
                  <span className="related-tool-cta">Open Tool →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="article-footer-nav">
        <Link to="/blog" className="btn btn-secondary">
          ← Back to All Guides
        </Link>
        <Link to="/" className="btn btn-primary">
          Explore All 49 Tools
        </Link>
      </footer>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BLOG_ARTICLES, BLOG_CATEGORIES } from '../data/blogArticles';

export default function BlogListingPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    return BLOG_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === 'All' || article.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="blog-listing-page info-page">
      <header className="blog-hero">
        <span className="info-badge">Knowledge Base & Guides</span>
        <h1 className="info-title">FixMyFile Blog & Practical Guides</h1>
        <p className="info-lead">
          Technical insights, practical tutorials, and privacy deep-dives into modern, in-browser file manipulation.
        </p>

        <div className="blog-search-bar" role="search">
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <input
            id="blog-search"
            type="search"
            placeholder="Search guides, tools, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="blog-search-input"
          />
        </div>
      </header>

      <nav className="blog-category-nav" aria-label="Article categories">
        <div className="blog-category-pills" role="tablist">
          {BLOG_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </nav>

      <section className="blog-grid-section" aria-label="Articles list">
        {filteredArticles.length === 0 ? (
          <div className="no-articles-found">
            <p>No articles found matching your criteria.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="blog-grid">
            {filteredArticles.map((article) => (
              <article key={article.slug} className="blog-card">
                <div className="blog-card-header">
                  <span className="blog-card-category">{article.category}</span>
                  <span className="blog-card-readtime">{article.readTime}</span>
                </div>

                <h2 className="blog-card-title">
                  <Link to={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>

                <p className="blog-card-excerpt">{article.excerpt}</p>

                <div className="blog-card-footer">
                  <div className="blog-card-meta">
                    <time dateTime={article.publishDate}>{article.publishDate}</time>
                    <span className="meta-dot" aria-hidden="true">•</span>
                    <span>{article.author}</span>
                  </div>
                  <Link
                    to={`/blog/${article.slug}`}
                    className="blog-read-more"
                    aria-label={`Read guide: ${article.title}`}
                  >
                    Read Guide →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

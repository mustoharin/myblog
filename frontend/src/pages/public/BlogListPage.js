import React from 'react';
import { Link } from 'react-router-dom';
import BlogList from '../../components/public/BlogList';
import Header from '../../components/public/Header';

const BlogListPage = () => {
  return (
    <div className="blog-list-page">
      <Header />
      <main className="main-content">
        <section className="blog-posts">
          <h1>All Blog Posts</h1>
          <div className="filters">
            <select defaultValue="latest">
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
          <BlogList />
        </section>
        <aside className="sidebar">
          <div className="categories">
            <h3>Categories</h3>
            {/* Categories will be dynamically loaded */}
          </div>
          <div className="tags">
            <h3>Popular Tags</h3>
            {/* Tags will be dynamically loaded */}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default BlogListPage;
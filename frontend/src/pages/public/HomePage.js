import React from 'react';
import { Link } from 'react-router-dom';
import BlogList from '../../components/public/BlogList';
import Header from '../../components/public/Header';

const HomePage = () => {
  return (
    <div className="home-page">
      <Header />
      <main className="main-content">
        <section className="hero">
          <h1>Welcome to MyBlog</h1>
          <p>Discover interesting articles and share your thoughts</p>
        </section>
        <section className="featured-posts">
          <h2>Featured Posts</h2>
          <BlogList featured={true} />
        </section>
        <section className="latest-posts">
          <h2>Latest Posts</h2>
          <BlogList />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
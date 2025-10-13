import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the fetch API
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders MyBlog header', () => {
    render(<App />);
    const headerElement = screen.getByText(/MyBlog/i);
    expect(headerElement).toBeInTheDocument();
  });

  test('displays loading state initially', async () => {
    // Mock fetch to return an empty array
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
      ok: true,
    });

    render(<App />);
    
    // Should show loading initially
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  test('displays posts when loaded', async () => {
    // Mock fetch to return posts
    const mockPosts = [
      {
        _id: '1',
        title: 'Test Post',
        content: 'Test content',
        author: 'Test Author',
        date: new Date().toISOString(),
      },
    ];
    
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockPosts),
      ok: true,
    });

    render(<App />);
    
    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByText(/Test Post/i)).toBeInTheDocument();
    });
  });
});
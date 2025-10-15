const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const validateCaptcha = require('../middleware/validateCaptcha');
const { baseRateLimiter, commentRateLimiter } = require('../middleware/rateLimiter');
const { validateNoXss } = require('../utils/xssValidator');

// List all published posts with search and tag filtering
router.get('/posts', baseRateLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 10); // Max 10 posts per page
    const skip = (page - 1) * limit;
    const { search, tags } = req.query;

    // Build the query
    let query = { isPublished: true };

    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Add tag filtering if provided
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $all: tagArray };
    }

    // Execute query with pagination
    const posts = await Post.find(query)
      .select('title excerpt createdAt author tags')
      .populate('author', 'username')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    const hasMore = skip + posts.length < total;
    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: hasMore
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get list of all available tags
router.get('/tags', baseRateLimiter, async (req, res) => {
  try {
    // Aggregate to get unique tags and their counts
    const tags = await Post.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      { 
        $group: { 
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single post
router.get('/posts/:id', baseRateLimiter, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isPublished: true })
      .populate('author', 'username')
      .populate('comments.author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: err.message });
  }
});

// Add a comment to a post
router.post('/posts/:id/comments', [commentRateLimiter, validateCaptcha], async (req, res) => {
  try {
    const { content, name } = req.body;

    // Validate required fields
    if (!content || !name) {
      return res.status(400).json({ message: 'Content and name are required' });
    }

    // Validate content length
    if (content.length < 1 || content.length > 1000) {
      return res.status(400).json({ message: 'Comment must be between 1 and 1000 characters' });
    }

    // Validate name length and XSS
    if (name.length < 1 || name.length > 50) {
      return res.status(400).json({ message: 'Name must be between 1 and 50 characters' });
    }
    const nameError = validateNoXss(name);
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    const post = await Post.findOne({ _id: req.params.id, isPublished: true });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add the comment
    post.comments.push({
      content,
      authorName: name,
      createdAt: new Date()
    });

    const updatedPost = await post.save();
    res.status(201).json(updatedPost.comments[updatedPost.comments.length - 1]);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: err.message });
  }
});

// Track post view (increment view count)
router.post('/posts/:id/view', baseRateLimiter, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, isPublished: true },
      { $inc: { views: 1 } },
      { new: true, select: 'views' }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ views: post.views });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
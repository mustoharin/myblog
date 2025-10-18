const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Tag = require('../models/Tag');
const validateCaptcha = require('../middleware/validateCaptcha');
const { baseRateLimiter, commentRateLimiter } = require('../middleware/rateLimiter');
const { validateNoXss } = require('../utils/xssValidator');

// Helper function to enrich tags with metadata
async function enrichTags(tags) {
  if (!tags || tags.length === 0) return [];
  
  try {
    const tagMetadata = await Tag.find({ 
      name: { $in: tags }, 
      isActive: true, 
    }).select('name displayName color');
    
    return tags.map(tag => {
      const metadata = tagMetadata.find(t => t.name === tag);
      return {
        name: tag,
        displayName: metadata ? metadata.displayName : tag,
        color: metadata ? metadata.color : '#1976d2',
      };
    });
  } catch (error) {
    console.error('Error enriching tags:', error);
    // Fallback to simple tag format
    return tags.map(tag => ({
      name: tag,
      displayName: tag,
      color: '#1976d2',
    }));
  }
}

// List all published posts with search and tag filtering
router.get('/posts', baseRateLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 10); // Max 10 posts per page
    const skip = (page - 1) * limit;
    const { search, tags } = req.query;

    // Build the query
    const query = { isPublished: true };

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
      .populate('author', 'username fullName')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Enrich tags for all posts
    const enrichedPosts = await Promise.all(
      posts.map(async post => {
        const enrichedTags = await enrichTags(post.tags);
        return {
          ...post.toObject(),
          tags: enrichedTags,
        };
      }),
    );

    const total = await Post.countDocuments(query);

    const hasMore = skip + posts.length < total;
    res.json({
      posts: enrichedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get list of all available tags
router.get('/tags', baseRateLimiter, async (req, res) => {
  try {
    // First get tag counts from posts
    const tagCounts = await Post.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      { 
        $group: { 
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get tag metadata from Tag model
    const Tag = require('../models/Tag');
    const tagMetadata = await Tag.find({ isActive: true }).select('name displayName color');
    
    // Merge tag counts with metadata
    const enrichedTags = tagCounts.map(tagCount => {
      const metadata = tagMetadata.find(tag => tag.name === tagCount._id);
      return {
        _id: tagCount._id,
        name: tagCount._id,
        displayName: metadata ? metadata.displayName : tagCount._id,
        color: metadata ? metadata.color : '#1976d2',
        count: tagCount.count,
      };
    });

    res.json(enrichedTags);
  } catch (err) {
    console.error('Public tags error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get a single post
router.get('/posts/:id', baseRateLimiter, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isPublished: true })
      .populate('author', 'username fullName')
      .populate('comments.author', 'username fullName');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Enrich tags with metadata
    const enrichedTags = await enrichTags(post.tags);
    const enrichedPost = {
      ...post.toObject(),
      tags: enrichedTags,
    };

    res.json(enrichedPost);
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
      createdAt: new Date(),
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
      { new: true, select: 'views' },
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

// Track post share (increment share count)
router.post('/posts/:id/share', baseRateLimiter, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, isPublished: true },
      { $inc: { shares: 1 } },
      { new: true, select: 'shares' },
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ shares: post.shares });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
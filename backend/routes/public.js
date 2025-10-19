const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Tag = require('../models/Tag');
const validateCaptcha = require('../middleware/validateCaptcha');
const { baseRateLimiter, commentRateLimiter } = require('../middleware/rateLimiter');
const { validateNoXss, isXssSafe } = require('../utils/xssValidator');

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

    // Enrich tags and add comment counts for all posts
    const enrichedPosts = await Promise.all(
      posts.map(async post => {
        const enrichedTags = await enrichTags(post.tags);
        // Get comment count for this post (only approved comments)
        const commentCount = await Comment.countDocuments({
          post: post._id,
          status: 'approved'
        });
        return {
          ...post.toObject(),
          tags: enrichedTags,
          commentCount: commentCount
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
      .populate('author', 'username fullName');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get approved comments for this post
    const comments = await Comment.find({
      post: post._id,
      status: 'approved',
      parentComment: null
    })
    .populate('author.user', 'username fullName')
    .populate({
      path: 'replies',
      match: { status: 'approved' },
      populate: {
        path: 'author.user',
        select: 'username fullName'
      }
    })
    .sort({ createdAt: -1 });

    // Enrich tags with metadata
    const enrichedTags = await enrichTags(post.tags);
    const enrichedPost = {
      ...post.toObject(),
      tags: enrichedTags,
      comments: comments
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
    const { content, name, email, website } = req.body;

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
    
    // Validate email if provided
    if (email) {
      const emailError = validateNoXss(email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
    }
    
    // Validate content for XSS
    if (!isXssSafe(content)) {
      return res.status(400).json({ message: 'Comment contains invalid content' });
    }

    // Verify post exists and is published
    const post = await Post.findOne({ _id: req.params.id, isPublished: true });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment using the new Comment model
    const comment = new Comment({
      content: content.trim(),
      post: post._id,
      author: {
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : `anonymous_${Date.now()}@example.com`,
        website: website ? website.trim() : undefined
      },
      status: 'pending', // Public comments require moderation
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await comment.save();

    // Return the created comment
    res.status(201).json({
      _id: comment._id,
      content: comment.content,
      authorName: comment.author.name,
      createdAt: comment.createdAt,
      status: comment.status
    });
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
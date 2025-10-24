const express = require('express');
const router = express.Router();
const Media = require('../models/Media'); // Load Media before Post due to populate
const Post = require('../models/Post');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');
const { formatTags } = require('../utils/tagFormatter');
const { 
  addContentMediaTracking, 
  trackContentMediaChanges, 
  removeContentMediaTracking 
} = require('../utils/mediaExtractor');

// Get all posts
router.get('/', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const paginateResults = require('../utils/pagination');
    const { page, limit, sort = '-createdAt' } = req.query;

    const result = await paginateResults(Post, {}, {
      page,
      limit,
      sort,
      populate: { path: 'author', select: 'username' },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one post
router.get('/:id', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('featuredImage');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If post is not published, only author or superadmin can view
    if (!post.isPublished && 
        post.author._id.toString() !== req.user._id.toString() && 
        req.user.role.name !== 'superadmin' &&
        req.user.role.name !== 'admin') {
      return res.status(403).json({ message: 'Access denied to unpublished post' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a post
router.post('/', auth, checkRole(['create_post']), async (req, res) => {
  try {
    const { title, content, excerpt, tags, isPublished, featuredImage } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Validate featuredImage if provided
    if (featuredImage) {
      const Media = require('../models/Media');
      const media = await Media.findById(featuredImage);
      if (!media) {
        return res.status(404).json({ message: 'Featured image not found' });
      }
    }

    // Check publish privilege if trying to publish
    if (isPublished && req.user.role.name !== 'superadmin' && req.user.role.name !== 'admin') {
      const userRole = await require('../models/Role').findById(req.user.role).populate('privileges');
      const canPublish = userRole.privileges.some(p => p.code === 'publish_post');
      if (!canPublish) {
        return res.status(403).json({ message: 'Insufficient privileges to publish posts' });
      }
    }

    const formattedTags = formatTags(tags);
    
    const post = new Post({
      title,
      content,
      excerpt,
      tags: formattedTags,
      isPublished,
      featuredImage: featuredImage || null,
      author: req.user._id, // Use the authenticated user's ID
    });

    const newPost = await post.save();
    const savedPost = await Post.findById(newPost._id)
      .populate('author', 'username')
      .populate('featuredImage');
    
    // Track media usage if featured image is set
    if (featuredImage) {
      const Media = require('../models/Media');
      const media = await Media.findById(featuredImage);
      if (media) {
        await media.addUsage('Post', savedPost._id);
      }
    }
    
    // Track all media in post content
    try {
      await addContentMediaTracking(content, savedPost._id);
    } catch (mediaErr) {
      // Log but don't fail post creation if media tracking fails
      console.error('Error tracking content media:', mediaErr);
    }
    
    // Log activity
    await Activity.logActivity(
      'post_create',
      req.user,
      'post',
      savedPost._id,
      {
        title: savedPost.title,
        status: savedPost.isPublished ? 'published' : 'draft',
        tags: savedPost.tags,
      },
      req,
    );
    
    res.status(201).json(savedPost);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(error => error.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a post
router.put('/:id', auth, checkRole(['update_post']), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only author or superadmin can update
    if (post.author.toString() !== req.user._id.toString() && 
        req.user.role.name !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    const { title, content, excerpt, tags, isPublished, featuredImage } = req.body;
    
    // Validate featuredImage if provided
    if (featuredImage !== undefined && featuredImage !== null) {
      const Media = require('../models/Media');
      const media = await Media.findById(featuredImage);
      if (!media) {
        return res.status(404).json({ message: 'Featured image not found' });
      }
    }
    
    // Check publish privilege if trying to publish or changing publish status
    if (isPublished !== undefined && isPublished && req.user.role.name !== 'superadmin' && req.user.role.name !== 'admin') {
      const userRole = await require('../models/Role').findById(req.user.role).populate('privileges');
      const canPublish = userRole.privileges.some(p => p.code === 'publish_post');
      if (!canPublish) {
        return res.status(403).json({ message: 'Insufficient privileges to publish posts' });
      }
    }
    
    // Handle featured image change and update media usage tracking
    if (featuredImage !== undefined) {
      const Media = require('../models/Media');
      
      // Remove old usage if featured image is being changed
      if (post.featuredImage && post.featuredImage.toString() !== featuredImage) {
        const oldMedia = await Media.findById(post.featuredImage);
        if (oldMedia) {
          await oldMedia.removeUsage('Post', post._id);
        }
      }
      
      // Add new usage if featured image is set
      if (featuredImage) {
        const newMedia = await Media.findById(featuredImage);
        if (newMedia && (!post.featuredImage || post.featuredImage.toString() !== featuredImage)) {
          await newMedia.addUsage('Post', post._id);
        }
      }
      
      post.featuredImage = featuredImage;
    }
    
    // Track content media changes if content is being updated
    if (content !== undefined) {
      try {
        await trackContentMediaChanges(post.content, content, post._id);
      } catch (mediaErr) {
        // Log but don't fail post update if media tracking fails
        console.error('Error tracking content media changes:', mediaErr);
      }
    }
    
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (tags !== undefined) post.tags = formatTags(tags);
    if (isPublished !== undefined) post.isPublished = isPublished;

    await post.save();
    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username')
      .populate('featuredImage');
    
    // Log activity
    await Activity.logActivity(
      'post_update',
      req.user,
      'post',
      updatedPost._id,
      {
        title: updatedPost.title,
        status: updatedPost.isPublished ? 'published' : 'draft',
        tags: updatedPost.tags,
      },
      req,
    );
    
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a post
router.delete('/:id', auth, checkRole(['delete_post']), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only author or superadmin can delete
    if (post.author.toString() !== req.user._id.toString() && 
        req.user.role.name !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Remove media usage tracking if featured image exists
    if (post.featuredImage) {
      const Media = require('../models/Media');
      const media = await Media.findById(post.featuredImage);
      if (media) {
        await media.removeUsage('Post', post._id);
      }
    }
    
    // Remove all content media tracking
    try {
      await removeContentMediaTracking(post.content, post._id);
    } catch (mediaErr) {
      // Log but don't fail post deletion if media tracking removal fails
      console.error('Error removing content media tracking:', mediaErr);
    }
    
    // Log activity before deletion
    await Activity.logActivity(
      'post_delete',
      req.user,
      'post',
      post._id,
      {
        title: post.title,
        status: post.isPublished ? 'published' : 'draft',
      },
      req,
    );

    await post.softDelete();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment to a post
router.post('/:id/comments', auth, checkRole(['manage_comments']), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    post.comments.push({
      content,
      author: req.user._id,
    });

    await post.save();
    const commentedPost = await Post.findById(post._id)
      .populate('author', 'username')
      .populate('comments.author', 'username');
    
    // Log activity
    await Activity.logActivity(
      'comment_create',
      req.user,
      'comment',
      commentedPost.comments[commentedPost.comments.length - 1]._id,
      {
        postId: commentedPost._id,
        postTitle: commentedPost.title,
        commentText: content.substring(0, 100),
      },
      req,
    );
    
    res.status(201).json(commentedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
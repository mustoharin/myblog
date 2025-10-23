const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { canReplyToComments, canModerateComments, commentRateLimit } = require('../middleware/commentAuth');
const sanitizeInput = require('../middleware/sanitizeInput');
const validateCaptcha = require('../middleware/validateCaptcha');
const { isXssSafe } = require('../utils/xssValidator');

// Optional authentication middleware - sets req.user if token provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue as anonymous user
    return next();
  }
  
  // Token provided, use full auth middleware
  return auth(req, res, next);
};

// Conditional CAPTCHA validation - only for anonymous users
const conditionalCaptchaValidation = (req, res, next) => {
  // If user is authenticated, skip CAPTCHA validation
  if (req.user) {
    return next();
  }
  
  // For anonymous users, validate CAPTCHA
  return validateCaptcha(req, res, next);
};

// Get comments for a specific post
router.get('/post/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { status = 'approved', page = 1, limit = 20 } = req.query;
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // For non-authenticated users, only show approved comments
    let commentStatus = 'approved';
    if (req.user && req.user.role && 
        (req.user.role.name === 'admin' || req.user.role.name === 'superadmin')) {
      if (status === 'all') {
        // Admin requesting all comments - get them separately
        const allComments = await Comment.find({
          post: postId,
          parentComment: null
        })
        .populate('author.user', 'username fullName')
        .populate({
          path: 'replies',
          populate: {
            path: 'author.user',
            select: 'username fullName'
          }
        })
        .sort({ createdAt: -1 });
        
        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedComments = allComments.slice(startIndex, endIndex);
        
        return res.json({
          success: true,
          comments: paginatedComments,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(allComments.length / limit),
            totalComments: allComments.length,
            hasNext: endIndex < allComments.length,
            hasPrev: page > 1
          }
        });
      } else {
        commentStatus = status;
      }
    }
    
    const comments = await Comment.getCommentTree(postId, commentStatus);
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = comments.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      comments: paginatedComments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(comments.length / limit),
        totalComments: comments.length,
        hasNext: endIndex < comments.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
});

// Submit a new comment (for visitors and authenticated users)
router.post('/', commentRateLimit, optionalAuth, conditionalCaptchaValidation, sanitizeInput, async (req, res) => {
  try {
    const { content, postId, authorName, authorEmail, authorWebsite } = req.body;
    
    // Validate required fields
    if (!content || !postId) {
      return res.status(400).json({
        success: false,
        message: 'Content and post ID are required'
      });
    }
    
    // Validate content for XSS
    if (!isXssSafe(content)) {
      return res.status(400).json({
        success: false,
        message: 'Comment contains invalid content'
      });
    }
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Prepare comment data
    const commentData = {
      content: content.trim(),
      post: postId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    // Set author information
    if (req.user) {
      // Authenticated user
      commentData.author = {
        user: req.user._id
      };
      // Auto-approve comments from authenticated users
      commentData.status = 'approved';
    } else {
      // Anonymous visitor
      if (!authorName || !authorEmail) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required for anonymous comments'
        });
      }
      
      commentData.author = {
        name: authorName.trim(),
        email: authorEmail.trim().toLowerCase(),
        website: authorWebsite ? authorWebsite.trim() : undefined
      };
      // Anonymous comments need moderation
      commentData.status = 'pending';
    }
    
    const comment = new Comment(commentData);
    await comment.save();
    
    // Populate author information for response
    await comment.populate('author.user', 'username fullName');
    
    res.status(201).json({
      success: true,
      message: req.user ? 'Comment posted successfully' : 'Comment submitted for moderation',
      comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
});

// Reply to a comment (only for authenticated users with permission)
router.post('/reply/:commentId', auth, canReplyToComments, sanitizeInput, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }
    
    // Validate content for XSS
    if (!isXssSafe(content)) {
      return res.status(400).json({
        success: false,
        message: 'Reply contains invalid content'
      });
    }
    
    // Verify parent comment exists
    const parentComment = await Comment.findById(commentId).populate('post');
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }
    
    // Create reply
    const reply = new Comment({
      content: content.trim(),
      post: parentComment.post._id,
      parentComment: commentId,
      author: {
        user: req.user._id
      },
      status: 'approved', // Auto-approve replies from authorized users
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    await reply.save();
    await reply.populate('author.user', 'username fullName');
    
    res.status(201).json({
      success: true,
      message: 'Reply posted successfully',
      comment: reply
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating reply',
      error: error.message
    });
  }
});

// Get all comments for admin (with filtering and pagination)
router.get('/admin/all', auth, canModerateComments, async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { 'author.name': { $regex: search, $options: 'i' } },
        { 'author.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const comments = await Comment.find(query)
      .populate('author.user', 'username fullName')
      .populate('post', 'title slug')
      .populate('moderatedBy', 'username fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Comment.countDocuments(query);
    
    res.json({
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total,
        hasNext: skip + comments.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
});

// Moderate comment (approve/reject/mark as spam)
router.patch('/:id/status', auth, canModerateComments, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected', 'spam'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or spam'
      });
    }
    
    const comment = await Comment.findByIdAndUpdate(
      id,
      {
        status,
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      },
      { new: true }
    ).populate('author.user', 'username fullName')
     .populate('post', 'title slug');
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    res.json({
      success: true,
      message: `Comment ${status} successfully`,
      comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error moderating comment',
      error: error.message
    });
  }
});

// Delete comment (admin only)
router.delete('/:id', auth, canModerateComments, async (req, res) => {
  try {
    const { id } = req.params;
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Also delete all replies
    await Comment.deleteMany({ parentComment: id });
    await Comment.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
});

// Bulk action on comments (admin only)
router.patch('/admin/bulk-action', auth, canModerateComments, async (req, res) => {
  try {
    const { commentIds, action } = req.body;
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment IDs array is required'
      });
    }
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }
    
    let result = {};
    
    switch (action) {
      case 'approve':
        result = await Comment.updateMany(
          { _id: { $in: commentIds } },
          { 
            status: 'approved',
            moderatedBy: req.user._id,
            moderatedAt: new Date()
          }
        );
        result.updatedCount = result.modifiedCount;
        break;
        
      case 'reject':
        result = await Comment.updateMany(
          { _id: { $in: commentIds } },
          { 
            status: 'rejected',
            moderatedBy: req.user._id,
            moderatedAt: new Date()
          }
        );
        result.updatedCount = result.modifiedCount;
        break;
        
      case 'spam':
        result = await Comment.updateMany(
          { _id: { $in: commentIds } },
          { 
            status: 'spam',
            moderatedBy: req.user._id,
            moderatedAt: new Date()
          }
        );
        result.updatedCount = result.modifiedCount;
        break;
        
      case 'delete':
        // Also delete replies to these comments
        await Comment.deleteMany({ parentComment: { $in: commentIds } });
        result = await Comment.deleteMany({ _id: { $in: commentIds } });
        result.deletedCount = result.deletedCount;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be approve, reject, spam, or delete'
        });
    }
    
    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error performing bulk action',
      error: error.message
    });
  }
});

// Get comment statistics (admin only)
router.get('/admin/stats', auth, canModerateComments, async (req, res) => {
  try {
    const stats = await Comment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalComments = await Comment.countDocuments();
    const recentComments = await Comment.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const formattedStats = {
      total: totalComments,
      recent24h: recentComments,
      approved: 0,
      pending: 0,
      rejected: 0,
      spam: 0
    };
    
    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comment statistics',
      error: error.message
    });
  }
});

module.exports = router;
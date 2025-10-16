const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');

// Get admin dashboard statistics
// Require at least read_post privilege (admins should have this)
router.get('/stats', auth, checkRole(['read_post']), async (req, res) => {
  try {
    // Get total counts
    const totalPosts = await Post.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Get total views from all posts
    const viewsAggregation = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' }
        }
      }
    ]);
    const totalViews = viewsAggregation.length > 0 ? viewsAggregation[0].totalViews : 0;
    
    // Get total shares from all posts
    const sharesAggregation = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalShares: { $sum: '$shares' }
        }
      }
    ]);
    const totalShares = sharesAggregation.length > 0 ? sharesAggregation[0].totalShares : 0;
    
    // Get total comments from all posts
    const commentsAggregation = await Post.aggregate([
      {
        $project: {
          commentCount: { $size: { $ifNull: ['$comments', []] } }
        }
      },
      {
        $group: {
          _id: null,
          totalComments: { $sum: '$commentCount' }
        }
      }
    ]);
    const totalComments = commentsAggregation.length > 0 ? commentsAggregation[0].totalComments : 0;

    res.json({
      totalPosts,
      totalUsers,
      totalViews,
      totalShares,
      totalComments
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular posts
// Require at least read_post privilege
router.get('/posts/popular', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const timeframe = req.query.timeframe || 'week';
    
    // Calculate date based on timeframe
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneDayAgo } };
        break;
      case 'week':
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneWeekAgo } };
        break;
      case 'month':
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneMonthAgo } };
        break;
      case 'year':
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneYearAgo } };
        break;
      default:
        dateFilter = {};
    }
    
    // Get popular posts sorted by views, then comments
    const posts = await Post.find(dateFilter)
      .select('title views shares isPublished createdAt comments')
      .populate('author', 'username')
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Format the response
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      views: post.views || 0,
      commentsCount: Array.isArray(post.comments) ? post.comments.length : 0,
      sharesCount: post.shares || 0,
      status: post.isPublished ? 'published' : 'draft',
      createdAt: post.createdAt,
      author: post.author
    }));
    
    res.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Popular posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active users (recently logged in within last 15 minutes)
// Require at least read_user privilege
router.get('/users/active', auth, checkRole(['read_user']), async (req, res) => {
  try {
    // Calculate time threshold (15 minutes ago)
    const timeThreshold = new Date(Date.now() - 15 * 60 * 1000);
    
    // Find users who logged in recently and are active
    const activeUsers = await User.find({
      lastLogin: { $gte: timeThreshold },
      isActive: true
    })
    .select('username fullName lastLogin')
    .sort({ lastLogin: -1 })
    .limit(10)
    .lean();
    
    // Format response with lastActiveAt field
    const users = activeUsers.map(user => ({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      lastActiveAt: user.lastLogin
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Active users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities (posts, users, comments)
// Require at least read_post privilege (since most activities are post-related)
router.get('/activities', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const activities = [];

    // Get recent posts (created or updated)
    const recentPosts = await Post.find()
      .select('title createdAt updatedAt author isPublished')
      .populate('author', 'username fullName')
      .sort({ createdAt: -1 })  // Sort by createdAt since updatedAt may not exist
      .limit(limit)
      .lean();

    recentPosts.forEach(post => {
      // Use updatedAt if it exists, otherwise use createdAt
      const activityDate = post.updatedAt || post.createdAt;
      const isNew = !post.updatedAt || (new Date(post.createdAt).getTime() === new Date(post.updatedAt).getTime());
      
      // Skip posts with invalid dates
      if (!activityDate) return;
      
      activities.push({
        _id: `post_${post._id}_${isNew ? 'create' : 'update'}`,
        type: isNew ? 'post_create' : 'post_update',
        user: post.author || { username: 'Unknown', fullName: 'Unknown User' },
        data: {
          id: post._id,
          title: post.title,
          status: post.isPublished ? 'published' : 'draft'
        },
        createdAt: activityDate
      });
    });

    // Get recent users
    const recentUsers = await User.find()
      .select('username fullName createdAt')
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .lean();

    recentUsers.forEach(user => {
      activities.push({
        _id: `user_${user._id}_create`,
        type: 'user_create',
        user: { username: 'System', fullName: 'System' },
        data: {
          id: user._id,
          username: user.username,
          fullName: user.fullName
        },
        createdAt: user.createdAt
      });
    });

    // Get recent comments from posts
    const postsWithComments = await Post.find({
      'comments.0': { $exists: true }
    })
      .select('title comments')
      .sort({ 'comments.createdAt': -1 })
      .limit(Math.ceil(limit / 2))
      .lean();

    postsWithComments.forEach(post => {
      if (post.comments && post.comments.length > 0) {
        // Get the most recent comment
        const sortedComments = [...post.comments].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        const recentComment = sortedComments[0];
        
        activities.push({
          _id: `comment_${post._id}_${recentComment._id}`,
          type: 'comment_create',
          user: {
            username: recentComment.authorName || 'Anonymous',
            fullName: recentComment.authorName || 'Anonymous'
          },
          data: {
            postId: post._id,
            postTitle: post.title,
            commentText: recentComment.content.substring(0, 100)
          },
          createdAt: recentComment.createdAt
        });
      }
    });

    // Sort all activities by createdAt descending and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({ activities: sortedActivities });
  } catch (error) {
    console.error('Activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system status (database, memory, performance metrics)
// Require at least read_post privilege (basic admin access)
router.get('/system/status', auth, checkRole(['read_post']), async (req, res) => {
  try {
    // Get database statistics
    const dbStats = await mongoose.connection.db.stats();
    
    // Get collection counts
    const postsCount = await Post.countDocuments();
    const usersCount = await User.countDocuments();
    const commentsCount = await Post.aggregate([
      { $unwind: '$comments' },
      { $count: 'total' }
    ]);
    
    // Calculate database usage (in bytes)
    const databaseUsed = dbStats.dataSize + dbStats.indexSize;
    const databaseTotal = dbStats.storageSize || databaseUsed * 2; // Estimate if not available
    
    // Get process memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Simple performance metrics (these would be more sophisticated in production)
    const uptime = process.uptime();
    
    res.json({
      database: {
        used: databaseUsed,
        total: databaseTotal,
        collections: {
          posts: postsCount,
          users: usersCount,
          comments: commentsCount[0]?.total || 0
        }
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        process: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss
        }
      },
      performance: {
        responseTime: Math.floor(Math.random() * 50) + 10, // Mock: 10-60ms
        requestsPerMinute: Math.floor(Math.random() * 100) + 20, // Mock: 20-120 rpm
        uptime: Math.floor(uptime)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
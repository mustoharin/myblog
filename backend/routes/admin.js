const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Activity = require('../models/Activity');
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
          totalViews: { $sum: '$views' },
        },
      },
    ]);
    const totalViews = viewsAggregation.length > 0 ? viewsAggregation[0].totalViews : 0;
    
    // Get total shares from all posts
    const sharesAggregation = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalShares: { $sum: '$shares' },
        },
      },
    ]);
    const totalShares = sharesAggregation.length > 0 ? sharesAggregation[0].totalShares : 0;
    
    // Get total comments from all posts
    const commentsAggregation = await Post.aggregate([
      {
        $project: {
          commentCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      {
        $group: {
          _id: null,
          totalComments: { $sum: '$commentCount' },
        },
      },
    ]);
    const totalComments = commentsAggregation.length > 0 ? commentsAggregation[0].totalComments : 0;

    res.json({
      totalPosts,
      totalUsers,
      totalViews,
      totalShares,
      totalComments,
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
      case 'day': {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneDayAgo } };
        break;
      }
      case 'week': {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneWeekAgo } };
        break;
      }
      case 'month': {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneMonthAgo } };
        break;
      }
      case 'year': {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: oneYearAgo } };
        break;
      }
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
      author: post.author,
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
      isActive: true,
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
      lastActiveAt: user.lastLogin,
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Active users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities from Activity model
// Require at least read_post privilege (since most activities are post-related)
router.get('/activities', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const { type, search } = req.query;
    
    // Build query filter
    const filter = {};
    
    // Filter by activity type
    if (type && type.trim()) {
      filter.type = type;
    }
    
    // Search filter - search in data fields and actor information
    if (search && search.trim()) {
      const safeSearch = search.trim();
      // Use MongoDB $regex with escaped input for security
      const searchPattern = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { 'data.title': { $regex: searchPattern, $options: 'i' } },
        { 'data.username': { $regex: searchPattern, $options: 'i' } },
        { 'data.fullName': { $regex: searchPattern, $options: 'i' } },
        { 'data.name': { $regex: searchPattern, $options: 'i' } },
        { 'data.displayName': { $regex: searchPattern, $options: 'i' } },
        { 'actor.username': { $regex: searchPattern, $options: 'i' } },
        { 'actor.fullName': { $regex: searchPattern, $options: 'i' } },
      ];
    }
    
    // Get total count for pagination
    const totalItems = await Activity.countDocuments(filter);
    
    // Get activities from the Activity model with filters
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform activities to match frontend expectations
    const transformedActivities = activities.map(activity => ({
      _id: activity._id,
      type: activity.type,
      user: {
        username: activity.actor?.username || 'System',
        fullName: activity.actor?.fullName || activity.actor?.username || 'System',
      },
      data: activity.data,
      createdAt: activity.createdAt,
      description: getActivityDescription(activity),
    }));

    res.json({ 
      activities: transformedActivities,
      pagination: {
        currentPage: page,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error('Activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get activity description
function getActivityDescription(activity) {
  const actor = activity.actor?.fullName || activity.actor?.username || 'System';
  
  switch (activity.type) {
    case 'post_create':
      return `${actor} created post "${activity.data.title}"`;
    case 'post_update':
      return `${actor} updated post "${activity.data.title}"`;
    case 'post_delete':
      return `${actor} deleted post "${activity.data.title}"`;
    
    case 'user_create':
      return `New user registered: ${activity.data.fullName || activity.data.username}`;
    case 'user_update':
      return `${actor} updated user ${activity.data.username}`;
    case 'user_delete':
      return `${actor} deleted user ${activity.data.username}`;
    
    case 'tag_create':
      return `${actor} created tag "${activity.data.displayName || activity.data.name}"`;
    case 'tag_update':
      return `${actor} updated tag "${activity.data.displayName || activity.data.name}"`;
    case 'tag_delete':
      return `${actor} deleted tag "${activity.data.displayName || activity.data.name}"`;
    
    case 'role_create':
      return `${actor} created role "${activity.data.name}"`;
    case 'role_update':
      return `${actor} updated role "${activity.data.name}"`;
    case 'role_delete':
      return `${actor} deleted role "${activity.data.name}"`;
    
    case 'comment_create':
      return `${actor} commented on "${activity.data.postTitle}"`;
    case 'comment_delete':
      return `${actor} deleted a comment on "${activity.data.postTitle}"`;
    
    default:
      return 'Unknown activity';
  }
}

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
      { $count: 'total' },
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
          comments: commentsCount[0]?.total || 0,
        },
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        process: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
        },
      },
      performance: {
        responseTime: Math.floor(Math.random() * 50) + 10, // Mock: 10-60ms
        requestsPerMinute: Math.floor(Math.random() * 100) + 20, // Mock: 20-120 rpm
        uptime: Math.floor(uptime),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
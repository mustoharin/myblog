const express = require('express');
const router = express.Router();
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
      .select('title views isPublished createdAt comments')
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
      sharesCount: 0, // TODO: implement shares tracking if needed
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

module.exports = router;

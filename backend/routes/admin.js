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

module.exports = router;

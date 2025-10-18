const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const Post = require('../models/Post');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');

// Get all tags with pagination
router.get('/', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const paginateResults = require('../utils/pagination');
    const { page, limit, sort = '-createdAt', search } = req.query;

    // Build query for search
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const result = await paginateResults(Tag, query, {
      page,
      limit,
      sort,
    });

    // Calculate real-time post counts for each tag
    const tagsWithCounts = await Promise.all(
      result.items.map(async tag => {
        const postCount = await Post.countDocuments({ 
          tags: tag.name, 
          isPublished: true, 
        });
        
        // Update the tag's post count if it's different
        if (tag.postCount !== postCount) {
          await Tag.updateOne(
            { _id: tag._id },
            { $set: { postCount } },
          );
        }
        
        return {
          ...tag.toObject(),
          postCount,
        };
      }),
    );

    res.json({
      ...result,
      items: tagsWithCounts,
    });
  } catch (err) {
    console.error('Get tags error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single tag by ID
router.get('/:id', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.json(tag);
  } catch (err) {
    console.error('Get tag error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create new tag
router.post('/', auth, checkRole(['create_post']), async (req, res) => {
  try {
    const { name, displayName, description, color, isActive } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ message: 'Name and display name are required' });
    }

    // Format the name (lowercase, no spaces, only alphanumeric and hyphens)
    const formattedName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (!formattedName) {
      return res.status(400).json({ message: 'Invalid tag name' });
    }

    // Check if tag with this name already exists
    const existingTag = await Tag.findOne({ name: formattedName });
    if (existingTag) {
      return res.status(400).json({ message: 'Tag with this name already exists' });
    }

    const tag = new Tag({
      name: formattedName,
      displayName: displayName.trim(),
      description: description ? description.trim() : undefined,
      color: color || '#1976d2',
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedTag = await tag.save();
    
    // Log activity
    await Activity.logActivity(
      'tag_create',
      req.user,
      'tag',
      savedTag._id,
      {
        name: savedTag.name,
        displayName: savedTag.displayName,
        description: savedTag.description,
        color: savedTag.color,
      },
      req,
    );
    
    res.status(201).json(savedTag);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(error => error.message).join(', ');
      return res.status(400).json({ message });
    }
    console.error('Create tag error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tag
router.put('/:id', auth, checkRole(['update_post']), async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    const { displayName, description, color, isActive } = req.body;

    if (displayName) tag.displayName = displayName.trim();
    if (description !== undefined) tag.description = description ? description.trim() : undefined;
    if (color) tag.color = color;
    if (isActive !== undefined) tag.isActive = isActive;

    await tag.save();
    
    // Log activity
    await Activity.logActivity(
      'tag_update',
      req.user,
      'tag',
      tag._id,
      {
        name: tag.name,
        displayName: tag.displayName,
        description: tag.description,
        color: tag.color,
      },
      req,
    );
    
    res.json(tag);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(error => error.message).join(', ');
      return res.status(400).json({ message });
    }
    console.error('Update tag error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete tag (soft delete)
router.delete('/:id', auth, checkRole(['delete_post']), async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Log activity before deletion
    await Activity.logActivity(
      'tag_delete',
      req.user,
      'tag',
      tag._id,
      {
        name: tag.name,
        displayName: tag.displayName,
        description: tag.description,
      },
      req,
    );

    // Soft delete the tag
    await tag.softDelete();
    res.status(204).send();
  } catch (err) {
    console.error('Delete tag error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get tag statistics
router.get('/:id/stats', auth, checkRole(['read_post']), async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Count posts with this tag
    const postCount = await Post.countDocuments({ 
      tags: tag.name,
      isPublished: true, 
    });

    // Update tag post count
    tag.postCount = postCount;
    await tag.save();

    res.json({
      tag: tag.name,
      displayName: tag.displayName,
      postCount,
      isActive: tag.isActive,
    });
  } catch (err) {
    console.error('Get tag stats error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Sync all tag post counts
router.post('/sync-counts', auth, checkRole(['update_post']), async (req, res) => {
  try {
    // First, get all unique tags from published posts
    const postTags = await Post.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]);

    // Get existing tags
    const existingTags = await Tag.find({});
    const existingTagNames = new Set(existingTags.map(tag => tag.name));

    let created = 0;
    let updated = 0;

    // Create missing tags and update counts
    for (const postTag of postTags) {
      const tagName = postTag._id;
      const count = postTag.count;

      if (existingTagNames.has(tagName)) {
        // Update existing tag count
        await Tag.updateOne(
          { name: tagName },
          { $set: { postCount: count } },
        );
        updated++;
      } else {
        // Create new tag for tags that exist in posts but not in Tag collection
        const displayName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        await Tag.create({
          name: tagName,
          displayName,
          description: `Auto-generated tag for ${displayName}`,
          color: '#1976d2',
          isActive: true,
          postCount: count,
        });
        created++;
      }
    }

    // Reset count to 0 for tags that have no posts
    await Tag.updateMany(
      { name: { $nin: postTags.map(pt => pt._id) } },
      { $set: { postCount: 0 } },
    );

    res.json({ 
      message: 'Tag counts synchronized successfully', 
      created,
      updated,
      totalTags: postTags.length,
    });
  } catch (err) {
    console.error('Sync tag counts error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
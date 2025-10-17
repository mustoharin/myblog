const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');

// Get all roles (superadmin only)
router.get('/', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const paginateResults = require('../utils/pagination');
    const User = require('../models/User');
    const { page, limit, sort = 'name' } = req.query;

    const result = await paginateResults(Role, {}, {
      page,
      limit,
      sort,
      populate: 'privileges'
    });

    // Add user counts for each role
    const rolesWithCounts = await Promise.all(
      result.items.map(async (role) => {
        const usersCount = await User.countDocuments({ role: role._id });
        return {
          ...role.toObject(),
          usersCount
        };
      })
    );

    res.json({
      ...result,
      items: rolesWithCounts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single role by ID (superadmin only)
router.get('/:id', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const User = require('../models/User');
    const role = await Role.findById(req.params.id).populate('privileges');
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Add user count
    const usersCount = await User.countDocuments({ role: role._id });
    const roleWithCount = {
      ...role.toObject(),
      usersCount
    };

    res.json(roleWithCount);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new role (superadmin only)
router.post('/', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const { name, description, privileges } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Check if role already exists
    let role = await Role.findOne({ name });
    if (role) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    // Validate privileges if provided
    if (privileges) {
      try {
        const Privilege = require('../models/Privilege');
        const validPrivileges = await Privilege.find({ _id: { $in: privileges } });
        if (validPrivileges.length !== privileges.length) {
          return res.status(400).json({ message: 'Invalid privilege ID' });
        }
      } catch (err) {
        return res.status(400).json({ message: 'Invalid privilege ID' });
      }
    }

    // Create new role
    role = new Role({
      name,
      description,
      privileges: privileges || []
    });

    await role.save();
    
    // Populate privileges before sending response
    await role.populate('privileges');
    
    // Log activity
    await Activity.logActivity(
      'role_create',
      req.user,
      'role',
      role._id,
      {
        name: role.name,
        description: role.description,
        privilegeCount: role.privileges.length
      },
      req
    );
    
    res.status(201).json(role);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Role already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    console.error('Role creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update role (superadmin only)
router.put('/:id', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const { name, description, privileges, isActive } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (privileges) updateData.privileges = privileges;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('privileges');

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Log activity
    await Activity.logActivity(
      'role_update',
      req.user,
      'role',
      role._id,
      {
        name: role.name,
        description: role.description,
        privilegeCount: role.privileges.length
      },
      req
    );

    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete role (superadmin only)
router.delete('/:id', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deletion of superadmin role
    if (role.name === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin role' });
    }

    // Check if role is assigned to any users - with soft delete, we don't need to prevent role deletion
    // const User = require('../models/User');
    // const usersWithRole = await User.countDocuments({ role: role._id });
    // if (usersWithRole > 0) {
    //   return res.status(400).json({ message: 'Role is assigned to users and cannot be deleted' });
    // }

    // Log activity before deletion
    await Activity.logActivity(
      'role_delete',
      req.user,
      'role',
      role._id,
      {
        name: role.name,
        description: role.description
      },
      req
    );

    await role.softDelete();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
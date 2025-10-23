const express = require('express');
const router = express.Router();
const Privilege = require('../models/Privilege');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleAuth');

// Get all privileges (superadmin only)
router.get('/', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const { grouped = 'false', page, limit, sort = 'module' } = req.query;

    if (grouped === 'true') {
      // Return privileges grouped by module
      const groupedPrivileges = await Privilege.getGroupedByModule();
      res.json({ 
        modules: groupedPrivileges,
        totalModules: groupedPrivileges.length, 
      });
    } else {
      // Return paginated privileges
      const paginateResults = require('../utils/pagination');
      const result = await paginateResults(Privilege, {}, {
        page,
        limit,
        sort,
      });
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available modules
router.get('/modules', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const modules = Privilege.getModules();
    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new privilege (superadmin only)
router.post('/', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const { name, description, code, module, moduleDisplayName, priority } = req.body;

    // Validate required fields
    if (!name || !description || !code || !module) {
      return res.status(400).json({ 
        message: 'Name, description, code, and module are required', 
      });
    }

    // Check if privilege already exists
    let privilege = await Privilege.findOne({ 
      $or: [{ name }, { code }], 
    });
    
    if (privilege) {
      return res.status(400).json({ message: 'Privilege already exists' });
    }

    // Validate module
    const validModules = Privilege.getModules().map(m => m.code);
    if (!validModules.includes(module)) {
      return res.status(400).json({ message: 'Invalid module' });
    }

    // Create new privilege
    privilege = new Privilege({
      name,
      description,
      code,
      module,
      moduleDisplayName: moduleDisplayName || Privilege.getModules().find(m => m.code === module)?.name,
      priority: priority || 0,
    });

    await privilege.save();
    res.status(201).json(privilege);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update privilege (superadmin only)
router.put('/:id', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const { name, description, code, isActive, module, moduleDisplayName, priority } = req.body;
    
    // Get the current privilege first
    const currentPrivilege = await Privilege.findById(req.params.id);
    if (!currentPrivilege) {
      return res.status(404).json({ message: 'Privilege not found' });
    }

    // List of essential privileges that cannot be modified
    const essentialPrivileges = [
      'create_user', 'read_user', 'update_user', 'delete_user', 'manage_user_roles',
      'manage_roles', 'create_post', 'read_post', 'update_post', 'delete_post',
      'publish_post', 'manage_comments', 'change_password',
    ];

    // Prevent modification of essential privileges
    if (essentialPrivileges.includes(currentPrivilege.code)) {
      // Only allow updating description and isActive for essential privileges
      if (name || code || module) {
        return res.status(403).json({ 
          message: 'Cannot modify name, code, or module of essential privilege. Only description and isActive can be updated.',
        });
      }
    }

    // If changing code or name, check for duplicates
    if (code && code !== currentPrivilege.code) {
      const existingByCode = await Privilege.findOne({ code, _id: { $ne: req.params.id } });
      if (existingByCode) {
        return res.status(400).json({ message: 'Privilege code already exists' });
      }
    }

    if (name && name !== currentPrivilege.name) {
      const existingByName = await Privilege.findOne({ name, _id: { $ne: req.params.id } });
      if (existingByName) {
        return res.status(400).json({ message: 'Privilege name already exists' });
      }
    }

    // Validate module if provided
    if (module && module !== currentPrivilege.module) {
      const validModules = Privilege.getModules().map(m => m.code);
      if (!validModules.includes(module)) {
        return res.status(400).json({ message: 'Invalid module' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (code) updateData.code = code;
    if (module) updateData.module = module;
    if (moduleDisplayName) updateData.moduleDisplayName = moduleDisplayName;
    if (priority !== undefined) updateData.priority = priority;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const privilege = await Privilege.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true },
    );

    if (!privilege) {
      return res.status(404).json({ message: 'Privilege not found' });
    }

    res.json(privilege);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete privilege (superadmin only)
router.delete('/:id', auth, checkRole(['manage_roles']), async (req, res) => {
  try {
    const privilege = await Privilege.findById(req.params.id);
    
    if (!privilege) {
      return res.status(404).json({ message: 'Privilege not found' });
    }

    // List of essential privileges that cannot be deleted
    const essentialPrivileges = [
      'create_user', 'read_user', 'update_user', 'delete_user',
      'manage_roles', 'create_post', 'read_post', 'update_post', 'delete_post',
    ];

    if (essentialPrivileges.includes(privilege.code)) {
      return res.status(403).json({ message: 'Cannot delete essential privilege' });
    }

    // Check if privilege is assigned to any roles - with soft delete, we don't need to prevent privilege deletion
    // const Role = require('../models/Role');
    // const rolesWithPrivilege = await Role.countDocuments({ privileges: privilege._id });
    // if (rolesWithPrivilege > 0) {
    //   return res.status(400).json({ message: 'Privilege is assigned to roles and cannot be deleted' });
    // }

    await privilege.softDelete();
    res.status(200).json({ message: 'Privilege deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
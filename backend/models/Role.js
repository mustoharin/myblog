const mongoose = require('mongoose');
const { validateNoXss } = require('../utils/xssValidator');
const { validateRichContent } = require('../utils/richContentValidator');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        const error = validateNoXss(v);
        return error === '';
      },
      message: () => 'Role name contains potentially unsafe content'
    }
  },
  description: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const result = validateRichContent(v);
        if (result.error) {
          return false;
        }
        // Update the description with sanitized version
        this.description = result.clean;
        return true;
      },
      message: props => 'Description validation failed: Invalid or unsafe HTML content'
    }
  },
  privileges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Privilege'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', RoleSchema);
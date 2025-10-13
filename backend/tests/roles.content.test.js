const mongoose = require('mongoose');
const { createInitialPrivileges } = require('./setup');
const Role = require('../models/Role');

describe('Role Rich Content Validation', () => {
  let privileges;

  beforeEach(async () => {
    privileges = await createInitialPrivileges();
  });

  it('should allow safe HTML in role description', async () => {
    const roleWithSafeHtml = {
      name: 'Content Editor',
      description: `
        <h2>Content Editor Role</h2>
        <p>This role is responsible for:</p>
        <ul>
          <li>Editing <strong>blog posts</strong></li>
          <li>Managing <em>content categories</em></li>
        </ul>
        <blockquote>
          <p>With great power comes great responsibility</p>
        </blockquote>
      `,
      privileges: [privileges[0]._id]
    };

    const role = new Role(roleWithSafeHtml);
    await role.validate();

    expect(role.description).toContain('<h2>');
    expect(role.description).toContain('<strong>');
    expect(role.description).toContain('<blockquote>');
  });

  it('should sanitize and remove unsafe content from role description', async () => {
    const roleWithUnsafeContent = {
      name: 'Test Role',
      description: `
        <h2>Test Role</h2>
        <p>Normal content</p>
        <script>alert('xss');</script>
        <p onclick="alert('xss')">Click me</p>
        <a href="javascript:alert('xss')">Bad Link</a>
      `,
      privileges: [privileges[0]._id]
    };

    const role = new Role(roleWithUnsafeContent);
    await role.validate();

    expect(role.description).toContain('<h2>Test Role</h2>');
    expect(role.description).toContain('<p>Normal content</p>');
    expect(role.description).not.toContain('<script>');
    expect(role.description).not.toContain('onclick');
    expect(role.description).not.toContain('javascript:');
  });

  it('should reject completely invalid content in role description', async () => {
    const roleWithInvalidContent = {
      name: 'Invalid Role',
      description: '<script>alert("xss");</script>',
      privileges: [privileges[0]._id]
    };

    const role = new Role(roleWithInvalidContent);
    
    await expect(role.validate()).rejects.toThrow();
  });

  it('should allow updating role with valid rich content description', async () => {
    // Create initial role
    const role = new Role({
      name: 'Update Test Role',
      description: '<p>Initial description</p>',
      privileges: [privileges[0]._id]
    });

    await role.validate();

    // Update description
    role.description = `
      <h3>Updated Role Description</h3>
      <ul>
        <li>New responsibility 1</li>
        <li>New responsibility 2</li>
      </ul>
    `;

    await role.validate();
    
    expect(role.description).toContain('<h3>');
    expect(role.description).toContain('<li>');
  });
});
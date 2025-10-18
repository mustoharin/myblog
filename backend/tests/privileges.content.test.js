const mongoose = require('mongoose');
const Privilege = require('../models/Privilege');

describe('Privilege Rich Content Validation', () => {
  beforeEach(() => {});

  it('should allow safe HTML in privilege description', async () => {
    const privilegeWithSafeHtml = {
      name: 'Content Management',
      code: 'content_management',
      description: `
        <h2>Content Management Privilege</h2>
        <p>This privilege allows users to:</p>
        <ul>
          <li>Create and edit <strong>content items</strong></li>
          <li>Manage <em>content workflow</em></li>
        </ul>
        <blockquote>
          <p>Content management is critical for site maintenance</p>
        </blockquote>
      `,
      module: 'content_management',
      moduleDisplayName: 'Content Management',
    };

    const privilege = new Privilege(privilegeWithSafeHtml);
    await privilege.validate();

    expect(privilege.description).toContain('<h2>');
    expect(privilege.description).toContain('<strong>');
    expect(privilege.description).toContain('<blockquote>');
  });

  it('should sanitize and remove unsafe content from privilege description', async () => {
    const privilegeWithUnsafeContent = {
      name: 'Test Privilege',
      code: 'test_privilege',
      description: `
        <h2>Test Privilege</h2>
        <p>Normal content</p>
        <script>alert('xss');</script>
        <p onclick="alert('xss')">Click me</p>
        <a href="javascript:alert('xss')">Bad Link</a>
      `,
      module: 'system_administration',
      moduleDisplayName: 'System Administration',
    };

    const privilege = new Privilege(privilegeWithUnsafeContent);
    await privilege.validate();

    expect(privilege.description).toContain('<h2>Test Privilege</h2>');
    expect(privilege.description).toContain('<p>Normal content</p>');
    expect(privilege.description).not.toContain('<script>');
    expect(privilege.description).not.toContain('onclick');
    expect(privilege.description).not.toContain('javascript:');
  });

  it('should reject completely invalid content in privilege description', async () => {
    const privilegeWithInvalidContent = {
      name: 'Invalid Privilege',
      code: 'invalid_privilege',
      description: '<script>alert("xss");</script>',
      module: 'system_administration',
      moduleDisplayName: 'System Administration',
    };

    const privilege = new Privilege(privilegeWithInvalidContent);
    
    await expect(privilege.validate()).rejects.toThrow();
  });

  it('should allow updating privilege with valid rich content description', async () => {
    // Create initial privilege
    const privilege = new Privilege({
      name: 'Update Test Privilege',
      code: 'update_test',
      description: '<p>Initial description</p>',
      module: 'system_administration',
      moduleDisplayName: 'System Administration',
    });

    await privilege.validate();

    // Update description
    privilege.description = `
      <h3>Updated Privilege Description</h3>
      <ul>
        <li>New capability 1</li>
        <li>New capability 2</li>
      </ul>
    `;

    await privilege.validate();
    
    expect(privilege.description).toContain('<h3>');
    expect(privilege.description).toContain('<li>');
  });
});
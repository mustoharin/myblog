const request = require('supertest');
const app = require('../server');
const {
  createInitialPrivileges,
  createInitialRoles,
  createTestUser,
  getSuperadminToken,
  getAdminToken
} = require('./setup');

describe('Post Routes', () => {
  let privileges, roles, superadminUser, adminUser, superadminToken, adminToken;

  beforeEach(async () => {
    // Setup initial data
    privileges = await createInitialPrivileges();
    roles = await createInitialRoles(privileges);
    superadminUser = await createTestUser('superadmin', roles.superadminRole._id);
    adminUser = await createTestUser('admin', roles.adminRole._id);

    // Get tokens using proper helper functions that handle CAPTCHA
    superadminToken = await getSuperadminToken(app);
    adminToken = await getAdminToken(app);
  });

  describe('GET /api/posts', () => {
    it('should allow admin to list all posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBeTruthy();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/posts');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/posts', () => {
    it('should validate against XSS in title and content', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '<script>alert("xss")</script>malicious',
          content: 'Test content with <img src="x" onerror="alert(\'xss\')">',
          author: adminUser._id
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('unsafe content');
    });

    it('should allow admin to create new post', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          author: adminUser._id
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'Test Post');
    });

    it('should require title and content', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          content: '',
          author: adminUser._id
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/posts/:id', () => {
    let postId;

    beforeEach(async () => {
      // Create a test post
      const post = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Post',
          content: 'Original content',
          author: adminUser._id
        });
      postId = post.body._id;
    });

    it('should allow admin to update their own post', async () => {
      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Post',
          content: 'Updated content'
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Post');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let postId;

    beforeEach(async () => {
      // Create a test post
      const post = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Post to Delete',
          content: 'Content to delete',
          author: adminUser._id
        });
      postId = post.body._id;
    });

    it('should allow admin to delete their own post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow superadmin to delete any post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Post Content Validation', () => {
    // We'll reuse the tokens from the outer describe block
    beforeEach(async () => {
      // Setup initial data if not already done
      if (!adminToken) {
        privileges = await createInitialPrivileges();
        roles = await createInitialRoles(privileges);
        adminUser = await createTestUser('admin', roles.adminRole._id);
        adminToken = await getAdminToken();
      }
    });

    it('should allow safe HTML content in post body', async () => {
      const postWithSafeHtml = {
        title: 'Test Post with Rich Content',
        content: `
          <h1>Welcome to my blog post</h1>
          <p>This is a <strong>formatted</strong> post with some <em>styling</em>.</p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
          <pre><code class="language-javascript">
            const hello = "world";
            console.log(hello);
          </code></pre>
          <blockquote>
            <p>This is a quoted text</p>
          </blockquote>
          <p><a href="https://example.com" title="Example Link">Visit Example</a></p>
          <img src="https://example.com/image.jpg" alt="Test Image" />
        `
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postWithSafeHtml);

      expect(response.status).toBe(201);
      expect(response.body.content).toContain('<h1>');
      expect(response.body.content).toContain('<strong>');
      expect(response.body.content).toContain('<code class="language-javascript">');
    });

    it('should sanitize and remove unsafe content', async () => {
      const postWithUnsafeContent = {
        title: 'Test Post with Unsafe Content',
        content: `
          <h1>Test Post</h1>
          <p>Normal content</p>
          <script>alert('xss');</script>
          <p onclick="alert('xss')">Click me</p>
          <a href="javascript:alert('xss')">Bad Link</a>
          <iframe src="http://evil.com"></iframe>
          <img src="http://example.com/image.jpg" onerror="alert('xss')" />
        `
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postWithUnsafeContent);

      expect(response.status).toBe(201);
      expect(response.body.content).toContain('<h1>Test Post</h1>');
      expect(response.body.content).toContain('<p>Normal content</p>');
      expect(response.body.content).not.toContain('<script>');
      expect(response.body.content).not.toContain('onclick');
      expect(response.body.content).not.toContain('javascript:');
      expect(response.body.content).not.toContain('<iframe');
      expect(response.body.content).not.toContain('onerror');
    });

    it('should handle markdown-style code blocks', async () => {
      const postWithCodeBlocks = {
        title: 'Post with Code Examples',
        content: `
          <h2>Code Examples</h2>
          <pre><code class="language-python">
            def hello_world():
                print("Hello, World!")
          </code></pre>
          <pre><code class="language-javascript">
            function greeting(name) {
                return \`Hello, \${name}!\`;
            }
          </code></pre>
        `
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postWithCodeBlocks);

      expect(response.status).toBe(201);
      expect(response.body.content).toContain('class="language-python"');
      expect(response.body.content).toContain('class="language-javascript"');
      expect(response.body.content).toContain('def hello_world()');
      expect(response.body.content).toContain('function greeting(name)');
    });

    it('should handle tables in content', async () => {
      const postWithTable = {
        title: 'Post with Table',
        content: `
          <table>
            <thead>
              <tr>
                <th align="left">Header 1</th>
                <th align="center">Header 2</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td align="left">Cell 1</td>
                <td align="center">Cell 2</td>
              </tr>
            </tbody>
          </table>
        `
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postWithTable);

      expect(response.status).toBe(201);
      expect(response.body.content).toContain('<table>');
      expect(response.body.content).toContain('<th align="left">');
      expect(response.body.content).toContain('<td align="center">');
    });

    it('should reject completely invalid content', async () => {
      const postWithInvalidContent = {
        title: 'Invalid Post',
        content: '<script>alert("xss");</script>'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postWithInvalidContent);

      expect(response.status).toBe(400);
    });
  });
});
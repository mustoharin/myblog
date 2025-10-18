const sanitizeHtml = require('sanitize-html');

// Default options for sanitizing rich content (Markdown/WYSIWYG)
const defaultOptions = {
  allowedTags: [
    // Basic formatting
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'bold', 'b', 'i', 'em', 'strong', 'strike', 'del', 'u',
    // Lists
    'ul', 'ol', 'li',
    // Content
    'blockquote', 'pre', 'code',
    // Links and images
    'a', 'img',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'], // For syntax highlighting
    // Allow id and class on heading elements for anchor links
    h1: ['id', 'class'],
    h2: ['id', 'class'],
    h3: ['id', 'class'],
    h4: ['id', 'class'],
    h5: ['id', 'class'],
    h6: ['id', 'class'],
    // Allow alignment classes on paragraphs
    p: ['class'],
    // Table alignment
    th: ['align'],
    td: ['align'],
  },
  // URLs that start with these protocols will be allowed
  allowedSchemes: ['http', 'https', 'mailto'],
  // Add any domains you trust for images
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
};

/**
 * Validates and sanitizes rich content from WYSIWYG editors or Markdown
 * @param {string} content - The content to validate and sanitize
 * @param {Object} options - Optional sanitization options to override defaults
 * @returns {Object} Object with clean (sanitized content) and error (if any) properties
 */
function validateRichContent(content, options = {}) {
  try {
    if (typeof content !== 'string') {
      return {
        clean: '',
        error: 'Content must be a string',
      };
    }

    const sanitizeOptions = {
      ...defaultOptions,
      ...options,
    };

    const clean = sanitizeHtml(content, sanitizeOptions);

    // If the sanitized content is empty but the original wasn't,
    // it means all content was removed due to being unsafe
    if (clean === '' && content.trim() !== '') {
      return {
        clean: '',
        error: 'Content contains only unsafe or unsupported HTML',
      };
    }

    return {
      clean,
      error: '',
    };
  } catch (err) {
    return {
      clean: '',
      error: `Error processing content: ${err.message}`,
    };
  }
}

module.exports = {
  validateRichContent,
  defaultOptions,
};
import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} html - The HTML content to sanitize
 * @returns {string} - The sanitized HTML content
 */
export const sanitizeHtml = html => {
  if (!html) return '';
  
  // Configure DOMPurify to allow safe HTML elements
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'img', 'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'src', 'alt', 'title', 'class', 'id',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT_TEXT: true,
    KEEP_CONTENT: true,
  };
  
  return DOMPurify.sanitize(html, config);
};

/**
 * Creates a safe HTML object for React's dangerouslySetInnerHTML
 * @param {string} html - The HTML content to sanitize
 * @returns {object} - Object with __html property containing sanitized HTML
 */
export const createSafeHTML = html => ({
  __html: sanitizeHtml(html),
});
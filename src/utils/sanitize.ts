import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting tags, images, formulas, tables, and attributes.
 */
export const sanitizeHtml = (dirty: string): string => {
  const config = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'blockquote',
      'code', 'pre', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'svg', 'path'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel', 'src', 'alt', 'style', 'class', 'width', 'height', 'loading'
    ],
    ALLOW_DATA_ATTR: true,
    KEEP_CONTENT: true,
  };
  
  return DOMPurify.sanitize(dirty, config);
};

/**
 * Escape HTML special characters to prevent XSS.
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Sanitize user-provided text - escape HTML by default.
 */
export const sanitizeUserText = (text: string): string => {
  return escapeHtml(text);
};

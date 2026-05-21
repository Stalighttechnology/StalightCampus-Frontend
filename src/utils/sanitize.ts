import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Only allows safe tags and attributes.
 */
export const sanitizeHtml = (dirty: string): string => {
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
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

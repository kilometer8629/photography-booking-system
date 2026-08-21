/**
 * Email template renderer.
 * Reads .hbs files from server/templates/ and replaces {{variable}} placeholders.
 * Lightweight Handlebars-compatible subset (no partials/helpers needed here).
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../templates');

// Cache compiled templates in memory
const templateCache = new Map();

/**
 * Read and cache a template file.
 * @param {string} name - Template filename without extension (e.g. "taxReceipt")
 * @returns {string} Raw template string
 */
function loadTemplate(name) {
  if (templateCache.has(name)) {
    return templateCache.get(name);
  }
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  const content = fs.readFileSync(filePath, 'utf-8');
  templateCache.set(name, content);
  return content;
}

/**
 * Render a template with the provided data.
 * Supports {{variable}} and {{#if variable}}...{{/if}} blocks.
 *
 * @param {string} name - Template name (e.g. "taxReceipt")
 * @param {Record<string, any>} data - Key/value pairs to interpolate
 * @returns {string} Rendered HTML
 */
function renderTemplate(name, data) {
  let html = loadTemplate(name);

  // Handle {{#if key}}...{{/if}} blocks
  html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, block) => {
    return data[key] ? block : '';
  });

  // Replace {{key}} placeholders
  html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = data[key];
    return value !== undefined && value !== null ? String(value) : '';
  });

  return html;
}

/**
 * Clear the template cache (useful for development hot-reload).
 */
function clearTemplateCache() {
  templateCache.clear();
}

module.exports = { renderTemplate, clearTemplateCache };

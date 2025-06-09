// Patch file to override nunjucks configuration
const originalConfigure = require('nunjucks').configure;

// Replace the original configure function with one that always disables watching in production
require('nunjucks').configure = function(path, opts) {
  if (opts && typeof opts === 'object') {
    // Force disable watching in production environments
    if (process.env.NODE_ENV !== 'development') {
      opts.watch = false;
      console.log('Nunjucks file watching DISABLED by patch');
    }
  }
  return originalConfigure(path, opts);
};

console.log('Nunjucks configuration patched to disable watching in production');

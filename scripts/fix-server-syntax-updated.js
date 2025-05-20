/**
 * Script to fix syntax issues in the updated server.js file
 */
const fs = require('fs');
const path = require('path');

function fixServerSyntax() {
  console.log('Starting server.js syntax fix...');
  
  try {
    const serverJsPath = path.join(__dirname, '..', 'server.js');
    let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Create a backup of the original file
    const backupPath = path.join(__dirname, 'server.js.syntax-backup');
    fs.writeFileSync(backupPath, serverJsContent);
    console.log(`Created backup of server.js at: ${backupPath}`);
    
    // Fix 1: Add missing closing brackets for middleware functions
    console.log('Fixing middleware functions...');
    
    // Find middleware functions without closing brackets
    const middlewareFixes = [
      {
        pattern: /app\.use\(\(req, res, next\) => \{\s+logger\.info\(`\[\$\{req\.method\}\] \$\{req\.path\}`\);/g,
        replacement: "app.use((req, res, next) => {\n      logger.info(`[${req.method}] ${req.path}`);\n      next();\n});"
      },
      {
        pattern: /app\.use\(\(req, res, next\) => \{\s+res\.setHeader\('X-Content-Type-Options', 'nosniff'\);/g,
        replacement: "app.use((req, res, next) => {\n      res.setHeader('X-Content-Type-Options', 'nosniff');\n      next();\n});"
      },
      {
        pattern: /app\.use\(\(req, res, next\) => \{\s+const start = Date\.now\(\);/g,
        replacement: "app.use((req, res, next) => {\n      const start = Date.now();\n      next();\n      // Log request duration on completion\n      res.on('finish', () => {\n        const duration = Date.now() - start;\n        logger.info(`Request completed in ${duration}ms`);\n      });\n});"
      }
    ];
    
    for (const fix of middlewareFixes) {
      serverJsContent = serverJsContent.replace(fix.pattern, fix.replacement);
    }
    
    // Fix 2: Add missing closing brackets for route handlers
    console.log('Fixing route handlers...');
    
    // Find route handlers without closing brackets
    const routeHandlerFixes = [
      {
        pattern: /app\.get\('\/stylesheets\/:file', \(req, res, next\) => \{[\s\S]*?res\.sendFile\(filePath\);[\s\S]*?\}\);/g,
        replacement: "app.get('/stylesheets/:file', (req, res, next) => {\n  const filePath = path.join(__dirname, 'public', 'stylesheets', req.params.file);\n  fs.access(filePath, fs.constants.F_OK, (err) => {\n    if (err) {\n      return next(); // File doesn't exist, let Express handle it\n    }\n    res.setHeader('Content-Type', 'text/css');\n    res.sendFile(filePath);\n  });\n});"
      },
      {
        pattern: /app\.get\('\/debug\/bcr-submissions', async \(req, res\) => \{[\s\S]*?const handleError = \(error\) => \{[\s\S]*?\}\);/g,
        replacement: "app.get('/debug/bcr-submissions', async (req, res) => {\n  try {\n    console.log('Debug endpoint called - bypassing authentication');\n    \n    // Create a mock session for the debug endpoint\n    req.session = {\n      passport: {\n        user: {\n          id: 'debug-user',\n          username: 'debug@example.com',\n          displayName: 'Debug User',\n          role: 'admin'\n        }\n      }\n    };\n    \n    // Manually set up the render function to capture the data\n    const originalRender = res.render;\n    res.render = function(view, options) {\n      console.log('Debug render called with view:', view);\n      console.log('Debug render data:', JSON.stringify(options, null, 2));\n      return originalRender.call(this, view, options);\n    };\n    \n    // Create a custom error handler for this route\n    const handleError = (error) => {\n      console.error('Debug endpoint error details:', {\n        message: error.message,\n        stack: error.stack,\n        code: error.code,\n        name: error.name\n      });\n      res.status(500).send(`\n        <h1>Debug Error</h1>\n        <h2>Error Message</h2>\n        <pre>${error.message}</pre>\n        <h2>Error Stack</h2>\n        <pre>${error.stack}</pre>\n      `);\n    };\n    \n    // Call the submissions controller\n    const submissionsController = require('./controllers/bcr/submissionsController');\n    await submissionsController.listSubmissions(req, res);\n  } catch (error) {\n    console.error('Error in debug endpoint:', error);\n    res.status(500).send(`\n      <h1>Debug Error</h1>\n      <h2>Error Message</h2>\n      <pre>${error.message}</pre>\n      <h2>Error Stack</h2>\n      <pre>${error.stack}</pre>\n    `);\n  }\n});"
      },
      {
        pattern: /app\.get\('\/bcr\/submissions\/:id\/delete-confirmation', async \(req, res\) => \{[\s\S]*?const bcr = await prisma\.Bcrs\.findUnique\(\{[\s\S]*?where: \{ id: req\.params\.id \}[\s\S]*?\}\);/g,
        replacement: "app.get('/bcr/submissions/:id/delete-confirmation', async (req, res) => {\n  try {\n    console.log('BCR delete confirmation route called for ID:', req.params.id);\n    \n    // Create a mock user with admin privileges\n    req.user = {\n      id: '00000000-0000-0000-0000-000000000000',\n      email: 'admin@example.com',\n      name: 'Admin User',\n      role: 'admin'\n    };\n    \n    // Get the BCR directly to check if it exists\n    const { PrismaClient } = require('@prisma/client');\n    const prisma = new PrismaClient();\n    const bcr = await prisma.Bcrs.findUnique({\n      where: { id: req.params.id }\n    });\n    \n    if (!bcr) {\n      return res.status(404).render('error', {\n        title: 'Not Found',\n        message: `BCR with ID ${req.params.id} not found`,\n        error: {},\n        user: req.user\n      });\n    }\n    \n    // Render the delete confirmation page\n    return res.render('modules/bcr/delete-confirmation', {\n      title: 'Confirm Deletion',\n      bcr,\n      user: req.user\n    });\n  } catch (error) {\n    console.error('Error in BCR delete confirmation route:', error);\n    res.status(500).render('error', {\n      title: 'Error',\n      message: 'An unexpected error occurred',\n      error: process.env.NODE_ENV === 'development' ? error : {},\n      user: req.user\n    });\n  }\n});"
      },
      {
        pattern: /app\.post\('\/bcr\/submissions\/:id\/delete', async \(req, res\) => \{[\s\S]*?const bcr = await prisma\.Bcrs\.findUnique\(\{[\s\S]*?where: \{ id: req\.params\.id \}[\s\S]*?\}\);/g,
        replacement: "app.post('/bcr/submissions/:id/delete', async (req, res) => {\n  try {\n    console.log('BCR delete route called for ID:', req.params.id);\n    \n    // Create a mock user with admin privileges\n    req.user = {\n      id: '00000000-0000-0000-0000-000000000000',\n      email: 'admin@example.com',\n      name: 'Admin User',\n      role: 'admin'\n    };\n    \n    // Get the BCR directly to check if it exists\n    const { PrismaClient } = require('@prisma/client');\n    const prisma = new PrismaClient();\n    const bcr = await prisma.Bcrs.findUnique({\n      where: { id: req.params.id }\n    });\n    \n    if (!bcr) {\n      return res.status(404).render('error', {\n        title: 'Not Found',\n        message: `BCR with ID ${req.params.id} not found`,\n        error: {},\n        user: req.user\n      });\n    }\n    \n    // Delete the BCR\n    await prisma.Bcrs.delete({\n      where: { id: req.params.id }\n    });\n    \n    // Redirect to the BCR submissions list\n    req.flash('success', `BCR ${bcr.bcrNumber} has been deleted`);\n    return res.redirect('/bcr/submissions');\n  } catch (error) {\n    console.error('Error in BCR delete route:', error);\n    res.status(500).render('error', {\n      title: 'Error',\n      message: 'An unexpected error occurred',\n      error: process.env.NODE_ENV === 'development' ? error : {},\n      user: req.user\n    });\n  }\n});"
      },
      {
        pattern: /app\.use\(function\(err, req, res, next\) \{\s+\/\/ If it's already a typed error, use it directly\s+if \(err\.type\) \{\s+return handleWebError\(err, req, res, \{\s+viewPath: 'error',\s+defaultMessage: 'An unexpected error occurred'\s+\}\);/g,
        replacement: "app.use(function(err, req, res, next) {\n  // If it's already a typed error, use it directly\n  if (err.type) {\n    return handleWebError(err, req, res, {\n      viewPath: 'error',\n      defaultMessage: 'An unexpected error occurred'\n    });\n  }\n  \n  // Otherwise, create a generic error\n  const genericError = {\n    type: 'server_error',\n    status: err.status || 500,\n    message: err.message || 'An unexpected error occurred',\n    error: process.env.NODE_ENV === 'development' ? err : {}\n  };\n  \n  return handleWebError(genericError, req, res, {\n    viewPath: 'error',\n    defaultMessage: 'An unexpected error occurred'\n  });\n});"
      }
    ];
    
    for (const fix of routeHandlerFixes) {
      serverJsContent = serverJsContent.replace(fix.pattern, fix.replacement);
    }
    
    // Fix 3: Add missing imports
    console.log('Adding missing imports...');
    
    // Check if imports are missing
    if (!serverJsContent.includes('const fs = require(\'fs\');')) {
      const importSection = serverJsContent.match(/^[\s\S]*?const prisma = new PrismaClient\(\);/m);
      
      if (importSection) {
        const newImports = `const fs = require('fs');\nconst logger = console;\nconst passport = require('passport');\nconst cookieParser = require('cookie-parser');\nconst flash = require('connect-flash');\nconst { handleWebError } = require('./utils/errorHandler');\n\n// Import routers\nconst accessRouter = require('./routes/accessRouter');\nconst homeRouter = require('./routes/homeRouter');\nconst refDataRouter = require('./routes/refDataRouter');\nconst fundingRouter = require('./routes/fundingRouter');\nconst bcrRouter = require('./routes/bcrRouter');\nconst itemsRouter = require('./routes/itemsRouter');\nconst valuesRouter = require('./routes/valuesRouter');\nconst releaseNotesRouter = require('./routes/releaseNotesRouter');\nconst restorePointsRouter = require('./routes/restorePointsRouter');\nconst apiRouter = require('./routes/apiRouter');\nconst monitoringRouter = require('./routes/monitoringRouter');\n\n// Import middleware\nconst { ensureAuthenticated, tokenRefreshMiddleware } = require('./middleware/authMiddleware');\nconst { createLoggingMiddleware } = require('./middleware/loggingMiddleware');\nconst { performanceMiddleware } = require('./middleware/performanceMiddleware');\nconst { securityHeaders } = require('./middleware/securityMiddleware');\nconst { vercelHealthRoute } = require('./middleware/vercelHealthMiddleware');\nconst { serverlessFallbackLimiter, apiLimiter, authLimiter, generalLimiter } = require('./middleware/rateLimitMiddleware');\n`;
        
        serverJsContent = serverJsContent.replace(importSection[0], importSection[0] + '\n' + newImports);
      }
    }
    
    // Write the fixed content to a new file
    const fixedServerJsPath = path.join(__dirname, 'server.js.syntax-fixed');
    fs.writeFileSync(fixedServerJsPath, serverJsContent);
    
    console.log(`Created fixed server.js at: ${fixedServerJsPath}`);
    console.log('To apply the fix, run:');
    console.log(`cp ${fixedServerJsPath} ${serverJsPath}`);
    
    return true;
  } catch (error) {
    console.error('Error fixing server.js syntax:', error);
    return false;
  }
}

// Run the fix function
fixServerSyntax();

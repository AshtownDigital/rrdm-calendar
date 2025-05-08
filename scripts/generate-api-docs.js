/**
 * Generate API Documentation Script
 * 
 * This script generates API documentation based on JSDoc comments in API routes.
 * It uses apidoc to generate HTML documentation.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api');
const docsDir = path.join(rootDir, 'docs/api');
const apidocJsonPath = path.join(rootDir, 'apidoc.json');

// Create apidoc.json if it doesn't exist
if (!fs.existsSync(apidocJsonPath)) {
  console.log('Creating apidoc.json...');
  
  const apidocJson = {
    "name": "RRDM API",
    "version": "1.0.0",
    "description": "API documentation for the RRDM application",
    "title": "RRDM API Documentation",
    "url": "/api",
    "sampleUrl": "/api",
    "template": {
      "withCompare": true,
      "withGenerator": true
    },
    "header": {
      "title": "Introduction",
      "filename": "docs/api/header.md"
    },
    "footer": {
      "title": "Additional Information",
      "filename": "docs/api/footer.md"
    }
  };
  
  fs.writeFileSync(
    apidocJsonPath,
    JSON.stringify(apidocJson, null, 2) + '\n',
    'utf8'
  );
}

// Create header.md if it doesn't exist
const headerDir = path.join(rootDir, 'docs/api');
const headerPath = path.join(headerDir, 'header.md');

if (!fs.existsSync(headerDir)) {
  console.log('Creating docs/api directory...');
  fs.mkdirSync(headerDir, { recursive: true });
}

if (!fs.existsSync(headerPath)) {
  console.log('Creating header.md...');
  
  const headerContent = `# RRDM API Documentation

This documentation provides information about the RRDM API endpoints, request parameters, and response formats.

## Authentication

Most API endpoints require authentication. You can authenticate by including a valid session cookie or by using an API key.

### Session Authentication

Session authentication is used for web applications and requires a valid session cookie.

### API Key Authentication

API key authentication is used for machine-to-machine communication and requires an API key in the \`X-API-Key\` header.

## Response Format

All API responses follow a standard format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
\`\`\`

For errors:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error message",
    "status": 400,
    "details": { ... }
  }
}
\`\`\`

## Versioning

The API is versioned using URL path versioning (e.g., \`/api/v1/resource\`).
`;
  
  fs.writeFileSync(headerPath, headerContent, 'utf8');
}

// Create footer.md if it doesn't exist
const footerPath = path.join(headerDir, 'footer.md');

if (!fs.existsSync(footerPath)) {
  console.log('Creating footer.md...');
  
  const footerContent = `## Rate Limiting

API endpoints are rate limited to prevent abuse. The rate limits are:

- General endpoints: 300 requests per minute
- Authentication endpoints: 10 requests per 15 minutes

Rate limit information is included in the response headers:

- \`RateLimit-Limit\`: The maximum number of requests allowed in the time window
- \`RateLimit-Remaining\`: The number of requests remaining in the current time window
- \`RateLimit-Reset\`: The time when the rate limit will reset (Unix timestamp)

## Error Codes

Common error codes:

- \`400\`: Bad Request - The request was malformed or missing required parameters
- \`401\`: Unauthorized - Authentication is required
- \`403\`: Forbidden - The authenticated user does not have permission to access the resource
- \`404\`: Not Found - The requested resource was not found
- \`429\`: Too Many Requests - The rate limit has been exceeded
- \`500\`: Internal Server Error - An unexpected error occurred on the server

## Support

For API support, please contact the RRDM support team.
`;
  
  fs.writeFileSync(footerPath, footerContent, 'utf8');
}

// Install apidoc if not already installed
try {
  console.log('Checking if apidoc is installed...');
  execSync('npx apidoc -V', { stdio: 'ignore' });
  console.log('apidoc is already installed.');
} catch (error) {
  console.log('Installing apidoc...');
  execSync('npm install --save-dev apidoc', { stdio: 'inherit' });
}

// Generate API documentation
console.log('Generating API documentation...');
try {
  execSync(
    `npx apidoc -i ${apiDir} -o ${docsDir}/html`,
    { stdio: 'inherit' }
  );
  console.log('API documentation generated successfully!');
  console.log(`Documentation is available at: ${docsDir}/html/index.html`);
} catch (error) {
  console.error('Error generating API documentation:', error.message);
  process.exit(1);
}

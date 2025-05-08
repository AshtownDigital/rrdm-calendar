# RRDM API Documentation

This documentation provides information about the RRDM API endpoints, request parameters, and response formats.

## Authentication

Most API endpoints require authentication. You can authenticate by including a valid session cookie or by using an API key.

### Session Authentication

Session authentication is used for web applications and requires a valid session cookie.

### API Key Authentication

API key authentication is used for machine-to-machine communication and requires an API key in the `X-API-Key` header.

## Response Format

All API responses follow a standard format:

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

For errors:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "status": 400,
    "details": { ... }
  }
}
```

## Versioning

The API is versioned using URL path versioning (e.g., `/api/v1/resource`).

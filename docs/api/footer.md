## Rate Limiting

API endpoints are rate limited to prevent abuse. The rate limits are:

- General endpoints: 300 requests per minute
- Authentication endpoints: 10 requests per 15 minutes

Rate limit information is included in the response headers:

- `RateLimit-Limit`: The maximum number of requests allowed in the time window
- `RateLimit-Remaining`: The number of requests remaining in the current time window
- `RateLimit-Reset`: The time when the rate limit will reset (Unix timestamp)

## Error Codes

Common error codes:

- `400`: Bad Request - The request was malformed or missing required parameters
- `401`: Unauthorized - Authentication is required
- `403`: Forbidden - The authenticated user does not have permission to access the resource
- `404`: Not Found - The requested resource was not found
- `429`: Too Many Requests - The rate limit has been exceeded
- `500`: Internal Server Error - An unexpected error occurred on the server

## Support

For API support, please contact the RRDM support team.

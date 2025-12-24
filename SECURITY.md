# Security Best Practices

This document outlines the security measures implemented in this application to protect user credentials and data.

## Implemented Security Measures

### 1. HTTPS with HSTS (HTTP Strict Transport Security)

The application uses the `helmet` middleware to enforce HTTPS connections with HSTS headers:
- **Max Age**: 1 year (31,536,000 seconds)
- **Include Subdomains**: Yes
- **Preload**: Enabled

This prevents downgrade attacks where attackers try to force connections over plain HTTP.

**Important**: In production, ensure your backend has a valid SSL certificate (e.g., via Let's Encrypt).

### 2. Secure Frontend Payload

Credentials are sent via POST requests in the request body, never in URL query parameters:
- POST requests prevent credentials from being logged in web server access logs
- The request body is encrypted when transmitted over HTTPS
- Content-Type is set to `application/json`

### 3. Request Logging Protection

The application uses `morgan` logging middleware with the following protections:
- `/api/login` endpoint is explicitly excluded from request logging
- This prevents credentials from being written to server logs
- Other endpoints are logged normally for monitoring purposes

### 4. "Hot Potato" Method - Immediate Credential Handling

Credentials are treated like a "hot potato" and handled with extreme care:

**In the API Server (`server/src/index.ts`):**
```typescript
let username: string | undefined;
let password: string | undefined;

try {
    username = req.body.username;
    password = req.body.password;
    
    // Use credentials immediately
    const cookies = await loginScraper.login(username, password);
    
    // Nullify immediately after use
    username = undefined;
    password = undefined;
} catch (error) {
    // Ensure nullification even on error
    username = undefined;
    password = undefined;
}
```

**In the Scraper (`server/src/raceScraper.ts`):**
- Credentials are used directly in the URLSearchParams without intermediate storage
- No credential values are logged to console
- Credentials are passed immediately to the authentication endpoint

### 5. Error Handling Without Credential Exposure

Error logs are sanitized to prevent credential leakage:
- Generic error messages are returned to the client
- Error details do not include request body contents
- Console logging for authentication errors is generic: "Authentication failed"

## Environment Variables

### Required for Production:

- `CORS_ORIGIN` - The allowed origin for CORS requests (your frontend URL)
  - Example: `https://your-app.example.com`
  - Default: Development Codespace URL (should be overridden in production)

- `PORT` - Server port (default: 3001)

### Example .env file:

```env
PORT=3001
CORS_ORIGIN=https://your-production-frontend.com
```

## Deployment Recommendations

### For Production Environments:

1. **SSL/TLS Certificate**
   - Obtain a valid SSL certificate from a trusted CA (Let's Encrypt is free)
   - Configure your web server (Nginx, Apache) or cloud platform to use HTTPS
   - Set up automatic certificate renewal

2. **Environment Variables**
   - Never commit credentials or secrets to version control
   - Use environment variables for sensitive configuration
   - Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault)

3. **CORS Configuration**
   - Update the CORS origin in `server/src/index.ts` to match your production domain
   - Avoid using wildcard (`*`) origins in production

4. **Rate Limiting**
   - Consider adding rate limiting to the `/api/login` endpoint
   - Use packages like `express-rate-limit` to prevent brute force attacks

5. **Monitoring and Alerting**
   - Monitor for unusual login patterns
   - Set up alerts for authentication failures
   - Regular security audits of server logs

## Additional Security Considerations

### What This Application Does NOT Store:
- User passwords (never stored in memory longer than needed)
- Zwift credentials (only session cookies are retained)
- Login history or credential hashes

### What Users Should Know:
- Credentials are transmitted securely when HTTPS is properly configured
- Only temporary session cookies are stored for authenticated API requests
- Logging out clears all stored session data from the client

## Security Checklist for Deployment

- [ ] Valid SSL/TLS certificate installed and configured
- [ ] HTTPS enforced for all endpoints
- [ ] CORS properly configured for production domain
- [ ] Server logs reviewed to ensure no credential leakage
- [ ] Rate limiting configured on authentication endpoints
- [ ] Regular security updates for all dependencies
- [ ] Security headers verified using tools like [SecurityHeaders.com](https://securityheaders.com)

## Reporting Security Issues

If you discover a security vulnerability, please report it privately to the repository maintainers. Do not open public issues for security vulnerabilities.

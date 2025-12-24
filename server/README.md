# Zwift Race Data API Server

Backend API server for scraping Zwift race data without CORS restrictions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Health Check
- `GET /api/health`
- Returns server status

### Login to ZwiftPower
- `POST /api/login`
- Authenticates with ZwiftPower using Zwift credentials
- **Returns cookies** that should be used for subsequent authenticated requests
- Request body:
  ```json
  {
    "username": "your_zwift_username",
    "password": "your_zwift_password"
  }
  ```
- Response on success:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "cookies": ["cookie1=value1; Path=/; Domain=.zwiftpower.com", "cookie2=value2; ..."]
  }
  ```
- Response on failure:
  ```json
  {
    "success": false,
    "error": "Login failed",
    "message": "Invalid credentials or authentication error"
  }
  ```

### Get Riders in Race
- `GET /api/race/:raceId/riders`
- Returns list of Zwift IDs for riders in a race
- Optional: Include cookies in request header for authenticated access
  - Header: `X-Zwift-Cookies: ["cookie1", "cookie2", ...]` (JSON array as string)

### Get Public Activities
- `GET /api/rider/:zwiftId/activities`
- Returns list of public activity IDs for a rider
- Optional: Include cookies in request header for authenticated access
  - Header: `X-Zwift-Cookies: ["cookie1", "cookie2", ...]` (JSON array as string)

### Download FIT File
- `GET /api/activity/:activityId/fit`
- Downloads a FIT file for a specific activity
- Optional: Include cookies in request header for authenticated access
  - Header: `X-Zwift-Cookies: ["cookie1", "cookie2", ...]` (JSON array as string)

### Pull All FIT Files for Race
- `GET /api/race/:raceId/fit-files`
- Downloads all FIT files for all riders in a race
- Returns Base64-encoded data
- Optional: Include cookies in request header for authenticated access
  - Header: `X-Zwift-Cookies: ["cookie1", "cookie2", ...]` (JSON array as string)

## Authentication

The server now supports **per-request authentication** with ZwiftPower:

1. **Login**: Call `/api/login` with Zwift credentials to receive cookies
2. **Use cookies**: Include the returned cookies in the `X-Zwift-Cookies` header for subsequent requests that require authentication
3. **No shared state**: Each user's credentials are isolated - the server does not store cookies between requests

### Security Features

The authentication system implements several security best practices:

- **HTTPS with HSTS**: Server enforces HTTPS connections with HTTP Strict Transport Security headers
- **Helmet Security Headers**: Additional security headers protect against common vulnerabilities
- **"Hot Potato" Pattern**: Credentials are immediately used and nullified after authentication
- **Secure Logging**: The `/api/login` endpoint is excluded from request logs to prevent credential exposure
- **Sanitized Errors**: Error messages don't expose sensitive information

See [../SECURITY.md](../SECURITY.md) for comprehensive security documentation.

### Example Usage

```bash
# Step 1: Login and get cookies
COOKIES=$(curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.cookies | tostring')

# Step 2: Use cookies for authenticated request
curl http://localhost:3001/api/race/12345/riders \
  -H "X-Zwift-Cookies: $COOKIES"
```

**Benefits:**
- Each user maintains their own authentication
- No credential sharing between users
- Server remains stateless
- Cookies are managed by the client

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed origin for CORS requests (default: development Codespace URL)
  - In production, set this to your frontend URL: `https://your-frontend.example.com`

## Development

The server uses:
- Express for the API framework
- Helmet for security headers (HSTS, CSP, etc.)
- Morgan for request logging with sensitive endpoint filtering
- Axios for HTTP requests
- Cheerio for HTML parsing
- CORS middleware for cross-origin requests
- tough-cookie and axios-cookiejar-support for cookie management

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
- Stores cookies for subsequent authenticated requests
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
    "message": "Login successful"
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

### Get Public Activities
- `GET /api/rider/:zwiftId/activities`
- Returns list of public activity IDs for a rider

### Download FIT File
- `GET /api/activity/:activityId/fit`
- Downloads a FIT file for a specific activity

### Pull All FIT Files for Race
- `GET /api/race/:raceId/fit-files`
- Downloads all FIT files for all riders in a race
- Returns Base64-encoded data

## Authentication

The server now supports authentication with ZwiftPower. To access protected resources or non-public data:

1. Call the `/api/login` endpoint with your Zwift credentials
2. The server will authenticate with ZwiftPower and store the session cookies
3. Subsequent requests will use these stored cookies automatically

Note: Authentication persists for the lifetime of the server process. The cookies are stored in memory and will be lost when the server restarts.

## Environment Variables

- `PORT` - Server port (default: 3001)

## Development

The server uses:
- Express for the API framework
- Axios for HTTP requests
- Cheerio for HTML parsing
- CORS middleware for cross-origin requests
- tough-cookie and axios-cookiejar-support for cookie management

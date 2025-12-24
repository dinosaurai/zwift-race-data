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

## Environment Variables

- `PORT` - Server port (default: 3001)

## Development

The server uses:
- Express for the API framework
- Axios for HTTP requests
- Cheerio for HTML parsing
- CORS middleware for cross-origin requests

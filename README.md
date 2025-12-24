# zwift-race-data

View race data from yourself and other competitors. See how a race unfolded and what was happening at each point in time.

## Architecture

This project consists of two parts:

1. **Frontend**: React + TypeScript + Vite application for data visualization
2. **Backend API**: Node.js + Express server for scraping Zwift race data (avoids CORS issues)

## Development

### Quick Start (Run Both Frontend and Backend)

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
npm run server:install
```

3. Run both frontend and backend together:
```bash
npm run dev:all
```

This will start:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:3001`

### Run Frontend Only

```bash
npm run dev
```

### Run Backend Only

```bash
npm run dev:server
```

### Build for Production

Frontend:
```bash
npm run build
```

Backend:
```bash
npm run build:server
```

## API

The backend server provides endpoints for:
- Fetching riders in a race
- Getting public activities for a rider
- Downloading FIT files
- Pulling all FIT files for a race

See [server/README.md](server/README.md) for API documentation.

### Features

- **React Context**: Data is managed and shared across components using React Context
- **TypeScript**: Fully typed for better development experience
- **Interactive Charts**: Built with Recharts for responsive, interactive data visualization
- **Backend API**: Node.js server handles web scraping to avoid CORS restrictions
- **Three Sections**:
  - Introduction section explaining the purpose
  - Distance vs. Time chart
  - Distance vs. Power chart


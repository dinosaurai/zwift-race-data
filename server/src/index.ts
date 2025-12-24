import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZwiftRaceScraper } from './raceScraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Add helmet for security headers including HSTS
app.use(helmet({
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    }
}));

// Configure CORS with environment-based origin
const allowedOrigin = process.env.CORS_ORIGIN || 'https://orange-journey-5456xjpj6g7395p-5173.app.github.dev';
app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'x-zwift-cookies'
    ],
    credentials: true,
}));

app.use(express.json());

// Security: Configure logging to skip sensitive routes
app.use(morgan('combined', {
    skip: (req, res) => {
        // Skip logging for login endpoint to prevent credential exposure
        return req.path === '/api/login';
    }
}));


const scraper = new ZwiftRaceScraper();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Login to ZwiftPower
app.post('/api/login', async (req, res) => {
    // Security: Extract credentials and implement "hot potato" pattern
    let username: string | undefined;
    let password: string | undefined;
    
    try {
        // Extract credentials from request body
        username = req.body.username;
        password = req.body.password;
        
        // Security: Validate credentials are strings and have reasonable lengths
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Missing credentials',
                message: 'Username and password are required'
            });
        }
        
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ 
                error: 'Invalid credentials',
                message: 'Username and password must be strings'
            });
        }
        
        // Prevent extremely long inputs that could be attack vectors
        if (username.length > 255 || password.length > 255) {
            return res.status(400).json({ 
                error: 'Invalid credentials',
                message: 'Username and password are too long'
            });
        }

        // Security: Immediately pass credentials to login and nullify
        const loginScraper = new ZwiftRaceScraper();
        const cookies = await loginScraper.login(username, password);
        
        // Security: Nullify credentials immediately after use ("hot potato" pattern)
        username = undefined;
        password = undefined;
        
        if (cookies) {
            res.json({ 
                success: true, 
                message: 'Login successful',
                cookies: cookies
            });
        } else {
            res.status(401).json({ 
                success: false,
                error: 'Login failed',
                message: 'Invalid credentials or authentication error'
            });
        }
    } catch (error) {
        // Security: Ensure credentials are nullified even on error
        username = undefined;
        password = undefined;
        
        // Security: Log error without exposing sensitive data
        console.error('Error during login: Authentication failed');
        res.status(500).json({ 
            error: 'Login failed',
            message: 'An error occurred during authentication'
        });
    }
});

// Pull all FIT files for a race
app.get('/api/race/:raceId/fit-files', async (req, res) => {
    try {
        const { raceId } = req.params;
        const cookies = req.headers['x-zwift-cookies'] 
            ? JSON.parse(req.headers['x-zwift-cookies'] as string) 
            : undefined;
        const activities = await scraper.getRaceAnalysis(raceId, cookies);
        
        res.json({ activities: activities, count: activities.length });
    } catch (error) {
        console.error('Error pulling race FIT files:', error);
        res.status(500).json({ 
            error: 'Failed to pull race FIT files',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚴 Zwift Race Data API server running on http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import { ZwiftRaceScraper } from './raceScraper.js';

const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors({
    origin: 'https://orange-journey-5456xjpj6g7395p-5173.app.github.dev',
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


const scraper = new ZwiftRaceScraper();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Login to ZwiftPower
app.post('/api/login', async (req, res) => {
    try {
        console.log("Received login request");
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Missing credentials',
                message: 'Username and password are required'
            });
        }

        // Create a new scraper instance for this login
        const loginScraper = new ZwiftRaceScraper();
        const cookies = await loginScraper.login(username, password);
        
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
        console.error('Error during login:', error);
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

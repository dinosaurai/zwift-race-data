import express from 'express';
import cors from 'cors';
import { ZwiftRaceScraper } from './raceScraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204
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
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Missing credentials',
                message: 'Username and password are required'
            });
        }

        const success = await scraper.login(username, password);
        
        if (success) {
            res.json({ success: true, message: 'Login successful' });
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
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get riders in a race
app.get('/api/race/:raceId/riders', async (req, res) => {
    try {
        const { raceId } = req.params;
        const riders = await scraper.getRidersInRace(raceId);
        res.json({ riders });
    } catch (error) {
        console.error('Error fetching riders:', error);
        res.status(500).json({ 
            error: 'Failed to fetch riders',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get public activities for a Zwift ID
app.get('/api/rider/:zwiftId/activities', async (req, res) => {
    try {
        const { zwiftId } = req.params;
        const activities = await scraper.getPublicActivities(zwiftId);
        res.json({ activities });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ 
            error: 'Failed to fetch activities',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Download FIT file for an activity
app.get('/api/activity/:activityId/fit', async (req, res) => {
    try {
        const { activityId } = req.params;
        const data = await scraper.downloadFit(activityId);
        
        if (!data) {
            return res.status(404).json({ error: 'FIT file not found or not accessible' });
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="activity_${activityId}.fit"`);
        res.send(Buffer.from(data));
    } catch (error) {
        console.error('Error downloading FIT file:', error);
        res.status(500).json({ 
            error: 'Failed to download FIT file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Pull all FIT files for a race
app.get('/api/race/:raceId/fit-files', async (req, res) => {
    try {
        const { raceId } = req.params;
        const fitFiles = await scraper.pullRaceFitFiles(raceId);
        
        // Convert ArrayBuffers to Base64 for JSON transmission
        const serializedFiles = fitFiles.map(file => ({
            activityId: file.activityId,
            zwiftId: file.zwiftId,
            data: Buffer.from(file.data).toString('base64')
        }));
        
        res.json({ fitFiles: serializedFiles, count: serializedFiles.length });
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

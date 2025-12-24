import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FitFileData {
    activityId: string;
    zwiftId: string;
    data: string; // Base64 encoded
}

export interface RaceFitFilesResponse {
    fitFiles: FitFileData[];
    count: number;
}

export interface RidersResponse {
    riders: string[];
}

export interface ActivitiesResponse {
    activities: string[];
}

export class ZwiftRaceApiClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /** Fetch Zwift IDs of riders in a given ZwiftPower race */
    public async getRidersInRace(raceId: string): Promise<string[]> {
        const response = await axios.get<RidersResponse>(
            `${this.baseURL}/api/race/${raceId}/riders`
        );
        return response.data.riders;
    }

    /** Fetch public Zwift activity IDs from a ZwiftPower profile page */
    public async getPublicActivities(zwiftId: string): Promise<string[]> {
        const response = await axios.get<ActivitiesResponse>(
            `${this.baseURL}/api/rider/${zwiftId}/activities`
        );
        return response.data.activities;
    }

    /** Download a FIT file for an activity (public activities only) */
    public async downloadFit(activityId: string): Promise<ArrayBuffer | null> {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/activity/${activityId}/fit`,
                { responseType: 'arraybuffer' }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /** Main function: download all public FIT files for all riders in a race */
    public async pullRaceFitFiles(raceId: string): Promise<FitFileData[]> {
        const response = await axios.get<RaceFitFilesResponse>(
            `${this.baseURL}/api/race/${raceId}/fit-files`
        );
        return response.data.fitFiles;
    }

    /** Check if the API server is running */
    public async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseURL}/api/health`);
            return response.data.status === 'ok';
        } catch {
            return false;
        }
    }
}

export const apiClient = new ZwiftRaceApiClient();

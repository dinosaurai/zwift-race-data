import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface FitFileData {
    activityId: string;
    zwiftId: string;
    data: string; // Base64 encoded
}

export interface DatasetItem {
    unit: string;
    yData: number[];
}

export interface ActivityData {
    age: string;
    category: string;
    datasets: DatasetItem[];
    flag: string;
    ftp: number;
    name: string;
    vars: { start: number };
    weight: number;
    x2Data: number[]; // time in seconds
    xData: number[]; // distance in km
    zwiftId: string;
}

export interface RaceFitFilesResponse {
    fitFiles: FitFileData[];
    count: number;
    activities: ActivityData[];
}

export interface RidersResponse {
    riders: string[];
}

export interface ActivitiesResponse {
    activities: string[];
}

export interface LoginResponse {
    success: boolean;
    message: string;
    cookies?: string[];
    error?: string;
}

export class ZwiftRaceApiClient {
    private baseURL: string;
    private cookies: string[] | null = null;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /** Login to ZwiftPower and store cookies for subsequent requests */
    public async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axios.post<LoginResponse>(
                `${this.baseURL}/api/login`,
                { username, password },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // This ensures the browser handles cross-origin cookies/auth if needed
                    withCredentials: true 
                }
            );
            
            if (response.data.success && response.data.cookies) {
                this.cookies = response.data.cookies;
                return { success: true, message: response.data.message };
            }
            
            return { success: false, message: response.data.message || 'Login failed' };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                return { 
                    success: false, 
                    message: error.response.data.message || 'Login failed' 
                };
            }
            return { success: false, message: 'Network error occurred' };
        }
    }

    /** Logout and clear stored cookies */
    public logout(): void {
        this.cookies = null;
    }

    /** Check if user is logged in */
    public isLoggedIn(): boolean {
        return this.cookies !== null && this.cookies.length > 0;
    }

    /** Get headers with cookies if available */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        if (this.cookies && this.cookies.length > 0) {
            headers['x-zwift-cookies'] = JSON.stringify(this.cookies);
        }
        return headers;
    }

    /** Fetch Zwift IDs of riders in a given ZwiftPower race */
    public async getRidersInRace(raceId: string): Promise<string[]> {
        const response = await axios.get<RidersResponse>(
            `${this.baseURL}/api/race/${raceId}/riders`,
            { headers: this.getHeaders() }
        );
        return response.data.riders;
    }

    /** Fetch public Zwift activity IDs from a ZwiftPower profile page */
    public async getPublicActivities(zwiftId: string): Promise<string[]> {
        const response = await axios.get<ActivitiesResponse>(
            `${this.baseURL}/api/rider/${zwiftId}/activities`,
            { headers: this.getHeaders() }
        );
        return response.data.activities;
    }

    /** Download a FIT file for an activity (public activities only) */
    public async downloadFit(activityId: string): Promise<ArrayBuffer | null> {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/activity/${activityId}/fit`,
                { 
                    responseType: 'arraybuffer',
                    headers: this.getHeaders()
                }
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
    public async pullRaceFitFiles(raceId: string): Promise<ActivityData[]> {
        const response = await axios.get<RaceFitFilesResponse>(
            `${this.baseURL}/api/race/${raceId}/fit-files`,
            { headers: this.getHeaders() }
        );
        return response.data.activities;
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

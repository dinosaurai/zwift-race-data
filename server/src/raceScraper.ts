import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

export interface FitFileData {
    activityId: string;
    zwiftId: string;
    data: ArrayBuffer;
}

export class ZwiftRaceScraper {
    private static ZP_EVENT_URL = "https://zwiftpower.com/events.php?zid={race_id}";
    private static ZP_PROFILE_URL = "https://zwiftpower.com/profile.php?z={zwift_id}";
    private static ZWIFT_ACTIVITY_URL = "https://www.zwift.com/activity/{activity_id}/files/activity.fit";
    private static ZP_LOGIN_URL = "https://zwiftpower.com/ucp.php?mode=login";
    private static ZWIFT_AUTH_URL = "https://secure.zwift.com/auth/rb_bf03895d94";

    private cookieJar: CookieJar;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.cookieJar = new CookieJar();
        this.axiosInstance = wrapper(axios.create({
            jar: this.cookieJar,
            withCredentials: true,
        }));
    }

    /**
     * Login to ZwiftPower using username and password
     * This will authenticate with Zwift and set the necessary cookies
     * for subsequent requests to ZwiftPower
     */
    public async login(username: string, password: string): Promise<boolean> {
        try {
            console.log('Attempting to login to ZwiftPower...');

            // Step 1: Get the login page to initialize session
            const loginPageResponse = await this.axiosInstance.get(ZwiftRaceScraper.ZP_LOGIN_URL, {
                maxRedirects: 5,
                validateStatus: () => true,
            });

            console.log('Login page status:', loginPageResponse.status);

            // Step 2: Submit credentials to Zwift authentication
            // ZwiftPower uses OAuth SSO with Zwift, so we need to authenticate with Zwift
            const authResponse = await this.axiosInstance.post(
                ZwiftRaceScraper.ZWIFT_AUTH_URL,
                new URLSearchParams({
                    username: username,
                    password: password,
                    remember_me: 'on',
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                    maxRedirects: 5,
                    validateStatus: () => true,
                }
            );

            console.log('Auth response status:', authResponse.status);

            // Check if we have cookies set
            const cookies = await this.cookieJar.getCookies('https://zwiftpower.com');
            console.log('Cookies after login:', cookies.length);

            if (cookies.length > 0) {
                console.log('Login successful!');
                return true;
            }

            console.warn('Login may have failed - no cookies set');
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    /** Fetch Zwift IDs of riders in a given ZwiftPower race */
    public async getRidersInRace(raceId: string): Promise<string[]> {
        const url = ZwiftRaceScraper.ZP_EVENT_URL.replace("{race_id}", raceId);
        const response = await this.axiosInstance.get(url);
        const $ = cheerio.load(response.data);

        const riders = new Set<string>();

        console.log(`Parsing riders from race page ${url}...`);

        $("a[href*='profile.php?z=']").each((_, el) => {
            console.log('Found rider link:', $(el).attr("href"));
            const href = $(el).attr("href");
            const match = href?.match(/z=(\d+)/);
            if (match) riders.add(match[1]);
        });

        return Array.from(riders);
    }

    /** Fetch public Zwift activity IDs from a ZwiftPower profile page */
    public async getPublicActivities(zwiftId: string): Promise<string[]> {
        const url = ZwiftRaceScraper.ZP_PROFILE_URL.replace("{zwift_id}", zwiftId);
        const response = await this.axiosInstance.get(url);
        const $ = cheerio.load(response.data);

        const activities = new Set<string>();

        $("a[href*='zwift.com/activity/']").each((_, el) => {
            const href = $(el).attr("href");
            const match = href?.match(/activity\/(\d+)/);
            if (match) activities.add(match[1]);
        });

        return Array.from(activities);
    }

    /** Download a FIT file for an activity (public activities only) */
    public async downloadFit(activityId: string): Promise<ArrayBuffer | null> {
        const url = ZwiftRaceScraper.ZWIFT_ACTIVITY_URL.replace("{activity_id}", activityId);

        try {
            const response = await this.axiosInstance.get(url, {
                responseType: "arraybuffer",
                validateStatus: () => true
            });

            if (
                response.status === 200 &&
                String(response.headers["content-type"]).includes("application")
            ) {
                console.log(`Downloaded FIT file for activity ${activityId}`);
                return response.data;
            }

            console.warn(`Failed to download FIT for ${activityId} (status=${response.status})`);
            return null;
        } catch (err) {
            console.error(`Error downloading activity ${activityId}:`, err);
            return null;
        }
    }

    /** Main function: download all public FIT files for all riders in a race */
    public async pullRaceFitFiles(raceId: string): Promise<FitFileData[]> {
        console.log(`Fetching riders for race ${raceId}...`);
        const riders = await this.getRidersInRace(raceId);

        console.log(`Found ${riders.length} riders.\n`);

        const fitFiles: FitFileData[] = [];

        for (const rid of riders) {
            console.log(`Processing rider ${rid}...`);
            const activities = await this.getPublicActivities(rid);

            if (!activities.length) {
                console.log(` No public activities for rider ${rid}.`);
                continue;
            }

            console.log(` Found ${activities.length} public activities.`);

            for (const act of activities) {
                const data = await this.downloadFit(act);
                if (data) {
                    fitFiles.push({
                        activityId: act,
                        zwiftId: rid,
                        data
                    });
                }
            }
        }

        console.log(`\nTotal FIT files downloaded: ${fitFiles.length}`);
        return fitFiles;
    }
}

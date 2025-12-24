import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

export interface RiderData {
    zwiftId: string;
    name: string;
    category?: string;
    weight?: number;
    ftp?: number;
    flag?: string;
    age?: string;
}

export class ZwiftRaceScraper {
    private static ZP_RESULTS_JSON_URL = "https://zwiftpower.com/cache3/results/{race_id}_zwift.json";
    private static ZP_VIEW_JSON_URL = "https://zwiftpower.com/cache3/results/{race_id}_view.json";
    private static ZP_ANALYSIS_URL = "https://zwiftpower.com/api3.php?do=analysis&zwift_id={zwift_id}&zwift_event_id={race_id}";
    private static ZP_LOGIN_URL = "https://zwiftpower.com/ucp.php?mode=login&login=external&oauth_service=oauthzpsso";
    private static USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
     * Returns cookies that can be used for subsequent authenticated requests
     * Security: Implements "hot potato" pattern - credentials are used immediately and not stored
     */
    public async login(username: string, password: string): Promise<string[] | null> {
        try {
            // Security: Using credentials immediately without logging or storing them
            console.log('Attempting to login to ZwiftPower via Zwift OAuth...');

            // Step 1: Start OAuth flow - this will redirect to Zwift's login page
            const oauthInitResponse = await this.axiosInstance.get(ZwiftRaceScraper.ZP_LOGIN_URL, {
                headers: {
                    'User-Agent': ZwiftRaceScraper.USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                },
                maxRedirects: 10, // Follow redirects to Zwift's login page
                validateStatus: () => true,
            });

            console.log('OAuth init status:', oauthInitResponse.status);
            console.log('OAuth URL:', oauthInitResponse.request?.res?.responseUrl || oauthInitResponse.config.url);

            // Step 2: Parse the Zwift login page to get the form action URL
            const $ = cheerio.load(oauthInitResponse.data);
            const formAction = $('form.zwift-form').attr('action');
            
            if (!formAction) {
                console.error('Could not find login form action. Response may not be the login page.');
                // Log the page content snippet for debugging
                console.log('Page title:', $('title').text());
                console.log('Forms found:', $('form').length);
                return null;
            }

            console.log('Found login form, submitting credentials...');

            // Security: Submit credentials immediately using URLSearchParams
            // Credentials are passed directly without storing in variables
            const loginData = new URLSearchParams({
                username: username,
                password: password,
                credentialId: '',
            });

            const loginResponse = await this.axiosInstance.post(
                formAction,
                loginData,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': ZwiftRaceScraper.USER_AGENT,
                        'Referer': oauthInitResponse.request?.res?.responseUrl || ZwiftRaceScraper.ZP_LOGIN_URL,
                    },
                    maxRedirects: 10, // Follow redirects back to ZwiftPower
                    validateStatus: () => true,
                }
            );

            console.log('Login response status:', loginResponse.status);

            // Step 4: Check for login errors
            const $response = cheerio.load(loginResponse.data);
            const hasError = $response('.kc-feedback-text').length > 0 || 
                           $response('.alert-error').length > 0 ||
                           loginResponse.data.includes('Invalid username or password');

            if (hasError) {
                const errorText = $response('.kc-feedback-text').text() || 'Invalid username or password';
                console.error('Login error:', errorText);
                return null;
            }

            // Step 5: Get all cookies from both domains
            const zpCookies = await this.cookieJar.getCookies('https://zwiftpower.com');
            const zwiftCookies = await this.cookieJar.getCookies('https://secure.zwift.com');
            
            console.log('ZwiftPower cookies:', zpCookies.map(c => c.key));
            console.log('Zwift cookies:', zwiftCookies.map(c => c.key));
            
            const hasZPAuthCookies = zpCookies.some(cookie => 
                cookie.key.toLowerCase().includes('session') || 
                cookie.key.toLowerCase().includes('phpbb') ||
                cookie.key.includes('bb_') ||
                cookie.key.toLowerCase().includes('sid')
            );

            const hasZwiftAuthCookies = zwiftCookies.some(cookie =>
                cookie.key.toLowerCase().includes('keycloak') ||
                cookie.key.toLowerCase().includes('auth')
            );

            console.log('Has ZwiftPower auth cookies:', hasZPAuthCookies);
            console.log('Has Zwift auth cookies:', hasZwiftAuthCookies);

            if (hasZPAuthCookies || hasZwiftAuthCookies) {
                console.log('Login successful!');
                // Return all cookies from both domains
                const allCookies = [...zpCookies, ...zwiftCookies];
                return allCookies.map(cookie => cookie.toString());
            }

            console.warn('Login may have failed - no authentication cookies found');
            return null;
        } catch (error) {
            console.error('Login error:', error);
            if (axios.isAxiosError(error)) {
                console.error('Axios error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                });
            }
            return null;
        }
    }

    /**
     * Create an axios instance with optional cookies
     */
    private async createAxiosInstance(cookies?: string[]): Promise<AxiosInstance> {
        if (cookies && cookies.length > 0) {
            const tempJar = new CookieJar();
            const tempInstance = wrapper(axios.create({
                jar: tempJar,
                withCredentials: true,
            }));
            
            for (const cookieStr of cookies) {
                // Set cookies for both ZwiftPower and Zwift domains
                try {
                    if (cookieStr.includes('zwiftpower.com') || cookieStr.includes('Domain=.zwiftpower.com')) {
                        await tempJar.setCookie(cookieStr, 'https://zwiftpower.com');
                    } else if (cookieStr.includes('zwift.com')) {
                        await tempJar.setCookie(cookieStr, 'https://secure.zwift.com');
                    } else {
                        // Try ZwiftPower domain as default
                        await tempJar.setCookie(cookieStr, 'https://zwiftpower.com');
                    }
                } catch (err) {
                    console.warn('Failed to set cookie:', cookieStr.substring(0, 50), err);
                }
            }
            
            return tempInstance;
        }
        return this.axiosInstance;
    }

    /**
     * Helper method to handle 429 rate limit errors with exponential backoff retry
     */
    private async retryOnRateLimit<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        initialDelayMs: number = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 429) {
                    if (attempt < maxRetries) {
                        const delayMs = initialDelayMs * Math.pow(2, attempt);
                        console.warn(`Rate limited (429). Retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                        lastError = error;
                        continue;
                    }
                }
                throw error;
            }
        }
        
        throw lastError;
    }

    /** Fetch Zwift IDs and names of riders in a given ZwiftPower race */
    public async getRidersInRace(raceId: string, cookies?: string[]): Promise<RiderData[]> {
        const instance = await this.createAxiosInstance(cookies);
        const zwiftUrl = ZwiftRaceScraper.ZP_RESULTS_JSON_URL.replace("{race_id}", raceId);
        const viewUrl = ZwiftRaceScraper.ZP_VIEW_JSON_URL.replace("{race_id}", raceId);
        
        console.log(`Fetching race results from JSON API: ${zwiftUrl}...`);
        const zwiftResponse = await this.retryOnRateLimit(() => instance.get(zwiftUrl));
        
        if (!zwiftResponse.data || !zwiftResponse.data.data) {
            console.warn('Invalid response format from zwift JSON API');
            return [];
        }
        
        // Also fetch the view JSON for additional data like category
        console.log(`Fetching view data from JSON API: ${viewUrl}...`);
        let viewData: any[] = [];
        try {
            const viewResponse = await this.retryOnRateLimit(() => instance.get(viewUrl));
            viewData = viewResponse.data?.data || [];
        } catch (viewError) {
            console.warn('Could not fetch view data, continuing with basic data only');
        }
        
        // Create a map of view data by zwid for quick lookup
        const viewDataMap = new Map<string, any>();
        for (const rider of viewData) {
            if (rider.zwid) {
                viewDataMap.set(String(rider.zwid), rider);
            }
        }
        
        const riders: RiderData[] = [];
        const seenIds = new Set<string>();
        
        // Extract zwid and name from each rider entry, merge with view data
        for (const rider of zwiftResponse.data.data) {
            if (rider.zwid && !seenIds.has(rider.zwid)) {
                const viewInfo = viewDataMap.get(String(rider.zwid));
                const weight = viewInfo?.weight && Array.isArray(viewInfo.weight) 
                    ? parseFloat(viewInfo.weight[0]) 
                    : undefined;
                const ftp = viewInfo?.ftp ? parseInt(viewInfo.ftp) : undefined;
                
                riders.push({
                    zwiftId: rider.zwid,
                    name: rider.name ? rider.name.trim() : `Rider ${rider.zwid}`,
                    category: viewInfo?.category || undefined,
                    weight: !isNaN(weight as any) ? weight : undefined,
                    ftp: !isNaN(ftp as any) ? ftp : undefined,
                    flag: viewInfo?.flag || undefined,
                    age: viewInfo?.age || undefined
                });
                seenIds.add(rider.zwid);
            }
        }
        
        console.log(`Found ${riders.length} riders in race ${raceId}`);
        return riders;
    }

    /** Fetch activity analysis data for a rider in a specific race */
    public async getActivityAnalysis(zwiftId: string, raceId: string, cookies?: string[]): Promise<any> {
        const instance = await this.createAxiosInstance(cookies);
        const url = ZwiftRaceScraper.ZP_ANALYSIS_URL
            .replace("{zwift_id}", zwiftId)
            .replace("{race_id}", raceId);

        try {
            console.log(`Fetching activity analysis for rider ${zwiftId} in race ${raceId}...`);
            const response = await this.retryOnRateLimit(() => instance.get(url));
            
            if (response.data) {
                return response.data;
            }
            
            console.warn(`No data returned for rider ${zwiftId} in race ${raceId}`);
            return null;
        } catch (error) {
            console.error(`Error fetching activity analysis for rider ${zwiftId}:`, error);
            return null;
        }
    }

    /** Main function: get activity analysis data for all riders in a race */
    public async getRaceAnalysis(raceId: string, cookies?: string[]): Promise<any[]> {
        console.log(`Fetching riders for race ${raceId}...`);
        const riders = await this.getRidersInRace(raceId, cookies);

        console.log(`Found ${riders.length} riders.\n`);

        const analysisData: any[] = [];

        for (const rider of riders) {
            console.log(`Processing rider ${rider.name} (${rider.zwiftId})...`);
            const analysis = await this.getActivityAnalysis(rider.zwiftId, raceId, cookies);

            if (analysis) {
                analysisData.push({
                    ...analysis,
                    ...rider,
                });
                console.log(`  ✓ Got analysis data for ${rider.name}`);
            } else {
                console.log(`  ✗ No analysis data for ${rider.name}`);
            }
        }

        console.log(`\nTotal riders with analysis data: ${analysisData.length}`);
        return analysisData;
    }
}

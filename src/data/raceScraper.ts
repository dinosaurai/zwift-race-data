import axios from "axios";
import * as cheerio from "cheerio";

export interface FitFileData {
    activityId: string;
    zwiftId: string;
    data: ArrayBuffer;
}

export class ZwiftRaceScraper {
    private static ZP_EVENT_URL = "https://zwiftpower.com/events.php?zid={race_id}";
    private static ZP_PROFILE_URL = "https://zwiftpower.com/profile.php?z={zwift_id}";
    private static ZWIFT_ACTIVITY_URL = "https://www.zwift.com/activity/{activity_id}/files/activity.fit";

    constructor() {}

    /** Fetch Zwift IDs of riders in a given ZwiftPower race */
    public async getRidersInRace(raceId: string): Promise<string[]> {
        const url = ZwiftRaceScraper.ZP_EVENT_URL.replace("{race_id}", raceId);
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const riders = new Set<string>();

        $("a[href*='profile.php?z=']").each((_, el) => {
            const href = $(el).attr("href");
            const match = href?.match(/z=(\d+)/);
            if (match) riders.add(match[1]);
        });

        return Array.from(riders);
    }

    /** Fetch public Zwift activity IDs from a ZwiftPower profile page */
    public async getPublicActivities(zwiftId: string): Promise<string[]> {
        const url = ZwiftRaceScraper.ZP_PROFILE_URL.replace("{zwift_id}", zwiftId);
        const response = await axios.get(url);
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
            const response = await axios.get(url, {
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
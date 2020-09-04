import mongoose from "mongoose";
import { SummonerStats, getSummonerStats } from "../processing/stat";
import { rankInfo, divisions } from "../processing/player";
import { Replay } from "./Replay";

const epsilon = 0.0000000001;

// only use number based stats
const cacheStats: (Array<keyof SummonerStats>) = [
    "games",
    "winrate",
    "kda",
    "averageKills",
    "averageDeaths",
    "averageAssists",
    "averageVisionScore",
    "averageCsPerMinute",
    "averageDamageShare",
    "averageKillParticipation",
    "wins",
    "losses",
    "pentaKills"
];

// stats that are bad to have a high number
const inverseCacheStats: (Array<keyof SummonerStats>) = [
    "averageDeaths",
    "losses"
];

interface RankResult {
    rank: number;
    total: number;
    percentile: number;
}

export type StatCacheDocument = mongoose.Document & {
    // mode/stat
    modeStat: string;
    // map of summoner name to rank
    lookup: Map<string, number>;
    ranks: Map<string, RankResult>;

    getMode: () => string;
    getStat: () => string;
    invalidate: (names: string[]) => void;
    recalculateRanks: () => void;
};

const statCacheSchema = new mongoose.Schema({
    modeStat: { type: String, unique: true, required: true },
    lookup: { type: Map, required: true },
    ranks: { type: Map, required: true }
}, { timestamps: true });

statCacheSchema.methods.getMode = function (this: StatCacheDocument) {
    return this.modeStat.split("/")[0];
};

statCacheSchema.methods.getStat = function (this: StatCacheDocument) {
    return this.modeStat.split("/")[1];
};

function percentile(rank: number, total: number) {
    if (total <= 1) {
        return 1.0;
    }
    else {
        return rank / (total - 1);
    }
}

statCacheSchema.methods.recalculateRanks = function (this: StatCacheDocument) {
    const arr = Array.from(this.lookup);
    const strcmp = (as: string, bs: string) => {
        if (as < bs) {
            return -1;
        }
        if (as > bs) {
            return 1;
        }
        return 0;
    };
    arr.sort((a, b) => {
        const c1 = a[1] - b[1];
        if (c1 === 0) {
            return strcmp(a[0], b[0]);
        }
        else {
            return c1;
        }
    });
    for (let i = 0; i < arr.length; i++) {
        let highest = i;
        const [name, value] = arr[i];
        for (let j = i + 1; j < arr.length; j++) {
            const newValue = arr[j][1];
            if (Math.abs(value - newValue) < epsilon) {
                highest = j;
            }
        }
        this.ranks.set(name, {
            rank: highest,
            total: arr.length,
            percentile: percentile(highest, arr.length)
        });
    }
};

export const StatCache = mongoose.model<StatCacheDocument>("StatCache", statCacheSchema);

function makeModeStat(mode: string, stat: string) {
    return `${mode}/${stat}`;
}

export const statCacheUpdater = async function (mode: string, summoners: string[]) {
    return new Promise<void>((resolve, reject) => {
        Replay.find({ mode: mode }, async (err, replays) => {
            if (err) {
                reject(err);
                return;
            }
            const statCacheMap = new Map<string, StatCacheDocument>();
            for (const stat of cacheStats) {
                const statCache = await new Promise<StatCacheDocument>((resolve, reject) => {
                    const modeStat = makeModeStat(mode, stat);
                    StatCache.findOne({ modeStat: modeStat }, (err, statCache) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!statCache) {
                            statCache = new StatCache({
                                modeStat: modeStat,
                                lookup: new Map<string, number>(),
                                ranks: new Map<string, RankResult>()
                            });
                        }
                        resolve(statCache);
                    });
                });
                statCacheMap.set(stat, statCache);
            }
            for (const summoner of summoners) {
                const stats = await getSummonerStats(replays, summoner);
                if (stats) {
                    for (const stat of cacheStats) {
                        const statCache = statCacheMap.get(stat) as StatCacheDocument;
                        statCache.lookup.set(summoner, stats[stat] as number);
                    }
                }
            }
            const promises: Array<Promise<void>> = [];
            for (const statCache of statCacheMap.values()) {
                const promise = new Promise<void>((resolve, reject) => {
                    statCache.recalculateRanks();
                    statCache.save((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
                promises.push(promise);
            }
            await Promise.all(promises);
            resolve();
        });
    });
};

export const getSummonerRanks = async (summonerName: string, mode: string) => {
    const map = new Map<keyof SummonerStats, RankResult>();
    for (const stat of cacheStats) {
        const modeStat = makeModeStat(mode, stat);
        const rankResult = await new Promise<RankResult | undefined>((resolve, reject) => {
            StatCache.findOne({ modeStat: modeStat }, (err, statCache) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!statCache) {
                    resolve();
                    return;
                }
                resolve(statCache.ranks.get(summonerName));
            });
        });
        if (rankResult) {
            map.set(stat, rankResult);
        }
    }
    return map;
};

export const percentileRankData = (percentile: number) => {
    const processTextIcon = (rank: [keyof typeof rankInfo, number]) => {
        const [tier, division] = rank;
        const divisionText = ["", " I", " II", " III", " IV"];
        return {
            text: `${rankInfo[tier].text}${divisionText[division]}`,
            icon: rankInfo[tier].icon
        };
    };
    for (const division of divisions) {
        if (percentile >= division[1] - epsilon) {
            return processTextIcon(division[0]);
        }
    }
    return processTextIcon(["unranked", 0]);
};

export const formatRankObject = (ranks: { [key: string]: RankResult }) => {
    const output: {
        [key: string]: {
            percentile: number;
            tooltip: string;
            formatted: string;
            formattedRight: string;
            icon?: number;
        };
    } = {};
    for (const stat of cacheStats) {
        if (ranks[stat] === undefined) {
            output[stat] = {
                percentile: 0,
                tooltip: "",
                formatted: "",
                formattedRight: ""
            };
        }
        else {
            const percentile = ranks[stat].percentile;
            const rank = ranks[stat].rank;
            const total = ranks[stat].total;
            let headingText;
            if (percentile >= 1 - epsilon) {
                headingText = "Highest";
            }
            // else if (percentile >= 0.5 - epsilon) {
            //     headingText = `Top ${((1 - percentile) * 100).toFixed(0)}%`;
            // }
            else if (percentile > 0 + epsilon) {
                const th = (num: number) => {
                    if (num === 11 || num === 12 || num === 13) {
                        return "th";
                    }
                    else if (num % 10 === 1) {
                        return "st";
                    }
                    else if (num % 10 === 2) {
                        return "nd";
                    }
                    else {
                        return "th";
                    }
                };
                const num = Math.floor(percentile * 100);
                headingText = `${num}${th(num)} percentile`;
            }
            else {
                headingText = "Lowest";
            }
            let rankPercentile = percentile;
            if (inverseCacheStats.includes(stat)) {
                rankPercentile = 1 - percentile;
            }
            const data = percentileRankData(rankPercentile);
            output[stat] = {
                percentile: percentile * 100,
                tooltip: `${total - rank}/${total}`,
                formatted: headingText,
                formattedRight: `${data.text}`,
                icon: data.icon
            };
        }
    }
    return output;
};
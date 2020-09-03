import { ReplayDocument } from "../models/Replay";
import { Metadata } from "./data";
import { extractPlayerBySummonerName, extractTeamFromPlayer, getRankInfo } from "./player";

interface PartialSummonerStats {
    summoner: string;
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
    assists: number;
    totalVisionScore: number;
    pentaKills: number;
    totalCsPerMinute: number;
    totalDamageShare: number;
    totalKillParticipation: number;
}

async function emptyPartialSummonerStats(): Promise<PartialSummonerStats> {
    return {
        summoner: "",
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        totalVisionScore: 0,
        pentaKills: 0,
        totalCsPerMinute: 0,
        totalDamageShare: 0,
        totalKillParticipation: 0
    };
}

export interface SummonerStats extends PartialSummonerStats {
    games: number;
    winrate: number;
    averageKills: number;
    averageDeaths: number;
    averageAssists: number;
    averageVisionScore: number;
    averageCsPerMinute: number;
    averageDamageShare: number;
    averageKillParticipation: number;
    // float infinity if zero deaths
    kda: number;
    icon: number;
    rankText: string;
}

async function loadMetadataAsync(replay: ReplayDocument) {
    return new Promise<Metadata>((resolve, reject) => {
        replay.loadMetadata((err, metadata) => {
            if (err) {
                return reject(err);
            }
            return resolve(metadata);
        });
    });
}

// Returns undefined if no games played
export async function getSummonerStats(replays: ReplayDocument[], summoner: string): Promise<SummonerStats | undefined> {
    const full = await replays.reduce(async (accum, curr) => {
        const metadata = await loadMetadataAsync(curr);
        const playerData = extractPlayerBySummonerName(metadata, summoner);
        if (!playerData) {
            return accum;
        }
        const teamData = extractTeamFromPlayer(metadata, playerData);
        const teamTotalDamageToChampions = teamData.reduce((accum, curr) => {
            return accum + curr.totalDamageToChampions;
        }, 0);
        const teamTotalKills = teamData.reduce((accum, curr) => {
            return accum + curr.kills;
        }, 0);
        const gameLengthInMillis = metadata.gameDuration;
        const gameLengthInMinutes = gameLengthInMillis / 60000.0;
        const old = await accum;
        const partial: PartialSummonerStats = {
            summoner: playerData.summonerName,
            wins: old.wins + (playerData.win ? 1 : 0),
            losses: old.losses + (playerData.win ? 0 : 1),
            kills: old.kills + playerData.kills,
            deaths: old.deaths + playerData.deaths,
            assists: old.assists + playerData.assists,
            totalVisionScore: old.totalVisionScore + playerData.visionScore,
            pentaKills: old.pentaKills + playerData.pentaKills,
            totalCsPerMinute: old.totalCsPerMinute + (playerData.cs / gameLengthInMinutes),
            totalDamageShare: old.totalDamageShare + (playerData.totalDamageToChampions / teamTotalDamageToChampions),
            totalKillParticipation: old.totalKillParticipation + ((playerData.kills + playerData.assists) / teamTotalKills)
        };
        return partial;
    }, emptyPartialSummonerStats());
    const games = full.wins + full.losses;
    if (games === 0) {
        return undefined;
    }
    const rank = "unranked";
    const rankInfo = getRankInfo(rank);
    const rest = {
        games: games,
        winrate: full.wins / games,
        kda: (full.kills + full.assists) / (full.deaths),
        averageKills: full.kills / games,
        averageDeaths: full.deaths / games,
        averageAssists: full.assists / games,
        averageVisionScore: full.totalVisionScore / games,
        averageCsPerMinute: full.totalCsPerMinute / games,
        averageDamageShare: full.totalDamageShare / games,
        averageKillParticipation: full.totalKillParticipation / games,
        icon: rankInfo.icon,
        rankText: rankInfo.text
    };
    const complete: SummonerStats = { ...full, ...rest };
    return complete;
}
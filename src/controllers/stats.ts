import { Request, Response } from "express";
import { Replay, ReplayDocument } from "../models/Replay";
import { HookNextFunction } from "mongoose";
import { Metadata } from "../processing/data";
import { extractPlayerBySummonerName, extractTeamFromPlayer } from "../processing/player";


export const getStats = (req: Request, res: Response) => {
    res.render("stats", {
        title: "Inhouse Stats",
    });
};

export const postStats = (req: Request, res: Response) => {
    const gameMode = encodeURIComponent(req.body.mode);
    const summonerName = encodeURIComponent(req.body.summonerName);
    res.redirect(`/stats/${gameMode}/summoner/${summonerName}`);
};


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

interface SummonerStats extends PartialSummonerStats {
    games: number;
    winrate: number;
    averageKills: number;
    averageDeaths: number;
    averageAssists: number;
    averageVisionScore: number;
    averageCsPerMinute: number;
    averageDamageShare: number;
    averageKillParticipation: number;
    // float, undefined if 0 deaths
    kda: number | undefined;
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
async function getSummonerStats(replays: ReplayDocument[], summoner: string): Promise<SummonerStats | undefined> {
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
    let kda: number | undefined;
    if (full.deaths !== 0) {
        kda = (full.kills + full.assists) / (full.deaths);
    }
    const rest = {
        games: games,
        winrate: full.wins / games,
        kda: kda,
        averageKills: full.kills / games,
        averageDeaths: full.deaths / games,
        averageAssists: full.assists / games,
        averageVisionScore: full.totalVisionScore / games,
        averageCsPerMinute: full.totalCsPerMinute / games,
        averageDamageShare: full.totalDamageShare / games,
        averageKillParticipation: full.totalKillParticipation / games
    };
    const complete: SummonerStats = { ...full, ...rest };
    return complete;
}

export const getSummoner = (req: Request, res: Response, next: HookNextFunction) => {
    const summoner = req.params["summonerName"];
    const gameMode = req.params["gameMode"];
    if (!req.user) {
        return res.redirect("/");
    }
    Replay.find({ mode: gameMode }, (err, replays) => {
        if (err) {
            return next(err);
        }
        if (replays.length === 0) {
            res.render("stats/empty", {
                title: "Game Mode Not Found",
                gameMode: gameMode
            });
            return;
        }
        getSummonerStats(replays, summoner).then((summonerStats) => {
            if (!summonerStats) {
                res.render("stats/summoner/empty", {
                    title: "Summoner Not Found",
                    summoner: summoner
                });
                return;
            }
            res.render("stats/summoner", {
                title: `${summonerStats.summoner} - Summoner Stats`,
                stats: summonerStats,
                format: {
                    p: (num: number) => `${(num * 100).toFixed(2)}%`,
                    f: (num: number) => `${num.toFixed(2)}`
                }
            });
        });
    });
};
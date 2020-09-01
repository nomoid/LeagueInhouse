import { Request, Response } from "express";
import { Replay, ReplayDocument } from "../models/Replay";
import { HookNextFunction } from "mongoose";
import { Metadata } from "../processing/data";
import { extractPlayerBySummonerName } from "../processing/player";

interface PartialSummonerStats {
    summoner: string;
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
    assists: number;
}

async function emptyPartialSummonerStats(): Promise<PartialSummonerStats> {
    return {
        summoner: "",
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0
    };
}

interface SummonerStats extends PartialSummonerStats {
    games: number;
    // float, undefined if 0 games played
    winrate: number | undefined;
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

async function getSummonerStats(replays: ReplayDocument[], summoner: string) {
    const full = await replays.reduce(async (accum, curr) => {
        const metadata = await loadMetadataAsync(curr);
        const playerData = extractPlayerBySummonerName(metadata, summoner);
        if (!playerData) {
            return accum;
        }
        const old = await accum;
        const partial: PartialSummonerStats = {
            summoner: playerData.summonerName,
            wins: old.wins + (playerData.win ? 1 : 0),
            losses: old.losses + (playerData.win ? 0 : 1),
            kills: old.kills + playerData.kills,
            deaths: old.deaths + playerData.deaths,
            assists: old.assists + playerData.assists
        };
        return partial;
    }, emptyPartialSummonerStats());
    const games = full.wins + full.losses;
    let winrate: number | undefined;
    if (games !== 0) {
        winrate = full.wins / games;
    }
    let kda: number | undefined;
    if (full.deaths !== 0) {
        kda = (full.kills + full.assists) / (full.deaths);
    }
    const rest = {
        games: games,
        winrate: winrate,
        kda: kda
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
        getSummonerStats(replays, summoner).then((summonerStats) => {
            if (summonerStats.games === 0) {
                res.render("stats/summoner/empty", {
                    title: "Summoner Not Found"
                });
            }
            else {
                res.render("stats/summoner", {
                    title: `${summoner} - Summoner Stats`,
                    stats: summonerStats
                });
            }
        });
    });
};
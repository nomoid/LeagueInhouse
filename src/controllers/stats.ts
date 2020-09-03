import { Request, Response } from "express";
import { Replay } from "../models/Replay";
import { HookNextFunction } from "mongoose";
import { getSummonerStats } from "../processing/stat";
import { getSummonerRanks, formatRankObject } from "../models/StatCache";

export const getStats = (req: Request, res: Response) => {
    res.render("stats", {
        title: "Inhouse Stats"
    });
};

export const postStats = (req: Request, res: Response) => {
    const gameMode = encodeURIComponent(req.body.mode);
    const summonerName = encodeURIComponent(req.body.summonerName);
    res.redirect(`/stats/${gameMode}/summoner/${summonerName}`);
};

export const getSummoner = (req: Request, res: Response, next: HookNextFunction) => {
    const summoner = req.params["summonerName"];
    const gameMode = req.params["gameMode"];
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
                    summoner: summoner,
                    defaultGameMode: gameMode
                });
                return;
            }
            getSummonerRanks(summonerStats.summoner, gameMode).then((ranks) => {
                const rankObject = Object.fromEntries(ranks);
                const rankFormat = formatRankObject(rankObject);
                res.render("stats/summoner", {
                    title: `${summonerStats.summoner} - Summoner Stats`,
                    stats: summonerStats,
                    ranks: rankFormat,
                    defaultGameMode: gameMode,
                    format: {
                        p: (num: number) => `${(num * 100).toFixed(2)}%`,
                        f: (num: number) => `${num.toFixed(2)}`
                    }
                });
            });
        });
    });
};
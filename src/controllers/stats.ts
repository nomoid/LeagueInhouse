import { Request, Response } from "express";
import { Replay, allSummoners } from "../models/Replay";
import { HookNextFunction } from "mongoose";
import { getSummonerStats } from "../processing/stat";
import { getSummonerRanks, formatRankObject, statCacheUpdater } from "../models/StatCache";

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

export const getRebuildCache = (req: Request, res: Response) => {
    Replay.find(async (err, replays) => {
        const summonersByMode = new Map<string, Array<Promise<Array<string>>>>();
        for (const replay of replays) {
            const mode = replay.mode;
            const summoners = allSummoners(replay);
            if (!summonersByMode.has(mode)) {
                summonersByMode.set(mode, new Array<Promise<Array<string>>>());
            }
            const arr = summonersByMode.get(mode) as Array<Promise<Array<string>>>;
            arr.push(summoners);
        }
        const outerPromises: Array<Promise<void>> = [];
        for (const mode of summonersByMode.keys()) {
            let summoners: string[] = [];
            const promises = summonersByMode.get(mode) as Array<Promise<string[]>>;
            for (const promise of promises) {
                const res = await promise;
                summoners = summoners.concat(res);
            }
            outerPromises.push(statCacheUpdater(mode, summoners));
        }
        await Promise.all(outerPromises);
        res.render("admin/rebuildcache", {
            title: "Rebuild Cache"
        });
    });
};
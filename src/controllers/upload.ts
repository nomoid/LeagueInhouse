import { NextFunction, Request, Response } from "express";
import moment from "moment";
import "moment-timezone";
import { longFromBigInt, Replay, stringifyMetadata, allSummoners, recentReplays } from "../models/Replay";
import { User, UserDocument } from "../models/User";
import { parse } from "../processing/parser";
import { extractAllPlayers } from "../processing/player";
import { check, validationResult } from "express-validator";
import { Metadata } from "../processing/data";
import { statCacheUpdater } from "../models/StatCache";

function today() {
    return moment().tz("America/New_York").format("YYYY-MM-DD");
}

export const getUpload = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    if (user.uploadInProgress !== undefined) {
        return res.redirect("/upload/continue");
    }
    const recentDocuments = await recentReplays(20);
    const recents = recentDocuments.map((replay) => replay.matchId);
    res.render("upload/index", {
        title: "Upload Replay",
        today: today(),
        recents: recents
    });
};

export const getUploadContinue = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    if (user.uploadInProgress === undefined) {
        return res.redirect("/upload");
    }
    const matchId = user.uploadInProgress;
    // Get uploaded match info
    Replay.findOne({ matchId: matchId }, (err, replay) => {
        if (err) {
            return next(err);
        }
        if (!replay) {
            user.uploadInProgress = undefined;
            return user.save((err) => {
                if (err) {
                    return next(err);
                }
                return res.redirect("/upload");
            });
        }
        replay.loadMetadata((err, metadata) => {
            if (err) {
                return next(err);
            }
            res.render("upload/continue", {
                title: "Upload Replay",
                players: extractAllPlayers(metadata as Metadata)
            });
        });
    });
};

export const getUploadSuccess = (req: Request, res: Response) => {
    if (!req.user) {
        return res.redirect("/");
    }
    res.render("upload/success", {
        title: "Upload Success"
    });
};


export const postUpload = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    let mode = req.body.mode;
    if (mode === "other") {
        const modeOther = req.body.modeOther as string;
        mode = modeOther.toLowerCase();
        await check("modeOther", "Game mode must be alphanumeric!").matches(
            /^\w+$/i).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash("errors", errors.array());
            return res.redirect("/upload");
        }

    }
    const matchData = req.file.buffer;
    parse(matchData).then(function (metadata) {
        const matchId = longFromBigInt(metadata.matchId);
        const replay = new Replay({
            matchId: matchId,
            submitter: user.id,
            mode: mode,
            date: req.body.date,
            metadata: stringifyMetadata(metadata),
            incomplete: true
        });

        Replay.findOne({ matchId: matchId }, (err, existingReplay) => {
            if (err) { return next(err); }
            if (existingReplay) {
                req.flash("errors", { msg: "The same replay has already been uploaded." });
                return res.redirect("/upload");
            }
            replay.saveReplay(matchData, (err, storageLocation) => {
                if (err) { return next(err); }
                replay.storageLocation = storageLocation as "mongodb" | "azure";
                replay.save((err) => {
                    if (err) { return next(err); }
                    User.findById(user.id, (err, user: UserDocument) => {
                        if (err) { return next(err); }
                        user.uploadInProgress = matchId;
                        user.save((err) => {
                            if (err) {
                                return next(err);
                            }
                            return res.redirect("/upload/continue");
                        });
                    });
                });
            });
        });
    }).catch(() => {
        req.flash("errors", { msg: "Failed to upload replay!" });
        return res.redirect("/upload");
    });
};

export const postUploadContinue = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    if (user.uploadInProgress === undefined) {
        return res.redirect("/upload");
    }
    const matchId = user.uploadInProgress;
    if (req.body.cancel === "") {
        Replay.deleteOne({ matchId: matchId }, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect("/upload");
        });
    }
    else {
        for (const color of ["blue", "red"]) {
            let field;
            if (color === "blue") {
                field = "draftResultBlue";
            }
            else {
                field = "draftResultRed";
            }
            const teamSize = 5;
            let chain = check(field, "Validation bug: Invalid draft ordering!").custom(
                (value) => {
                    const arr = JSON.parse(value);
                    return Array.isArray(arr) && arr.length === teamSize;
                }
            );
            for (let i = 0; i < teamSize; i++) {
                chain = chain.contains(`${color}${i + 1}`);
            }
            await chain.run(req);
        }
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.flash("errors", errors.array());
            return res.redirect("/upload/continue");
        }
        Replay.findOne({ matchId: matchId }, (err, replay) => {
            if (err) {
                return next(err);
            }
            if (!replay) {
                user.uploadInProgress = undefined;
                return user.save((err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.redirect("/upload");
                });
            }
            user.uploadInProgress = undefined;
            user.save((err) => {
                if (err) {
                    return next(err);
                }
                replay.incomplete = false;
                if (req.body.toDraft === "draft") {
                    const draftResultBlue = JSON.parse(req.body.draftResultBlue) as string[];
                    const draftResultRed = JSON.parse(req.body.draftResultRed) as string[];
                    const blueDraft = draftResultBlue.map((s) => {
                        return parseInt(s.replace("blue", ""));
                    });
                    const redDraft = draftResultRed.map((s) => {
                        return parseInt(s.replace("red", ""));
                    });
                    replay.draft = {
                        blueFirstPick: req.body.draftRadio === "blue",
                        blueDraft: blueDraft,
                        redDraft: redDraft
                    };
                }
                replay.save((err) => {
                    if (err) {
                        return next(err);
                    }
                    replay.loadMetadata(async (err) => {
                        if (err) {
                            return next(err);
                        }
                        const summoners = await allSummoners(replay);
                        await statCacheUpdater(replay.mode, summoners);
                        return res.redirect("/upload/success");
                    });
                });
            });
        });
    }
};
import { NextFunction, Request, Response } from "express";
import moment from "moment";
import "moment-timezone";
import { longFromBigInt, Replay } from "../models/Replay";
import { User, UserDocument } from "../models/User";
import { parse } from "../processing/parser";
import { extractAllPlayers } from "../processing/player";

function today() {
    return moment().tz("America/New_York").format("YYYY-MM-DD");
}

export const getUpload = (req: Request, res: Response) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    if (user.uploadInProgress !== undefined) {
        return res.redirect("/upload/continue");
    }
    res.render("upload/index", {
        title: "Upload Replay",
        today: today()
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
        replay.loadReplay((err, buffer) => {
            if (err) {
                return next(err);
            }
            parse(buffer as Buffer).then((metadata) => {
                res.render("upload/continue", {
                    title: "Upload Replay",
                    players: extractAllPlayers(metadata)
                });
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

export const postUpload = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.redirect("/");
    }
    const user = req.user as UserDocument;
    let mode = req.body.mode;
    if (mode === "other") {
        mode = req.body.modeOther;
    }
    const matchData = req.file.buffer;
    parse(matchData).then(function (metadata) {
        const matchId = longFromBigInt(metadata.matchId);
        const replay = new Replay({
            matchId: matchId,
            submitter: user.id,
            mode: mode,
            date: req.body.date,
        });

        Replay.findOne({ matchId: matchId }, (err, existingReplay) => {
            if (err) { return next(err); }
            if (existingReplay) {
                req.flash("errors", { msg: "The same replay has already been uploaded." });
                return res.redirect("/upload");
            }
            replay.saveReplay(matchData, (err) => {
                if (err) { return next(err); }
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
    });
};
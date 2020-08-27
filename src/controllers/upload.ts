import { Request, Response, NextFunction } from "express";
import moment from "moment";
import "moment-timezone";
import { Replay, longFromBigInt } from "../models/Replay";
import { parse } from "../processing/parser";
import { UserDocument } from "../models/User";

function today() {
    return moment().tz("America/New_York").format("YYYY-MM-DD");
}

export const getUpload = (req: Request, res: Response) => {
    if (!req.user) {
        return res.redirect("/");
    }
    res.render("upload/index", {
        title: "Upload Replay",
        today: today()
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
                    return res.redirect("/upload/success");
                });
            });
        });
    });
};
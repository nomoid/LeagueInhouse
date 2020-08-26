import { Request, Response, NextFunction } from "express";
import moment from "moment";
import "moment-timezone";

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
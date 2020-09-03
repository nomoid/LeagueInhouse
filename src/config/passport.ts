import passport from "passport";
import passportLocal from "passport-local";

import { User, UserDocument } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { ACCESS_TOKENS, ADMIN_ACCESS_TOKENS } from "../util/secrets";

const LocalStrategy = passportLocal.Strategy;

passport.serializeUser<UserDocument, unknown>((user, done) => {
    done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});


/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "username" }, (username, password, done) => {
    User.findOne({ username: username.toLowerCase() }, (err, user: UserDocument) => {
        if (err) { return done(err); }
        if (!user) {
            return done(undefined, false, { message: "Invalid username or password." });
        }
        user.comparePassword(password, (err: Error, isMatch: boolean) => {
            if (err) { return done(err); }
            if (isMatch) {
                if (!ACCESS_TOKENS.includes(user.accessToken)) {
                    return done(undefined, false, { message: `User ${username} has invalid access token.` });
                }
                return done(undefined, user);
            }
            return done(undefined, false, { message: "Invalid username or password." });
        });
    });
}));

/**
 * Login Required middleware.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        if (user) {
            const userDocument = user as UserDocument;
            if (!ACCESS_TOKENS.includes(userDocument.accessToken)) {
                req.flash("errors", { msg: "User has invalid access token." });
                res.redirect("/");
                return;
            }
            return next();
        }
    }
    res.redirect("/login");
};

export const isAdminAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        if (user) {
            const userDocument = user as UserDocument;
            if (!ACCESS_TOKENS.includes(userDocument.accessToken)) {
                req.flash("errors", { msg: "User has invalid access token." });
                res.redirect("/");
                return;
            }
            if (!ADMIN_ACCESS_TOKENS.includes(userDocument.accessToken)) {
                req.flash("errors", { msg: "User does not have admin access!" });
                res.redirect("/");
                return;
            }
            return next();
        }
    }
    res.redirect("/login");
};

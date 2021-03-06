import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
import { connectToMongoose } from "./util/mongoose";
import passport from "passport";

import multer, { memoryStorage } from "multer";

const MongoStore = mongo(session);
const upload = multer({ storage: memoryStorage() });

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
import * as uploadController from "./controllers/upload";
import * as statsController from "./controllers/stats";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";
import { SESSION_SECRET, ENVIRONMENT } from "./util/secrets";

// Create Express server
const app = express();

const mongoUrl = connectToMongoose();

let sessionSecret = SESSION_SECRET;

if (sessionSecret === undefined) {
    console.log("WARNING: Session secret undefined! Proceeding with empty string. ");
    sessionSecret = "";
}

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: sessionSecret,
    store: new MongoStore({
        url: mongoUrl,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

const defaultGameMode = "summerlol";
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.defaultGameMode = defaultGameMode;
    res.locals.prod = ENVIRONMENT === "production";
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== "/login" &&
        req.path !== "/signup" &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        if (req.session) {
            req.session.returnTo = req.path;
        }
    } else if (req.user &&
        req.path == "/account") {
        if (req.session) {
            req.session.returnTo = req.path;
        }
    }
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.get("/signup", userController.getSignup);
app.post("/signup", userController.postSignup);
app.get("/account", passportConfig.isAuthenticated, userController.getAccount);
app.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get("/upload", passportConfig.isAuthenticated, uploadController.getUpload);
app.post("/upload", upload.single("replay"), passportConfig.isAuthenticated, uploadController.postUpload);
app.get("/upload/continue", passportConfig.isAuthenticated, uploadController.getUploadContinue);
app.post("/upload/continue", passportConfig.isAuthenticated, uploadController.postUploadContinue);
app.get("/upload/success", passportConfig.isAuthenticated, uploadController.getUploadSuccess);
app.get("/stats", statsController.getStats);
app.post("/stats", statsController.postStats);
app.get("/stats/:gameMode/summoner/:summonerName", statsController.getSummoner);
app.get("/admin/rebuildcache/", passportConfig.isAdminAuthenticated, statsController.getRebuildCache);

export default app;

"use strict";

import graph from "fbgraph";
import { Response, Request, NextFunction } from "express";
import { UserDocument } from "../models/User";


/**
 * List of API examples.
 * @route GET /api
 */
export const getApi = (req: Request, res: Response) => {
    res.render("api/index", {
        title: "API Examples"
    });
};

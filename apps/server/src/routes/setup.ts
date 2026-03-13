"use strict";

import sqlInit from "../services/sql_init.js";
import setupService from "../services/setup.js";
import type { Request, Response } from "express";

function setupPage(req: Request, res: Response) {
    if (sqlInit.isDbInitialized()) {
        res.redirect(".");
        return;
    }

    // we got here because DB is not completely initialized, so if schema exists,
    // it means we're in "sync in progress" state.
    const syncInProgress = sqlInit.schemaExists();

    if (syncInProgress) {
        // trigger sync if it's not already running
        setupService.triggerSync();
    }

    res.json({
        syncInProgress: syncInProgress
    });
}

export default {
    setupPage
};

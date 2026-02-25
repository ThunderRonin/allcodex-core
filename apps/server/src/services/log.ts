"use strict";

import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { EOL } from "os";
import dataDir from "./data_dir.js";
import cls from "./cls.js";
import config, { LOGGING_DEFAULT_RETENTION_DAYS } from "./config.js";

// ── ANSI color codes (console only, never written to files) ──
const c = {
    reset:   "\x1b[0m",
    bold:    "\x1b[1m",
    dim:     "\x1b[2m",
    red:     "\x1b[31m",
    green:   "\x1b[32m",
    yellow:  "\x1b[33m",
    blue:    "\x1b[34m",
    magenta: "\x1b[35m",
    cyan:    "\x1b[36m",
    gray:    "\x1b[90m",
};

type LogLevel = "info" | "error" | "warn";

const LEVEL_STYLE: Record<LogLevel, { badge: string; color: string }> = {
    info:  { badge: " INFO ", color: c.cyan },
    warn:  { badge: " WARN ", color: c.yellow },
    error: { badge: "ERROR ", color: c.red },
};

if (!fs.existsSync(dataDir.LOG_DIR)) {
    fs.mkdirSync(dataDir.LOG_DIR, 0o700);
}

let logFile: fs.WriteStream | undefined;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MINIMUM_FILES_TO_KEEP = 7;

let todaysMidnight!: Date;

initLogFile();

function getTodaysMidnight() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function cleanupOldLogFiles() {
    try {
        // Get retention days from environment or options
        let retentionDays = LOGGING_DEFAULT_RETENTION_DAYS;
        const customRetentionDays = config.Logging.retentionDays;
        if (customRetentionDays > 0) {
            retentionDays = customRetentionDays;
        } else if (customRetentionDays <= -1){
            info(`Log cleanup: keeping all log files, as specified by configuration.`);
            return
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Read all log files
        const files = await fs.promises.readdir(dataDir.LOG_DIR);
        const logFiles: Array<{name: string, mtime: Date, path: string}> = [];

        for (const file of files) {
            // Security: Only process files matching our log pattern (trilium legacy + allcodex)
            if (!/^(trilium|allcodex)-\d{4}-\d{2}-\d{2}\.log$/.test(file)) {
                continue;
            }

            const filePath = path.join(dataDir.LOG_DIR, file);

            // Security: Verify path stays within LOG_DIR
            const resolvedPath = path.resolve(filePath);
            const resolvedLogDir = path.resolve(dataDir.LOG_DIR);
            if (!resolvedPath.startsWith(resolvedLogDir + path.sep)) {
                continue;
            }

            try {
                const stats = await fs.promises.stat(filePath);
                logFiles.push({ name: file, mtime: stats.mtime, path: filePath });
            } catch (err) {
                // Skip files we can't stat
            }
        }

        // Sort by modification time (oldest first)
        logFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

        // Keep minimum number of files
        if (logFiles.length <= MINIMUM_FILES_TO_KEEP) {
            return;
        }

        // Delete old files, keeping minimum
        let deletedCount = 0;
        for (let i = 0; i < logFiles.length - MINIMUM_FILES_TO_KEEP; i++) {
            const file = logFiles[i];
            if (file.mtime < cutoffDate) {
                try {
                    await fs.promises.unlink(file.path);
                    deletedCount++;
                } catch (err) {
                    // Log deletion failed, but continue with others
                }
            }
        }

        if (deletedCount > 0) {
            info(`Log cleanup: deleted ${deletedCount} old log files`);
        }
    } catch (err) {
        // Cleanup failed, but don't crash the log rotation
    }
}

function initLogFile() {
    todaysMidnight = getTodaysMidnight();

    const logPath = `${dataDir.LOG_DIR}/allcodex-${formatDate()}.log`;
    const isRotating = !!logFile;

    if (isRotating) {
        logFile!.end();
    }

    logFile = fs.createWriteStream(logPath, { flags: "a" });

    // Clean up old log files when rotating to a new file
    if (isRotating) {
        cleanupOldLogFiles().catch(() => {
            // Ignore cleanup errors
        });
    }
}

function checkDate(millisSinceMidnight: number) {
    if (millisSinceMidnight >= DAY) {
        initLogFile();

        millisSinceMidnight -= DAY;
    }

    return millisSinceMidnight;
}

/** Write a plain-text line to the log file and return the formatted timestamp. */
function _writeToFile(plainLine: string): string {
    let ms = Date.now() - todaysMidnight.getTime();
    ms = checkDate(ms);
    const ts = formatTime(ms);
    logFile!.write(`${ts} ${plainLine}${EOL}`);
    return ts;
}

function log(str: string | Error, level: LogLevel = "info") {
    const bundleNoteId = cls.get("bundleNoteId");
    const scriptPrefix = bundleNoteId ? `[Script ${bundleNoteId}] ` : "";
    const fileLevel = level !== "info" ? `${level.toUpperCase()}: ` : "";

    // ── file: plain text ──
    const ts = _writeToFile(`${scriptPrefix}${fileLevel}${str}`);

    // ── console: colorful ──
    const style = LEVEL_STYLE[level];
    const cTs     = `${c.gray}${ts}${c.reset}`;
    const cBadge  = `${style.color}${c.bold}${style.badge}${c.reset}`;
    const cScript = scriptPrefix ? `${c.magenta}${scriptPrefix.trim()}${c.reset} ` : "";
    const cMsg    = level === "error" ? `${c.red}${str}${c.reset}` : String(str);

    console.log(`${cTs} ${cBadge} ${cScript}${cMsg}`);
}

function info(message: string | Error) {
    log(message, "info");
}

function warn(message: string | Error) {
    log(message, "warn");
}

function error(message: string | Error | unknown) {
    log(String(message), "error");
}

const requestBlacklist = ["/app", "/images", "/stylesheets", "/api/recent-notes"];

function request(req: Request, res: Response, timeMs: number, responseLength: number | string = "?") {
    for (const bl of requestBlacklist) {
        if (req.url.startsWith(bl)) {
            return;
        }
    }

    if (req.url.includes(".js.map") || req.url.includes(".css.map")) {
        return;
    }

    const status = res.statusCode;
    const method = req.method;
    const url = req.url;
    const isSlow = timeMs >= 10;

    // ── file: plain text ──
    const ts = _writeToFile(`${isSlow ? "Slow " : ""}${status} ${method} ${url} ${responseLength}b ${timeMs}ms`);

    // ── console: colorful ──
    const cTs = `${c.gray}${ts}${c.reset}`;
    const cBadge = `${c.blue}${c.bold}  REQ ${c.reset}`;

    const cStatus = status >= 500 ? `${c.red}${c.bold}${status}${c.reset}`
        : status >= 400 ? `${c.yellow}${status}${c.reset}`
        : status >= 300 ? `${c.cyan}${status}${c.reset}`
        : `${c.green}${status}${c.reset}`;

    const cMethod = `${c.bold}${method}${c.reset}`;
    const cBytes = `${c.dim}${responseLength}b${c.reset}`;

    const cTime = timeMs >= 100 ? `${c.red}${c.bold}${timeMs}ms${c.reset}`
        : timeMs >= 10 ? `${c.yellow}${timeMs}ms${c.reset}`
        : `${c.dim}${timeMs}ms${c.reset}`;

    const cSlow = isSlow ? `${c.yellow}${c.bold}Slow ${c.reset}` : "";

    console.log(`${cTs} ${cBadge} ${cSlow}${cStatus} ${cMethod} ${url} ${cBytes} ${cTime}`);
}

function pad(num: number) {
    num = Math.floor(num);

    return num < 10 ? `0${num}` : num.toString();
}

function padMilli(num: number) {
    if (num < 10) {
        return `00${num}`;
    } else if (num < 100) {
        return `0${num}`;
    } else {
        return num.toString();
    }
}

function formatTime(millisSinceMidnight: number) {
    return `${pad(millisSinceMidnight / HOUR)}:${pad((millisSinceMidnight % HOUR) / MINUTE)}:${pad((millisSinceMidnight % MINUTE) / SECOND)}.${padMilli(millisSinceMidnight % SECOND)}`;
}

function formatDate() {
    return `${pad(todaysMidnight.getFullYear())}-${pad(todaysMidnight.getMonth() + 1)}-${pad(todaysMidnight.getDate())}`;
}

export default {
    info,
    warn,
    error,
    request
};

import type { Router } from "express";

import fs from "fs";
import path from "path";
import jsYaml from "js-yaml";
import { apiReference } from "@scalar/express-api-reference";
import { RESOURCE_DIR } from "../services/resource_dir";
import log from "../services/log.js";
import rateLimit from "express-rate-limit";

/**
 * Resolve the path to etapi.openapi.yaml.
 *
 * In production the build step copies the file into `dist/assets/`.
 * In development `RESOURCE_DIR` points to `src/assets/` but the file
 * lives at the server package root, so we fall back to a path relative
 * to this source file.
 */
const _specPathPrimary = path.join(RESOURCE_DIR, "etapi.openapi.yaml");
const _specPathFallback = path.resolve(__dirname, "../../etapi.openapi.yaml");
const specPath = fs.existsSync(_specPathPrimary) ? _specPathPrimary : _specPathFallback;

if (!fs.existsSync(specPath)) {
    log.error(`OpenAPI spec not found at either ${_specPathPrimary} or ${_specPathFallback}`);
}

/** Lazily-cached raw YAML string */
let spec: string | null = null;
/** Lazily-cached parsed JSON object */
let specJson: object | null = null;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

function register(router: Router) {
    /**
     * GET /etapi/etapi.openapi.yaml
     *
     * Returns the raw OpenAPI 3.0 YAML specification.
     * Useful for Scalar UI, Swagger Editor, or any OpenAPI tooling that
     * accepts a YAML URL.
     */
    router.get("/etapi/etapi.openapi.yaml", limiter, (_, res) => {
        if (!spec) {
            spec = fs.readFileSync(specPath, "utf8");
        }

        res.header("Content-Type", "text/plain");
        res.status(200).send(spec);
    });

    /**
     * GET /etapi/openapi.json
     *
     * Returns the full OpenAPI specification as JSON.
     * Designed for LLM / AI agent consumption — CORS is wide-open so
     * external tooling (MCP servers, function-calling agents, etc.) can
     * fetch the schema directly.
     *
     * Rate-limited: 100 req / 15 min per IP.
     */
    router.get("/etapi/openapi.json", limiter, (_, res) => {
        if (!specJson) {
            const raw = fs.readFileSync(specPath, "utf8");
            specJson = jsYaml.load(raw) as object;
        }

        res.header("Access-Control-Allow-Origin", "*");
        res.status(200).json(specJson);
    });

    /**
     * GET /docs
     *
     * Interactive API reference powered by Scalar.
     * Dark-mode, purple theme.  Reads the spec from the YAML endpoint above.
     */
    router.use(
        "/docs",
        apiReference({
            spec: { url: "/etapi/etapi.openapi.yaml" },
            theme: "purple",
            darkMode: true,
        }),
    );
}

export default {
    register
};

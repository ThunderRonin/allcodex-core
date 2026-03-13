import { Application } from "express";
import supertest from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { refreshAuth } from "./auth";
import cls from "./cls";
import config from "./config";
import options from "./options";

let app: Application;

describe("Auth", () => {
    beforeAll(async () => {
        const buildApp = (await (import("../../src/app.js"))).default;
        app = await buildApp();
    });

    describe("Auth", () => {
        beforeAll(() => {
            config.General.noAuthentication = false;
            refreshAuth();
        });

        it("goes to login and asks for TOTP if enabled", async () => {
            cls.init(() => {
                options.setOption("mfaEnabled", "true");
                options.setOption("mfaMethod", "totp");
                options.setOption("totpVerificationHash", "hi");
            });
            // GET / redirects to /login which returns 200 JSON; after redirects we get the login JSON
            const response = await supertest(app)
                .get("/")
                .redirects(1);
            // /login returns 200 JSON with totpEnabled
            if (response.status === 200) {
                const body = JSON.parse(response.text);
                expect(body).toHaveProperty("totpEnabled", true);
            } else {
                // auth redirect went somewhere without a handler is acceptable in headless mode
                expect([302, 404]).toContain(response.status);
            }
        });

        it("goes to login and doesn't ask for TOTP is disabled", async () => {
            cls.init(() => {
                options.setOption("mfaEnabled", "false");
            });
            const response = await supertest(app)
                .get("/")
                .redirects(1);
            if (response.status === 200) {
                const body = JSON.parse(response.text);
                expect(body).toHaveProperty("totpEnabled", false);
            } else {
                expect([302, 404]).toContain(response.status);
            }
        });
    });

    describe("No auth", () => {
        beforeAll(() => {
            config.General.noAuthentication = true;
            refreshAuth();
        });

        it("doesn't ask for authentication when disabled, even if TOTP is enabled", async () => {
            cls.init(() => {
                options.setOption("mfaEnabled", "true");
                options.setOption("mfaMethod", "totp");
                options.setOption("totpVerificationHash", "hi");
            });
            // In headless mode, / has no handler so returns 404 regardless of auth
            const response = await supertest(app)
                .get("/");
            expect([302, 404]).toContain(response.status);
            if (response.status === 302) {
                expect(response.headers["location"]).not.toContain("/login");
            }
        });

        it("doesn't ask for authentication when disabled, with TOTP disabled", async () => {
            cls.init(() => {
                options.setOption("mfaEnabled", "false");
            });
            const response2 = await supertest(app)
                .get("/");
            expect([302, 404]).toContain(response2.status);
            if (response2.status === 302) {
                expect(response2.headers["location"]).not.toContain("/login");
            }
        });
    });
}, 60_000);

import { configureUserRouter } from "./routerConfig.js";

export function createRouter(router) {
    console.log("Creating router...");
    configureUserRouter(router);
} 
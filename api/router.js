import { configureUserRouter } from "./user_router.js";

export function createRouter(router) {
    console.log("Creating router...");
    configureUserRouter(router);
} 
import { configureUserRouter } from "./user_router.js";

export function createRouter(router) {
    console.log("Creando rutas principales...");
    configureUserRouter(router);
} 
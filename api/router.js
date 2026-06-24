import { configureUserRouter } from "./user_router.js";
import { configureLoginRouter } from "./login_router.js";
import { configurePhotoRouter } from "./photo_router.js";

export function createRouter(router) {
    console.log("Creando rutas principales...");
    configureUserRouter(router);
    configureLoginRouter(router);
    configurePhotoRouter(router);
}
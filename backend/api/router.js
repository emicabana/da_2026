import { configureUserRouter } from "./user_router.js";
import { configureLoginRouter } from "./login_router.js";
import { configurePhotoRouter } from "./photo_router.js";
import { configureAlbumRouter } from "./album_router.js";
import { configureOrderRouter } from "./order_router.js";
import { configurePhotographerToolsRouter } from "./photographer_tools_router.js";

export function createRouter(router) {
    console.log("Creando rutas principales...");
    configureUserRouter(router);
    configureLoginRouter(router);
    configurePhotoRouter(router);
    configureAlbumRouter(router);
    configureOrderRouter(router);
    configurePhotographerToolsRouter(router);
}
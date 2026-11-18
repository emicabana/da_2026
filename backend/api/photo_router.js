import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";
import uploadPhotoImage from "../middlewares/photo_image_upload_middleware.js";
import { removeOriginalPhoto, removeStoredPhoto, savePhotoImage } from "../services/photo_storage.js";

export function configurePhotoRouter(router) {
    const photoService = getDependency("photoService");

    console.log("Configurando rutas de fotos...");

    // Público — cualquiera puede ver las fotos
    router.get("/photos", async (req, res, next) => {
        try {
            const photos = await photoService.getList();
            res.json(photos);
        } catch (err) { next(err); }
    });

     // Público — cualquiera puede ver las fotos
    router.get("/photos/:id", async (req, res, next) => {
        try {
            const photo = await photoService.getById(req.params.id);
            res.json(photo);
        } catch (err) { next(err); }
    });

    // Los fotógrafos administran sus fotos; el admin puede administrar todas.
    router.post("/photos", checkRoleMiddleware(["admin", "photographer"]), async (req, res, next) => {
        try {
            const photo = await photoService.create(
                req.body,
                req.session.username,
                req.session.role === "admin"
            );
            res.status(201).json(photo);
        } catch (err) { next(err); }
    });

    router.post("/photos/upload", checkRoleMiddleware(["admin", "photographer"]), uploadPhotoImage, async (req, res, next) => {
        let media;
        try {
            if (!req.file)
                throw Object.assign(new Error("Seleccioná una imagen para publicar"), { status: 400 });
            if (req.body.type === "video")
                throw Object.assign(new Error("Este endpoint acepta únicamente imágenes."), { status: 400 });

            media = await savePhotoImage(req.file);
            const photo = await photoService.create(
                req.body,
                req.session.username,
                req.session.role === "admin",
                media
            );
            res.status(201).json(photo);
        } catch (err) {
            if (media) {
                const cleanupResults = await Promise.allSettled([
                    removeStoredPhoto(media.url),
                    removeOriginalPhoto(media.original_file_path),
                ]);
                for (const result of cleanupResults) {
                    if (result.status === "rejected")
                        console.error("No se pudo limpiar una imagen que no llegó a publicarse:", result.reason);
                }
            }
            if (res.headersSent) return;
            next(err);
        }
    });

    router.patch("/photos/:id", checkRoleMiddleware(["admin", "photographer"]), uploadPhotoImage, async (req, res, next) => {
        let previousPhoto;
        let media;
        try {
            if (req.file)
                previousPhoto = await photoService.getById(req.params.id, true);
            if (req.file)
                media = await savePhotoImage(req.file);
            const photo = await photoService.update(
                req.params.id,
                req.body,
                req.session.username,
                req.session.role === "admin",
                media
            );
            res.json(photo);
            if (media && previousPhoto) {
                try {
                    await Promise.all([
                        removeStoredPhoto(previousPhoto.url),
                        removeOriginalPhoto(previousPhoto.original_file_path),
                    ]);
                } catch (cleanupError) {
                    console.error("No se pudieron eliminar los archivos anteriores de la foto:", cleanupError);
                }
            }
        } catch (err) {
            if (media) {
                try {
                    await Promise.all([
                        removeStoredPhoto(media.url),
                        removeOriginalPhoto(media.original_file_path),
                    ]);
                } catch (cleanupError) {
                    console.error("No se pudieron limpiar los archivos de una imagen no guardada:", cleanupError);
                }
            }
            if (res.headersSent) return;
            next(err);
        }
    });

    router.delete("/photos/:id", checkRoleMiddleware(["admin", "photographer"]), async (req, res, next) => {
        try {
            const photo = await photoService.delete(
                req.params.id,
                req.session.username,
                req.session.role === "admin"
            );
            try {
                await Promise.all([
                    removeStoredPhoto(photo.url),
                    removeOriginalPhoto(photo.original_file_path),
                ]);
            } catch (cleanupError) {
                console.error("No se pudieron eliminar los archivos de una foto borrada:", cleanupError);
            }
            res.status(204).send();
        } catch (err) { next(err); }
    });
}
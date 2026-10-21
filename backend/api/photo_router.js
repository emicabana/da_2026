import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";
import uploadPhoto from "../middlewares/photo_upload_middleware.js";
import { removeStoredPhoto } from "../services/photo_storage.js";

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

    router.post("/photos/upload", checkRoleMiddleware(["admin", "photographer"]), uploadPhoto.single("image"), async (req, res, next) => {
        try {
            if (!req.file)
                throw Object.assign(new Error("Seleccioná una imagen para publicar"), { status: 400 });

            const photo = await photoService.create(
                { ...req.body, url: `/uploads/${req.file.filename}` },
                req.session.username,
                req.session.role === "admin"
            );
            res.status(201).json(photo);
        } catch (err) {
            if (req.file) {
                try {
                    await removeStoredPhoto(`/uploads/${req.file.filename}`);
                } catch (cleanupError) {
                    console.error("No se pudo limpiar una imagen que no llegó a publicarse:", cleanupError);
                }
            }
            next(err);
        }
    });

    router.patch("/photos/:id", checkRoleMiddleware(["admin", "photographer"]), uploadPhoto.single("image"), async (req, res, next) => {
        let previousPhoto;
        try {
            if (req.file)
                previousPhoto = await photoService.getById(req.params.id);
            const photo = await photoService.update(
                req.params.id,
                {
                    ...req.body,
                    ...(req.file ? { url: `/uploads/${req.file.filename}` } : {}),
                },
                req.session.username,
                req.session.role === "admin"
            );
            res.json(photo);
            if (req.file && previousPhoto?.url !== photo.url) {
                try {
                    await removeStoredPhoto(previousPhoto?.url);
                } catch (cleanupError) {
                    console.error("No se pudo eliminar la imagen anterior:", cleanupError);
                }
            }
        } catch (err) {
            if (req.file) {
                try {
                    await removeStoredPhoto(`/uploads/${req.file.filename}`);
                } catch (cleanupError) {
                    console.error("No se pudo limpiar una imagen que no llegó a guardarse:", cleanupError);
                }
            }
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
                await removeStoredPhoto(photo.url);
            } catch (cleanupError) {
                console.error("No se pudo eliminar el archivo de una foto borrada:", cleanupError);
            }
            res.status(204).send();
        } catch (err) { next(err); }
    });
}
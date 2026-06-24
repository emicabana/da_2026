import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

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

    router.get("/photos/:id", async (req, res, next) => {
        try {
            const photo = await photoService.getById(req.params.id);
            res.json(photo);
        } catch (err) { next(err); }
    });

    // Solo admin puede crear, modificar y eliminar
    router.post("/photos", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const photo = await photoService.create(req.body);
            res.status(201).json(photo);
        } catch (err) { next(err); }
    });

    router.patch("/photos/:id", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const photo = await photoService.update(req.params.id, req.body);
            res.json(photo);
        } catch (err) { next(err); }
    });

    router.delete("/photos/:id", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            await photoService.delete(req.params.id);
            res.status(204).send();
        } catch (err) { next(err); }
    });
}
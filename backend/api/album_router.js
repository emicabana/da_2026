import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";
import uploadPhoto from "../middlewares/photo_upload_middleware.js";
import { removeStoredPhoto } from "../services/photo_storage.js";

export function configureAlbumRouter(router) {
    const albumService = getDependency("albumService");
    const photoService = getDependency("photoService");

    router.get("/albums/catalog", async (req, res, next) => {
        try {
            res.json(await albumService.getPublicList());
        } catch (err) {
            next(err);
        }
    });

    router.get("/albums/mine", checkRoleMiddleware(["admin", "photographer"]), async (req, res, next) => {
        try {
            res.json(await albumService.getList(req.session.username));
        } catch (err) {
            next(err);
        }
    });

    router.delete("/albums/:id", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            const { album, photos } = await albumService.delete(req.params.id, req.session.username);
            for (const photo of photos) {
                try {
                    await removeStoredPhoto(photo.url);
                } catch (cleanupError) {
                    console.error("No se pudo eliminar el archivo de una foto del álbum borrado:", cleanupError);
                }
            }
            try {
                await removeStoredPhoto(album.cover_url);
            } catch (cleanupError) {
                console.error("No se pudo eliminar la portada del álbum borrado:", cleanupError);
            }
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    });

    router.post("/albums", checkRoleMiddleware(["admin", "photographer"]), uploadPhoto.single("cover"), async (req, res, next) => {
        try {
            if (!req.file)
                throw Object.assign(new Error("Seleccioná una portada para el álbum."), { status: 400 });
            const album = await albumService.create(
                req.body,
                req.session.username,
                `/uploads/${req.file.filename}`
            );
            res.status(201).json(album);
        } catch (err) {
            if (req.file) {
                try {
                    await removeStoredPhoto(`/uploads/${req.file.filename}`);
                } catch (cleanupError) {
                    console.error("No se pudo limpiar la portada de un álbum no creado:", cleanupError);
                }
            }
            next(err);
        }
    });

    router.patch("/albums/:id/offers", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            res.json(await albumService.updateOffers(req.params.id, req.session.username, req.body));
        } catch (err) {
            next(err);
        }
    });

    router.post("/albums/:id/quantity-discounts", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            const discount = await albumService.createQuantityDiscount(
                req.params.id,
                req.session.username,
                req.body
            );
            res.status(201).json(discount);
        } catch (err) {
            next(err);
        }
    });

    router.patch("/albums/:id/quantity-discounts/:discountId", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            res.json(await albumService.updateQuantityDiscount(
                req.params.id,
                req.params.discountId,
                req.session.username,
                req.body
            ));
        } catch (err) {
            next(err);
        }
    });

    router.delete("/albums/:id/quantity-discounts/:discountId", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            await albumService.deleteQuantityDiscount(
                req.params.id,
                req.params.discountId,
                req.session.username
            );
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    });

    router.get("/albums/:id/photos", checkRoleMiddleware(["admin", "photographer"]), async (req, res, next) => {
        try {
            const album = await albumService.getById(req.params.id, req.session.username);
            res.json(await photoService.getByAlbum(album._id));
        } catch (err) {
            next(err);
        }
    });
}

import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

export function configurePhotographerToolsRouter(router) {
    const couponService = getDependency("couponService");
    const collaboratorService = getDependency("collaboratorService");
    const studioService = getDependency("studioService");
    const orderService = getDependency("orderService");
    const photographerOnly = checkRoleMiddleware("photographer");

    router.get("/photographer/sales", photographerOnly, async (req, res, next) => {
        try {
            res.json(await orderService.getPhotographerSales(req.session.username));
        } catch (err) { next(err); }
    });

    router.get("/photographer/coupons", photographerOnly, async (req, res, next) => {
        try {
            res.json(await couponService.getList(req.session.username));
        } catch (err) { next(err); }
    });
    router.post("/photographer/coupons", photographerOnly, async (req, res, next) => {
        try {
            res.status(201).json(await couponService.create(req.session.username, req.body));
        } catch (err) { next(err); }
    });
    router.patch("/photographer/coupons/:id", photographerOnly, async (req, res, next) => {
        try {
            res.json(await couponService.update(req.session.username, req.params.id, req.body));
        } catch (err) { next(err); }
    });
    router.delete("/photographer/coupons/:id", photographerOnly, async (req, res, next) => {
        try {
            await couponService.delete(req.session.username, req.params.id);
            res.status(204).send();
        } catch (err) { next(err); }
    });

    router.get("/photographer/collaborators", photographerOnly, async (req, res, next) => {
        try {
            res.json(await collaboratorService.getList(req.session.username));
        } catch (err) { next(err); }
    });
    router.get("/photographer/collaborations", photographerOnly, async (req, res, next) => {
        try {
            res.json(await collaboratorService.getIncoming(req.session.username));
        } catch (err) { next(err); }
    });
    router.post("/photographer/collaborators", photographerOnly, async (req, res, next) => {
        try {
            res.status(201).json(await collaboratorService.create(req.session.username, req.body));
        } catch (err) { next(err); }
    });
    router.delete("/photographer/collaborators/:id", photographerOnly, async (req, res, next) => {
        try {
            await collaboratorService.delete(req.session.username, req.params.id);
            res.status(204).send();
        } catch (err) { next(err); }
    });
    router.patch("/photographer/collaborations/:id/respond", photographerOnly, async (req, res, next) => {
        try {
            res.json(await collaboratorService.respond(
                req.session.username,
                req.params.id,
                req.body.response
            ));
        } catch (err) { next(err); }
    });
    router.delete("/photographer/collaborations/:id", photographerOnly, async (req, res, next) => {
        try {
            await collaboratorService.leave(req.session.username, req.params.id);
            res.status(204).send();
        } catch (err) { next(err); }
    });

    router.get("/photographer/studio", photographerOnly, async (req, res, next) => {
        try {
            res.json(await studioService.get(req.session.username));
        } catch (err) { next(err); }
    });
    router.patch("/photographer/studio", photographerOnly, async (req, res, next) => {
        try {
            res.json(await studioService.update(req.session.username, req.body));
        } catch (err) { next(err); }
    });
}

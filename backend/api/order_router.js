import { createReadStream } from "node:fs";
import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";
import uploadReceipt from "../middlewares/receipt_upload_middleware.js";

export function configureOrderRouter(router) {
    const orderService = getDependency("orderService");

    console.log("Configurando rutas de pedidos...");

    // Admin — ver todos los pedidos
    router.get("/orders", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const orders = await orderService.getAll();
            res.json(orders);
        } catch (err) { next(err); }
    });

    // Usuario logueado — ver sus propios pedidos
    router.get("/orders/mine", checkRoleMiddleware(["admin", "customer"]), async (req, res, next) => {
        try {
            const orders = await orderService.getByUsername(req.session.username);
            res.json(orders);
        } catch (err) { next(err); }
    });

    // Ver un pedido por id
    router.get("/orders/:id", async (req, res, next) => {
        try {
            if (!req.session)
                throw Object.assign(new Error("Debe iniciar sesión"), { status: 401 });
            if (!["admin", "customer"].includes(req.session.role))
                throw Object.assign(new Error("Solo los clientes pueden consultar pedidos"), { status: 403 });
            const order = await orderService.getById(
                req.params.id,
                req.session.role === "admin" ? undefined : req.session.username
            );
            res.json(order);
        } catch (err) { next(err); }
    });

    router.post("/orders/:id/photographer/:photographerId/receipt", checkRoleMiddleware("customer"), uploadReceipt, async (req, res, next) => {
        try {
            res.json(await orderService.submitReceipt(
                req.params.id,
                req.params.photographerId,
                req.session.username,
                req.session.role,
                req.file
            ));
        } catch (err) { next(err); }
    });

    router.post("/orders/:id/photographer/:photographerId/whatsapp-notice", checkRoleMiddleware("customer"), async (req, res, next) => {
        try {
            res.json(await orderService.registerWhatsappNotice(
                req.params.id,
                req.params.photographerId,
                req.session.username,
                req.session.role
            ));
        } catch (err) { next(err); }
    });

    router.get("/orders/:id/photographer/:photographerId/receipt", checkRoleMiddleware(["customer", "photographer", "admin"]), async (req, res, next) => {
        try {
            const { receipt, stream } = await orderService.getReceipt(
                req.params.id,
                req.params.photographerId,
                req.session
            );
            res.setHeader("Content-Type", receipt.mimeType);
            res.setHeader("Content-Disposition", `${receipt.mimeType === "application/pdf" ? "attachment" : "inline"}; filename="receipt.${receipt.filePath.split(".").pop()}"`);
            res.setHeader("Cache-Control", "private, no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            stream.on("error", (err) => {
                if (res.headersSent) {
                    res.destroy(err);
                    return;
                }
                next(err);
            });
            stream.pipe(res);
        } catch (err) { next(err); }
    });

    router.get("/orders/:id/photos/:photoId/download", checkRoleMiddleware(["customer", "admin"]), async (req, res, next) => {
        try {
            const download = await orderService.prepareOriginalDownload(
                req.params.id,
                req.params.photoId,
                req.session.username,
                req.session.role
            );
            res.setHeader("Content-Type", download.contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${download.fileName}"`);
            res.setHeader("Cache-Control", "private, no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            const stream = createReadStream(download.path);
            stream.on("error", (err) => {
                if (res.headersSent) {
                    res.destroy(err);
                    return;
                }
                next(err);
            });
            stream.pipe(res);
        } catch (err) { next(err); }
    });

    // Usuario logueado — crear pedido
    router.post("/orders", checkRoleMiddleware(["admin", "customer"]), async (req, res, next) => {
        try {
            const order = await orderService.create(
                req.session.username,
                req.body?.photos,
                req.body?.coupon_code,
                req.session.role
            );
            res.status(201).json(order);
        } catch (err) { next(err); }
    });

    // Admin — actualizar estado del pedido
    router.patch("/orders/:id/status", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const order = await orderService.updateStatus(
                req.params.id,
                req.body?.status,
                req.session.username,
                req.session.role
            );
            res.json(order);
        } catch (err) { next(err); }
    });
}
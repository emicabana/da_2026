import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

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

    // Usuario logueado — crear pedido
    router.post("/orders", checkRoleMiddleware(["admin", "customer"]), async (req, res, next) => {
        try {
            const order = await orderService.create(req.session.username, req.body.photos, req.body.coupon_code);
            res.status(201).json(order);
        } catch (err) { next(err); }
    });

    // Admin — actualizar estado del pedido
    router.patch("/orders/:id/status", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const order = await orderService.updateStatus(req.params.id, req.body.status);
            res.json(order);
        } catch (err) { next(err); }
    });
}
import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

export function configureUserRouter(router) {
    const userService = getDependency("userService");

    console.log("Configurando rutas de usuario...");

    router.get("/users", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const users = await userService.getList();
            res.json(users.map(user => ({
                id: user.id,
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
                role: user.role
            })));
        } catch (err) { next(err); }
    });

    router.get("/users/:username", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const user = await userService.getByUsername(req.params.username);
            res.json({
                id: user.id,
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
                role: user.role
            });
        } catch (err) { next(err); }
    });

    router.post("/users", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const user = await userService.create(req.body);
            res.status(201).json({
                id: user.id,
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
                role: user.role
            });
        } catch (err) { next(err); }
    });

    router.patch("/users/:username", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const updatedUser = await userService.update(req.params.username, req.body);
            res.json({
                id: updatedUser.id,
                user_name: updatedUser.user_name,
                display_name: updatedUser.display_name,
                email: updatedUser.email,
                role: updatedUser.role
            });
        } catch (err) { next(err); }
    });

    router.delete("/users/:username", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            await userService.delete(req.params.username);
            res.status(204).send();
        } catch (err) { next(err); }
    });
}
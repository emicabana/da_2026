import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";
import { normalizeRole } from "../roles.js";

export function configureUserRouter(router) {
    const userService = getDependency("userService");
    const loginService = getDependency("loginService");

    console.log("Configurando rutas de usuario...");

    router.post("/register", async (req, res, next) => {
        try {
            const user = await userService.register(req.body);
            const session = await loginService.login({
                user_name: user.user_name,
                password: req.body.password,
            });
            res.status(201).json(session);
        } catch (err) { next(err); }
    });

    router.get("/users", checkRoleMiddleware("admin"), async (req, res, next) => {
        try {
            const users = await userService.getList();
            res.json(users.map(user => ({
                id: user.id,
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
                role: normalizeRole(user.role)
            })));
        } catch (err) { next(err); }
    });

    router.get("/users/me", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            const user = await userService.getByUsername(req.session.username);
            res.json({
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
            });
        } catch (err) { next(err); }
    });

    router.patch("/users/me", checkRoleMiddleware("photographer"), async (req, res, next) => {
        try {
            const user = await userService.updateOwnProfile(req.session.username, req.body);
            res.json({
                user_name: user.user_name,
                display_name: user.display_name,
                email: user.email,
            });
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
                role: normalizeRole(user.role)
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
                role: normalizeRole(user.role)
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
                role: normalizeRole(updatedUser.role)
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
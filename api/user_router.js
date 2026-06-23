import { getDependency } from "../dependency.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

export function configureUserRouter(router) {
    const userService = getDependency("userService");

    console.log("Configurando rutas de usuario...");
    router.get("/users", checkRoleMiddleware("admin"), async (req, res) => {
        const users = await userService.getAllUsers();
        res.json(users.map(user => ({
            id: user.id,
            user_name: user.user_name,
            display_name: user.display_name,
            email: user.email,
            role: user.role
        })));
    });

router.post("/users/:id", checkRoleMiddleware("admin"), async (req, res) => {
    const user = await getDependency("userService").create(req.body);
    if (!user) return res.status(404).json({ error: "Usuario ya existe" });
    res.status(201).json({ id: user.id, user_name: user.user_name, display_name: user.display_name, email: user.email, role: user.role });
});

router.put("/users/:id", checkRoleMiddleware("admin"), async (req, res) => {
    const userService = getDependency("userService");
    const updatedUser = await userService.update(req.params.id, req.body);
    if (!updatedUser) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ id: updatedUser.id, user_name: updatedUser.user_name, display_name: updatedUser.display_name, email: updatedUser.email, role: updatedUser.role });
});

router.delete("/users/:id", checkRoleMiddleware("admin"), async (req, res) => {
    const userService = getDependency("userService");
    const deleted = await userService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Usuario no encontrado" });
    res.status(204).send();
});
} 
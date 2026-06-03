import { getDependency } from "../dependecy.js";
import checkRoleMiddleware from "../middlewares/check_role_middleware.js";

export function configureUserRouter(router) {
    const userService = getDependency("userService");

    console.log("Configurando rutas de usuarios...");
    router.get("/api/users", checkRoleMiddleware(["admin"]), async (req, res) => {
        const users = userService.getList();
        res.json(users.map(user => ({ 
            username: user.user_name,
            displayName: user.display_name,
            email: user.email,
            role: user.role,
        })));
    });

    router.post("/api/users", checkRoleMiddleware(["admin"]), async (req, res) => {
        const user = await getDependency("userService").create(req.body);
        if (!user) return res.status(409).json({ error: "Usuario ya existe" });
        res.status(201).json({ id: user.id, name: user.name });
    });

    router.put("/api/users/:id", checkRoleMiddleware(["admin"]), async (req, res) => {
        const userService = getDependency("userService");
        const updatedUser = await userService.update(parseInt(req.params.id), req.body);
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ id: updatedUser.id, name: updatedUser.name });
    });

    router.delete("/api/users/:id", checkRoleMiddleware(["admin"]), async (req, res) => {
        const userService = getDependency("userService");
        const deletedUser = await userService.delete(parseInt(req.params.id));
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "Usario eliminado", name: deletedUser.name });
    });
}

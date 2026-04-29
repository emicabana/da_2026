import { getDependency } from "../dependecy.js";

export function configureUserRouter(router) {
    console.log("Configurando rutas de usuarios...");

    router.get("/api/users", (req, res) => {
        const userService = getDependency("userService");
        const users = userService.getList();
        res.json(users.map(user => ({ id: user.id, name: user.name })));
    });

    router.post("/api/users", (req, res) => {
        const user = getDependency("userService").create(req.body);
        if (!user) return res.status(409).json({ error: "Usuario ya existe" });
        res.status(201).json({ id: user.id, name: user.name });
    });

    router.put("/api/users/:id", (req, res) => {
        const userService = getDependency("userService");
        const updatedUser = userService.update(parseInt(req.params.id), req.body);
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ id: updatedUser.id, name: updatedUser.name });
    });

    router.delete("/api/users/:id", (req, res) => {
        const userService = getDependency("userService");
        const deletedUser = userService.delete(parseInt(req.params.id));
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "Usario eliminado", name: deletedUser.name });
    });
}

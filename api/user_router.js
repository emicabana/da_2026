import { getDependency } from "../dependecy.js";

export function configureUserRouter(router) {
    console.log("Configuring user router...");
    router.get("/users", (req, res) => {
        const userService = getDependency("userService");
        const users = userService.getList();
        res.json(users.map(user => ({ name: user.name })));
    });
}

import { getDependency } from "../dependecy.js";

export function configureLoginRouter(router) {
    const loginService = getDependency("loginService");

    router.post("/login", async (req, res) => {
        const data = req.body;
        const session = await loginService.login(data);
        res.json(session);
    });
} 
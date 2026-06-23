import { getDependency } from "../dependency.js";

export function configureLoginRouter(router) {
    const logingService = getDependency("loginService");

    router.post("/login", async (req, res) => {
        const data = req.body;
        const session = await logingService.login(data);
        res.json(session);
    });
}
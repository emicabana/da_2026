import { getDependency } from "../dependency.js";

export function configureLoginRouter(router) {
    const loginService = getDependency("loginService");

    router.post("/login", async (req, res, next) => {
        try {
            const session = await loginService.login(req.body);
            res.json(session);
        } catch (err) { next(err); }
    });

    router.post("/logout", async (req, res, next) => {
        try {
            if (!req.session)
                throw Object.assign(new Error("No hay sesión activa"), { status: 401 });
            const sessionService = getDependency("sessionService");
            await sessionService.deleteByToken(req.session.authorizationToken);
            res.status(204).send();
        } catch (err) { next(err); }
    });
}
import { getDependency } from "../dependency.js";

export default async function checkAuthorizationTokenMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (authHeader) {
        const schema = authHeader.split(" ")[0];
        const token = authHeader.split(" ")[1];

        if (schema.toLowerCase() !== "bearer")
            throw Object.assign(new Error("Invalid authorization schema"), { status: 400 });

        if (!token)
            throw Object.assign(new Error("Authorization token missing"), { status: 400 });

        const sessionService = getDependency("sessionService");
        const session = await sessionService.getSessionByToken(token);
        if (!session)
            throw new Error("Invalid authorization token");

        req.session = session;

        console.log(session);
    }

    next();
}

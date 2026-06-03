import { getDependency } from "../dependecy.js";

export default async function checkAuthorizationTokenMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {    
        const schema = authHeader.split(" ")[0];
        const token = authHeader.split(" ")[1];

        if (schema.toLowerCase() !== "bearer")
            throw new Error("Invalid authorization schema");    

        if (!token)
            throw new Error("Authorization token missing");
 
        const sessionService = getDependency("sessionService");
        const session = await sessionService.getSessionByToken(token);
        if (!session)
            throw new Error("Invalid authorization token");

        req.session = session;

        console.log(session);   
    }

    next();

}

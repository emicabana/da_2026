export default function checkRoleMiddleware(requiredRole) {
    return async function (req, res, next) {
        if (!req.session) { 
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        
        if (!requiredRole.includes(req.session.role)) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        next();
    }
}
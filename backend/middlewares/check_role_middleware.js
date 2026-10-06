import { normalizeRole } from "../roles.js";

export default function checkRoleMiddleware(requiredRole) {
    return async function (req, res, next) {
        if (!req.session) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowedRoles.includes(normalizeRole(req.session.role))) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        next();
    }
}
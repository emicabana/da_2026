export const ROLES = Object.freeze({
    ADMIN: "admin",
    PHOTOGRAPHER: "photographer",
    CUSTOMER: "customer",
});

export const VALID_ROLES = Object.values(ROLES);

export function normalizeRole(role) {
    return role === "user" ? ROLES.CUSTOMER : role;
}
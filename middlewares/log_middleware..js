export default async function logMiddleware(req, res, next) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} ${req.session ? `(user: ${req.session.user_name})` : "(no auth)"}`);
    next();
}
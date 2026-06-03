export default async function errorHandler(err, req, res, next) {
    res.json({ error: err.message || "Error desconocido" });
}
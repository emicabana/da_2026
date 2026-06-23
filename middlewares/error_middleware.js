export default async function errorHandler(err, req, res, next) {
    res.status(err.status || 500).json({ error: err.message || "Error desconocido" });
}
export default async function errorHandler(err, req, res, next) {
    const status = err.status || (err.name === "MulterError" ? (err.code === "LIMIT_FILE_SIZE" ? 413 : 400) : 500);
    res.status(status).json({ error: err.message || "Error desconocido" });
}
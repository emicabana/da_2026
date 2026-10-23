import express from "express";
import mongoose from "mongoose";
import { uploadsDirectory } from "./services/photo_storage.js";
import config from "./config.js";
import "./dependencies.js";
import { createRouter } from "./api/router.js";
import errorMiddleware from "./middlewares/error_middleware.js";
import checkAutorizationTokenMiddleware from "./middlewares/check_authorization_token_middleware.js";
import logMiddleware from "./middlewares/log_middleware.js";


const app = express();

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
});
app.use(express.json());
app.use("/uploads", express.static(uploadsDirectory, { fallthrough: false, maxAge: "1d" }));
app.use(checkAutorizationTokenMiddleware);
app.use(logMiddleware);

const apiRouter = express.Router();
app.use('/api', apiRouter);
createRouter(apiRouter);

app.use(errorMiddleware);

try {
    await mongoose.connect(config.dbConnection);
    console.log("Conectado a MongoDB");
    
    app.listen(config.port, () => {
        console.log(`Server escuchando en http://localhost:${config.port}`);
    });
} catch (error) {
    console.error("Error connecting to MongoDB:", error);
}
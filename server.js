import express from "express";
import mongoose from "mongoose";
import config from "./config.js";
import { createRouter } from "./api/router.js";
import "./dependencies.js";
import errorMiddleware from "./middlewares/error_middleware.js";
import checkAutorizationTokenMiddleware from "./middlewares/check_authorization_token_middleware.js";
import logMiddleware from "./middlewares/log_middleware.js";
import bcrypt from "bcrypt";

console.log("Hash de '1234':", bcrypt.hashSync("1234", 10));

const app = express();

app.use(express.json());
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
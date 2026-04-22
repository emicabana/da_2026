import express from "express";
import { configureRouter } from "./api/router.js";
import "./dependencies.js";

const app = express();
const port = 3000; 

configureRouter(app);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
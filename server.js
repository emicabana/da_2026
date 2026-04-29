import express from "express";
import { createRouter } from "./api/router.js";
import "./dependencies.js";

const app = express();
const port = 3000; 

app.use(express.json());

createRouter(app);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


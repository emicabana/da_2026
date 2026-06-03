// Quiero un modelo de MongoDB para la colección de users con los campos: user_name y password.
import mongoose from "mongoose";

export default mongoose.model("users", new mongoose.Schema({
    user_name: { type: String, required: true },
    password: { type: String, required: true },
    display_name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
}));


    
import { addDependency } from "./dependency.js";
import { UserService } from "./services/user_services.js";
import { LoginService } from "./services/login_services.js";
import { SessionService } from "./services/session_services.js";
import { PhotoService } from "./services/photo_services.js";
import { OrderService } from "./services/order_services.js";
import UserMongo from "./mongo_models/user_mongo.js";
import SessionMongo from "./mongo_models/sessions_mongo.js";
import PhotoMongo from "./mongo_models/photo_mongo.js";
import OrderMongo from "./mongo_models/order_mongo.js";

addDependency("userRepo", UserMongo);
addDependency("sessionRepo", SessionMongo);
addDependency("photoRepo", PhotoMongo);
addDependency("orderRepo", OrderMongo);

addDependency("userService", new UserService());
addDependency("loginService", new LoginService());
addDependency("sessionService", new SessionService());
addDependency("photoService", new PhotoService());
addDependency("orderService", new OrderService());
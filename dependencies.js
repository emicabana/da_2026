import { addDependency } from "./dependecy.js";    
import { UserService } from "./services/user_services.js";
import { LoginService } from "./services/login_services.js";
import { SessionService } from "./services/session_services.js";
import UserMongo from "./mongo-db/user_mongo.js";
import SessionMongo from "./mongo-db/sessions_mongo.js";

addDependency("userRepo", new UserMongo());
addDependency("sessionRepo", new SessionMongo());

addDependency("userService", new UserService());
addDependency("loginService", new LoginService());
addDependency("sessionService", new SessionService());

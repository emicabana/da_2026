import { addDependency } from "./dependecy.js";    
import { UserService } from "./services/user_services.js";
import { UserMockup } from "./mockup/user_mockup.js";

addDependency("userService", new UserService());
addDependency("userRepo", new UserMockup()); 


import { addDependency } from "./dependecy.js";    
import { UserService } from "./services/user_services.js";
import { UserMockup } from "./services/user_mockup.js";

addDependency("userService", new UserService());
addDependency("userMockup", new UserMockup()); 


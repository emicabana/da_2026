import { addDependency } from "./dependecy";    
import { UserService } from "./services/userService";
import { UserMockup } from "./services/userMockup";

addDependency("userService", new UserService());
addDependency("userMockup", new UserMockup()); 


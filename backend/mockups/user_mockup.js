export class UserMockup {
    users = [
        { id: 1, name: "Loki", password: "1234"    },
        { id: 2, name: "Tony", password: "5678"      },
        { id: 3, name: "Peter", password: "abcd"  }
    ];

    constructor() {
    }

    getList() {
        return this.users;
    }  

    add(user) {
        user.id = this.users
            .map(u => u.id)
            .reduce((a, b) => Math.max(a, b), 0) + 1;
        this.users.push(user);
        return user;
    }

    getByName(name) {
        return this.users.find(u => u.name === name);
    }
}
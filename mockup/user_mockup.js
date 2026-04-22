export class UserMockup {
    users = [
        { id: 1, name: "Sol", password: "1234"    },
        { id: 2, name: "Benja", password: "5678"      },
        { id: 3, name: "Carlos", password: "abcd"  }
    ];

    constructor() {
    }

    getList() {
        return this.users;
    }
}
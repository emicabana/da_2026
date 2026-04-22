export class UserMockup {
    users = [
        { id: 1, name: "Luck", password: "1234"    },
        { id: 2, name: "Bucki", password: "5678"      },
        { id: 3, name: "Nana", password: "abcd"  }
    ];

    constructor() {
    }

    getList() {
        return this.users;
    }
}
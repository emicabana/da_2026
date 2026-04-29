export class UserMockup {
    users = [
        { id: 1, name: "Loki", password: "1234"    },
        { id: 2, name: "Tony", password: "5678"      },
        { id: 3, name: "Peter", password: "abcd"  }
    ];

    #nextId = 4;
    
    getList() {
        return this.users;
    }  

    create(data) {
        const exist = this.users.some(u => u.name === data.name);
        if (exist) return null;
        const newUser = { id: this.#nextId++, ...data };
        this.users.push(newUser);
        return newUser;
    }

    update(id, data) {
        const user = this.users.find(u => u.id === id);
        if (!user) return null;
            Object.assign(user, data);
        return user;
    }

    delete(id) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return null;
        const [deleted] = this.users.splice(index, 1);
        return deleted;
    }  

}
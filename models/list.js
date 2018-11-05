class List {
    constructor(id, name, user, items) {
        this._id = id;
        this._name = name;
        this._user = user;
        this._items = items;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get user() {
        return this._user;
    }

    set user(value) {
        this._user = value;
    }

    get items() {
        return this._items;
    }

    set items(value) {
        this._items = value;
    }
}

module.exports = List;
class Item {
    constructor(id, label, image, description) {
        this._id = id;
        this._label = label;
        this._image = image;
        this._description = description;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get label() {
        return this._label;
    }

    set label(value) {
        this._label = value;
    }

    get image() {
        return this._image;
    }

    set image(value) {
        this._image = value;
    }

    get description() {
        return this._description;
    }

    set description(value) {
        this._description = value;
    }
}

module.exports = Item;
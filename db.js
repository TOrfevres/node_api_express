class Db {
    constructor(client, dbName) {
        client.connect()
            .then(connectedClient => {
                // this.client = connectedClient;
                this.db = connectedClient.db(dbName);
                console.log('Connection to database : SUCCESS');
            })
            .catch(err => {
                console.error('Connection to database : FAIL');
                throw err;
            });
    };

    readData(key) {
        let collection = this.db.collection(key);
        let cursor = collection.find();
        return new Promise((resolve, reject) => {
            cursor.toArray((err, data) => {
                if (err) reject(err);
                resolve(data);
            })
        });
    };

    writeData(key, value) {
        let collection = this.db.collection(key);
        collection.insertOne(value);
    };

    updateData(key, value) {
        this.readData(key)
            .then((data) => {
                let collection = this.db.collection(key);
                collection.updateOne(
                    data.filter(e => e.id == value.id)[0],
                    { $set: value }
                )
            });
    };

    deleteData(key, value) {
        this.readData(key)
            .then((data) => {
                let collection = this.db.collection(key);
                collection.deleteOne(
                    data.filter(e => e.id == value.id)[0]
                )
            });
    };

    shutdown() {
        this.db.close();
    }
}

module.exports = Db;
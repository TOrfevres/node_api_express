let fs = require('fs');
let config = require('config');
let express = require('express');
let jwt = require('jsonwebtoken');
let bodyParser = require('body-parser');
let MongoClient = require('mongodb').MongoClient;
let Db = require('./db');

let client = new MongoClient(config.get('mongodb.url'), { useNewUrlParser: true });
let db = new Db(client, config.get('mongodb.db_name'));
let app = express();
let models = [];
console.clear();

let formatLog = (str) => (new Date()).toDateString() + "::" + str + "\n";

let checkDataConstraints = (model, values) => {
    return new Promise((resolve, reject) => {
        let obj = new model();
        let missingKeys = [];

        let additionalKeys = Object.keys(values);
        Object.keys(obj).forEach(k => {
            additionalKeys = additionalKeys.filter(e => e !== k.split('_')[1]);
        });

        Object.keys(obj).forEach(k => {
            let key = k.split('_')[1];
            if (!values.hasOwnProperty(key)) missingKeys.push(key);
        });

        if (missingKeys.length > 0) reject("Missing keys: " + missingKeys);
        if (additionalKeys.length > 0) reject("Additional keys: " + additionalKeys);
        resolve();
    });
};

app.use(bodyParser.json());

app.all('/', (req, res) => {
    let value = req.query.user;
    if (value) {
        let token = jwt.sign({user: value, version: '1.0.0'}, config.get('server.secret'));
        res.send({
            paths: [...models].map(e => [ '/' + e.toLowerCase(), [ 'GET', 'POST', 'PUT', 'DELETE' ]]),
            token: token
        });
    } else {
        res.send({
            paths: [...models].map(e => [ '/' + e.toLowerCase(), [ 'GET', 'POST', 'PUT', 'DELETE' ]]),
            token: 'You must provide a user as GET param.'
        });
    }
});

app.use(
    (req, res, next) => {
        try {
            jwt.verify(req.headers.authorization, config.get('server.secret'));
            next();
        } catch (error) {
            next(error)
        }
    },
    (req, res, next) => {
        fs.writeFileSync('./logs/request.log', formatLog(req.method + " " + req.originalUrl), { flag: 'a' });
        next();
});

fs.readdir('./models', (err, files) => {
    files.forEach(file => {
        let str = file.split(".js")[0];
        models.push(str.charAt(0).toUpperCase() + str.slice(1));
    });

    models.forEach(m => {
        let model = require('./models/' + m);

        // READ
        app.get('/' + m.toLowerCase(), (req, res) => {
            db.readData(m)
                .then((data) => res.send(data));
        });
        app.get('/' + m.toLowerCase() + '/:id', (req, res) => {
            db.readData(m)
                .then((data) => res.send(data.filter(e => e.id === req.params.id)));
        });
        // CREATE
        app.post('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    db.writeData(m, values);
                    res.send(m + ' created.');
                })
                .catch((err) => next(err));
        });
        // UPDATE
        app.put('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    db.updateData(m, values);
                    res.send(m + ' updated.');
                })
                .catch((err) => next(err));
        });
        // DELETE
        app.delete('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    db.deleteData(m, values);
                    res.send(m + ' deleted.');
                })
                .catch((err) => next(err));
        });
    });

    app.use((err, req, res, next) => {
        if (err) {
            fs.writeFileSync('./logs/error.log', formatLog(JSON.stringify(err)), { flag: 'a' });
            res.status(500).send("Your request hasn't been processed. " + err);
        }
        next();
    });

    app.listen(config.get('server.port'), () => {
        console.log(
            'APP READY!:\n',
            '• Listening on localhost:' + config.get('server.port') + '.\n'
        );
    });
});
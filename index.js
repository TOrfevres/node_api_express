let fs = require('fs');
let config = require('config');
let express = require('express');
let jwt = require('jsonwebtoken');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

mongoose.connect(config.get('mongoose.url'), { useNewUrlParser: true });
let app = express();
let models = [
    mongoose.model('user', new mongoose.Schema({
        name: String,
        password: String
    })),
    mongoose.model('item', new mongoose.Schema({
        label: String,
        image: String,
        description: String
    })),
    mongoose.model('list', new mongoose.Schema({
        name: String,
        user: String,
        items: [String]
    }))
];
console.clear();

let formatLog = (str) => (new Date()).toDateString() + "::" + str + "\n";

app.use(bodyParser.json());

app.all('/', (req, res) => {
    let value = req.query.user;
    if (value) {
        let token = jwt.sign({user: value, version: '1.0.0'}, config.get('server.secret'));
        res.send({
            paths: [...models].map(e => ['/' + e.collection.name.toLowerCase(), ['GET', 'POST', 'PUT', 'DELETE']]),
            token: token
        });
    } else {
        res.send({
            paths: [...models].map(e => ['/' + e.collection.name.toLowerCase(), ['GET', 'POST', 'PUT', 'DELETE']]),
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
        fs.writeFileSync('./logs/request.log', formatLog(req.method + " " + req.originalUrl), {flag: 'a'});
        next();
    });

models.forEach(m => {
    // READ
    app.get('/' + m.collection.name.toLowerCase(), (req, res, next) => {
        m.find({}, (err, data) => {
            if (err) next(err);
            res.send(data);
        })
    });
    app.get('/' + m.collection.name.toLowerCase() + '/:id', (req, res, next) => {
        m.find({ id: req.params.id }, (err, data) => {
            if (err) next(err);
            res.send(data);
        })
    });
    // CREATE
    app.post('/' + m.collection.name.toLowerCase(), (req, res, next) => {
        m.create(req.body, (err, data) => {
            if (err) next(err);
            res.send(data);
        })
    });
    // UPDATE
    app.put('/' + m.collection.name.toLowerCase(), (req, res, next) => {
        m.findByIdAndUpdate(req.body.id, req.body, (err, data) => {
            if (err) next(err);
            res.send(data);
        })
    });
    // DELETE
    app.delete('/' + m.collection.name.toLowerCase(), (req, res, next) => {
        m.findByIdAndRemove(req.body.id, (err, data) => {
            if (err) next(err);
            res.send(data);
        })
    });
});

app.use((err, req, res, next) => {
    if (err) {
        fs.writeFileSync('./logs/error.log', formatLog(JSON.stringify(err)), {flag: 'a'});
        res.status(500).send("Your request " + req.method + " hasn't been processed. " + err);
    }
    next();
});

app.listen(config.get('server.port'), () => {
    console.log(
        'APP READY!:\n',
        '• Listening on localhost:' + config.get('server.port') + '.\n'
    );
});
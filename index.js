let fs = require('fs');
let config = require('config');
let express = require('express');
let jwt = require('jsonwebtoken');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

mongoose.connect(config.get('mongoose.url'), {useNewUrlParser: true});
let app = express();
console.clear();


//* API CONFIGURATION *****************************************************************************
let pathsIgnored= [
    '',
    '/favicon.ico'
];

let models = [
    {
        methods: ['get', 'post', 'put', 'delete'],
        model: mongoose.model('user', new mongoose.Schema({
            name: String,
            password: String
        }))
    }, {
        methods: ['get', 'post', 'put', 'delete'],
        model: mongoose.model('item', new mongoose.Schema({
            label: String,
            image: String,
            description: String
        }))
    }, {
        methods: ['get', 'post', 'put', 'delete'],
        model: mongoose.model('list', new mongoose.Schema({
            name: String,
            user: String,
            items: [String]
        }))
    }
];
//*************************************************************************************************

let formatLog = (str) => (new Date()).toLocaleDateString("fr-FR", {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
}) + "::" + str + "\n";

app.use(bodyParser.json());

app.all('/', (req, res) => {
    res.send({
        paths: [...models].map(e => { return {
            path: '/' + e.model.collection.name.toLowerCase(),
            methods: [...e.methods].map(e => e.toUpperCase())
        }}),
        token: req.query.user ?
            jwt.sign({user: req.query.user, version: '1.0.0'}, config.get('server.secret')) :
            'You must provide a user as GET param.'
    });
});

app.use(
    (req, res, next) => {
        if (!pathsIgnored.includes(req.originalUrl)) {
            try {
                jwt.verify(req.headers.authorization, config.get('server.secret'));
                next();
            } catch (error) {
                next(error)
            }
        }
    },
    (req, res, next) => {
        fs.writeFileSync('./logs/request.log', formatLog("[" + req.method + "] " + req.originalUrl), {flag: 'a'});
        next();
    }
);

models.forEach(m => {
    // READ
    if (m.methods.find(e => e.toLowerCase() === 'get')) {
        app.get('/' + m.model.collection.name.toLowerCase(), (req, res, next) => {
            m.model.find({}, (err, data) => {
                if (err) next(err);
                res.send(data);
            })
        });
        app.get('/' + m.model.collection.name.toLowerCase() + '/:id', (req, res, next) => {
            m.model.find({id: req.params.id}, (err, data) => {
                if (err) next(err);
                res.send(data);
            })
        });
    }

    // CREATE
    if (m.methods.find(e => e.toLowerCase() === 'post')) {
        app.post('/' + m.model.collection.name.toLowerCase(), (req, res, next) => {
            m.model.create(req.body, (err, data) => {
                if (err) next(err);
                res.send(data);
            })
        });
    }

    // UPDATE
    if (m.methods.find(e => e.toLowerCase() === 'put')) {
        app.put('/' + m.model.collection.name.toLowerCase(), (req, res, next) => {
            m.model.findByIdAndUpdate(req.body.id, req.body, (err, data) => {
                if (err) next(err);
                res.send(data);
            })
        });
    }

    // DELETE
    if (m.methods.find(e => e.toLowerCase() === 'post')) {
        app.delete('/' + m.model.collection.name.toLowerCase(), (req, res, next) => {
            m.model.findByIdAndRemove(req.body.id, (err, data) => {
                if (err) next(err);
                res.send(data);
            })
        });
    }
});

app.use((err, req, res, next) => {
    if (err) {
        fs.writeFileSync('./logs/error.log', formatLog("[" + req.method + "] " + req.originalUrl + " | " + JSON.stringify(err)), {flag: 'a'});
        res.status(500).send({ message: "Your request " + req.method + " hasn't been processed. " + err });
    }
    next();
});

app.listen(config.get('server.port'), () => {
    console.log(
        'APP READY!:\n',
        '• Listening on localhost:' + config.get('server.port') + '.\n'
    );
});
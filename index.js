let fs = require('fs');
let config = require('config');
let express = require('express');
let bodyParser = require('body-parser');
// let jwt = require('jsonwebtoken');

// let token = jwt.sign({ app: 'node_api_express', version: '1.0.0' }, config.get('server.secret'));
let app = express();
let models = [];
console.clear();

app.use(bodyParser.json());

app.all('/', (req, res) => {
    res.send('Available paths: ' + models);
});

let formatLog = (str) => (new Date()).toDateString() + "::" + str + "\n";

let readData = (key = null) => {
    let data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    if (key) {
        return data[key];
    }
    return data;
};
let writeData = (key, value) => {
    let data = readData();
    if (data[key]) {
        data[key].push(value);
    } else {
        data[key] = [];
        data[key].push(value);
    }
    fs.writeFileSync('./data.json', JSON.stringify(data));
};

let replaceData = (key, value) => {
    let list = readData(key);
    let element = list.find(e => e.id === value.id);
    list.splice(list.indexOf(element), 1);
    list.push(value);

    let data = readData();
    data[key] = list;
    fs.writeFileSync('./data.json', JSON.stringify(data));
};

let deleteData = (key, value) => {
    let list = readData(key);
    let element = list.find(e => e.id === value.id);
    list.splice(list.indexOf(element), 1);

    let data = readData();
    data[key] = list;
    fs.writeFileSync('./data.json', JSON.stringify(data));
};

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

app.use(/* (check JWT here), */ (req, res, next) => {
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
            res.send(readData(m));
        });
        // CREATE
        app.put('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    writeData(m, values);
                    res.send(m + ' created.');
                })
                .catch((err) => next(err));
        });
        // UPDATE
        app.post('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    replaceData(m, values);
                    res.send(m + ' updated.');
                })
                .catch((err) => next(err));
        });
        // DELETE
        app.delete('/' + m.toLowerCase(), (req, res, next) => {
            let values = req.body;
            checkDataConstraints(model, values)
                .then(() => {
                    deleteData(m, values);
                    res.send(m + ' deleted.');
                })
                .catch((err) => next(err));
        });
    });

    app.use((err, req, res, next) => {
        if (err) {
            fs.writeFileSync('./logs/error.log', formatLog(JSON.stringify(err)), { flag: 'a' });
            console.log(jwt.UnauthorizedError);
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
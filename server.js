var express = require('express');
var http = require('http');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var fs = require('fs');
var moment = require('moment');
var _ = require('lodash');


var cluster = require('cluster');

if(cluster.isMaster) {
    var numWorkers = require('os').cpus().length;

    console.log('Master cluster setting up ' + numWorkers + ' workers...');

    for(var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {

    var app = express();
    app.use(morgan('dev'));
    app.use(express.static(__dirname));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());


    function getData(file, response){
        fs.readFile(file, 'utf-8', function(err, data){
            if(err){
                response.send(err);
            }
            response.status(200).send(data);
        });
    }

    function addTimeStamp(data){
        var mostRecentPost = data[0];
        var formattedDate = moment().format("MMM Do YYYY");
        mostRecentPost.date = formattedDate;
    }

    function writeData(file, data, request, response){
        if(data.length !== 0){
            addTimeStamp(data);
        }
        fs.writeFile(file, JSON.stringify(data), function(err){
            if(err){
                response.send(err);
            }
            getData(file, response);
        });
    }

    app.route('/content')
    .get(function(request, response){
        getData('data/data.json', response);
    })
    .post(function(request, response){
        writeData('data/data.json', request.body, request, response);
    });

    var server = http.createServer(app).listen(process.env.PORT || 3000);
    console.log('listening on port 3000');


}
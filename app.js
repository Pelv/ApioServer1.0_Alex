//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE *******************************
*									 *
* This file is part of ApioOS.						 *
*									 *
* ApioOS is free software released under the GPLv2 license: you can	 *
* redistribute it and/or modify it under the terms of the GNU General	 *
* Public License version 2 as published by the Free Software Foundation. *
*									 *
* ApioOS is distributed in the hope that it will be useful, but		 *
* WITHOUT ANY WARRANTY; without even the implied warranty of		 *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the		 *
* GNU General Public License version 2 for more details.		 *
*									 *
* To read the license either open the file COPYING.txt or		 *
* visit <http://www.gnu.org/licenses/gpl2.txt>				 *
*									 *
*************************************************************************/


"use strict";
var com = require("serialport")
var express = require("express");
var path = require("path");
var logger = require("morgan");
//var cookieParser = require("cookie-parser");
var mongoSession = require('express-session-mongo');
var bodyParser = require("body-parser");
var http = require("http");
var app = express();
var fs = require('fs');
var domain = require('domain');
var async = require('async');
var request = require('request');
var net = require('net');
var targz = require('tar.gz');
var formidable = require('formidable');
var crypto = require('crypto');
var MongoClient = require("mongodb").MongoClient;
var util = require('util')
var session = require('express-session')

var configuration = {};

if (process.argv.indexOf('--config') > -1)
    configuration = require(process.argv[process.argv.indexOf('--config') + 1]);
else
    configuration = require('./configuration/default.js');

if (process.argv.indexOf('--use-remote') > -1) {
    configuration.remote.enabled = true;
    configuration.remote.uri = process.argv[process.argv.indexOf('--use-remote') + 1]
}
if (process.argv.indexOf('--no-serial') > -1)
    configuration.serial.enabled = false;

if (process.argv.indexOf('--http-port') > -1) {
    var index = process.argv.indexOf('--http-port');
    configuration.http.port = process.argv[index + 1];
}
if (process.argv.indexOf('--serial-port') > -1) {
    var index = process.argv.indexOf('--serial-port');
    configuration.serial.port = process.argv[index + 1];
}

var Apio = require("./apio.js")(configuration);

var setupRemoteConnection = function() {
    if (configuration.remote.enabled) {
        Apio.Util.log("Setting up remote connection to "+configuration.remote.uri)
        var socket_cloud = require('socket.io-client')(configuration.remote.uri);
        Apio.Remote.Socket = socket_cloud;
        socket_cloud.on('error', function() {
            console.log("This apio instance cloudnt connect to remote host: " + configuration.remote.uri)

        })


        socket_cloud.on('connect', function() {
            //Devo notificare il cloud che sono online
            console.log("Sending the handshake to the cloud (" + configuration.remote.uri + "). My id is "+Apio.System.getApioIdentifier());
            socket_cloud.emit('apio.server.handshake', {
                apioId: Apio.System.getApioIdentifier()
            })
        })
        socket_cloud.on('apio.remote.handshake.test',function(data){
            Apio.Util.log("Received test from ApioCloud")
            var factor = data.factor;
            var test = crypto
                            .createHash('sha256')
                            .update(factor+":"+Apio.System.getApioSecret())
                            .digest('base64');
            Apio.Util.log("Sending the test answer to the remote");
            Apio.Remote.Socket.emit('apio.server.handshake.test',{"test" : test, apioId:Apio.System.getApioIdentifier()})

        })
        socket_cloud.on('apio.remote.handshake.test.success',function(data){
            Apio.Util.log("This ApioOS has been successfully authenticated on ApioCloud. Storing the Auth Token");
            Apio.Remote.token = data.token;
        })
        socket_cloud.on('apio.remote.handshake.test.error',function(data){
            Apio.Util.log("This ApioOS failed authentication on ApioCloud. Retrying...")
            if (Apio.Remote.connectionRetryCounter > 3) {
                Apio.Util.log("This ApioOS exceeded the number of connection retry available. Aborting ApioCloud connection. This problem may be Cloud related, check cloud.apio.cc/status for updates about our servers's status or contact us at support@apio.cc")
            } else {
                Apio.Remote.connectionRetryCounter++;
                Apio.Util.log("ApioCloud connection ")
                Apio.Remote.Socket.emit('apio.server.handshake',{
                    apioId: Apio.System.getApioIdentifier()
                })
            }

        })


        socket_cloud.on('apio.remote.sync.request', function(data) {
            console.log("The Apio Cloud is requesting sync data. I'm sending it")
            var payload = {
                apio: {
                    system: {
                        apioId: Apio.System.getApioIdentifier()
                    }
                }
            };
            async.series([

                    function(callback) {
                        Apio.Object.list(function(err, data) {
                            if (!err)
                                callback(null, data);
                            else
                                callback(err)
                        })

                    },
                    function(callback) {
                        Apio.State.list(function(err, data) {
                            if (!err)
                                callback(null, data);
                            else
                                callback(err)
                        })
                    },
                    function(callback) {
                        Apio.Event.list(function(err, data) {
                            if (!err)
                                callback(null, data);
                            else
                                callback(err)
                        })
                    }
                ],
                // optional callback
                function(err, results) {
                    payload.apio.objects = results[0];
                    payload.apio.states = results[1];
                    payload.apio.events = results[2];
                    payload.apio.system = {
                        apioId: Apio.System.getApioIdentifier().toString()
                    }
                    socket_cloud.emit('apio.server.sync', payload);
                    //Ora invio le appp
                    console.log("ApioOS>>> Compressing and packaging applications for the upload... ")
                    var compress = new targz().compress('./public/applications', './public/applications.tar.gz', function(err) {
                        if (err)
                            console.log(err);
                        else
                            console.log("ApioOS>>> Compressing ended! ")
                        var formData = {
                            applications: fs.createReadStream(__dirname + '/public/applications.tar.gz')
                        };
                        request.post({
                            url: configuration.remote.uri + '/apio/sync/' + Apio.System.getApioIdentifier(),
                            formData: formData
                        }, function optionalCallback(err, httpResponse, body) {
                            if (err) {
                                return console.error('ApioOS>>> Error while sending apps to :' + configuration.remote.uri + '/apio/sync/', err);
                            }
                            console.log('ApioOS>>>> Applications Upload successful!');

                            Apio.Database.db.stats(function(err, stats){
                                if(err){
                                    console.log("+++++++++++++++ERROR+++++++++++++++");
                                    console.log(err);
                                }
                                //else if(parseInt(stats.storageSize)/1024/1024 >= 100){
                                else if(stats.storageSize){
                                    console.log("DB reached to maximum size, sending logs to cloud");
                                    Apio.Database.db.collection("Objects").find().toArray(function(error, objs) {
                                        if(error){
                                            console.log("Unable to execute query in collection Objects");
                                        }
                                        else if(objs){
                                            for(var i in objs){
                                                if(objs[i].log){
                                                    var send = {
                                                        //log : objs[i].log,
                                                        objectId : objs[i].objectId
                                                    };
                                                    /*for(var j in objs[i].log){
                                                        send[j] = objs[i].log[j];
                                                    }*/
                                                    Apio.Remote.socket.emit('apio.server.object.log.update', send);
                                                    Apio.Database.db.collection("Objects").update({ objectId : objs[i].objectId }, { $set : { log : {} } }, function(error_, result){
                                                        if(error_){
                                                            console.log("Unable to update object with objectId "+objs[i].objectId);
                                                        }
                                                        else if(result){
                                                            Apio.Database.db.command({ compact: 'Objects', paddingFactor: 1 }, function(err_, result_){
                                                                if(err_){
                                                                    console.log("Unable to compact collection Objects");
                                                                }
                                                                else if(result_){
                                                                    console.log("Return is:");
                                                                    console.log(result_);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            });

                        });
                    });
                });


        })
        socket_cloud.on('apio.remote.state.create', function(data) {
            console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
            console.log(data)
            Apio.State.create(data.state, data.event, function() {
                console.log('apio.remote.state.create')

                Apio.io.emit('apio.server.state.create', data.state); //Notifico tutti i client
            })
        });
        socket_cloud.on('apio.remote.state.delete', function(data) {
            Apio.State.delete(data.stateName, function() {
                console.log('apio.remote.state.delete')
            })
        });
        socket_cloud.on('apio.remote.state.update', function(data) {
            Apio.State.update(data.stateName, data.state, function() {
                console.log('apio.remote.state.update')
            })
        });
        socket_cloud.on('apio.remote.state.apply', function(data) {
            Apio.State.apply(data.stateName, function() {
                console.log("apio.remote.state.apply " + data.stateName)
            })
        });
        socket_cloud.on('apio.remote.event.create', function(data) {
            Apio.Util.log("New event created on the cloud")
            console.log(data)
            Apio.Event.create(data,function(){
                console.log("Event from the cloud successfully created")
            })
        });
        socket_cloud.on('apio.remote.event.delete', function(data) {
            Apio.Event.delete(data.name,function(err){
                Apio.Util.log("Deleted event "+data.name+"")
            })
        });
        socket_cloud.on('apio.remote.event.update', function(data) {
            Apio.Util.log("Updating event from athe Cloud...")
            Apio.Event.update(data.name,data.eventUpdate,function(){
                Apio.Util.log("Event Updated")
            })

        });
        socket_cloud.on('apio.remote.event.launch', function(data) {
            Apio.Util.log("Launching event from the cloud.")
        });
        socket_cloud.on('apio.remote.object.create', function(data) {
            Apio.Util.log("Syncing new object from the cloud.")
        });
        socket_cloud.on('apio.remote.object.list', function(data) {

            console.log("The remote server wants the object list")
            Apio.Object.list(function(err, data) {
                if (err)
                    socket_cloud.emit('apio.server.object.list', {
                        status: false,
                        error: err
                    })
                else
                    socket_cloud.emit('apio.server.object.list', {
                        status: true,
                        objects: data
                    })
            })
        });
        socket_cloud.on('apio.remote.object.delete', function(data) {
            Apio.Util.log("Deleting object from the cloud.")
        });
        socket_cloud.on('apio.remote.object.update', function(data) {
            Apio.Util.log("Updating object from the cloud.")
        });



        socket_cloud.on('apio_server_update', function(data) {


            Apio.Util.log("Received an update from the cloud. Please rename this event to apio.server.object.update");

            //Loggo ogni richiesta
            //Commentato per capire cosa fare con sti log
            //Apio.Logger.log("EVENT",data);

            //Scrivo sul db
            if (data.writeToDatabase === true) {
                Apio.Database.updateProperty(data, function() {
                    //Connected clients are notified of the change in the database

                    Apio.io.emit("apio_server_update", data);
                    console.log("data vale: ");
                    console.log(data);
                    console.log("data.properties vale:");
                    console.log(data.properties);

                });
            } else
                Apio.Util.debug("Skipping write to Database");


            //Invio i dati alla seriale se richiesto
            if (data.writeToSerial === true && Apio.Configuration.serial.enabled == true) {
                Apio.Serial.send(data);
            } else
                Apio.Util.debug("Skipping Apio.Serial.send");





        });
        socket_cloud.on('disconnect', function() {});
    }
}

/*var APIO_CONFIGURATION = {
    port : 8083
}
var ENVIRONMENT = "production";
if (process.argv.indexOf('--no-serial') > -1)
    ENVIRONMENT = "development"
if (process.argv.indexOf('--http-port') > -1) {
    var index = process.argv.indexOf('--http-port');
    configuration.http.port = process.argv[index+1];
}
if (process.argv.indexOf('--serial-port') > -1) {
    var index = process.argv.indexOf('--serial-port');
    configuration.serial.port = process.argv[index+1];
}

if (process.argv.indexOf('--profile') > -1) {
    console.log("Profiling Apio Server")
    var memwatch = require('memwatch');
    var prettyjson = require('prettyjson');
    var hd = new memwatch.HeapDiff();
    memwatch.on('leak', function(info) {
        console.log("\n\nMEMORY LEAK DETECTED")
        console.log(prettyjson.render(info));
        console.log("\n\n")
    });
    memwatch.on('stats', function(stats) {
        console.log("Stats")
        console.log(prettyjson.render(stats));
        var diff = hd.end();
        console.log(prettyjson.render(diff));
        hd = new memwatch.HeapDiff();
    });

}

if (process.argv.indexOf('--logmemory') > -1) {
    fs.appendFileSync('memory.log',"--- "+(new Date()).toString()+"\n")
    setInterval(function(){
        fs.appendFileSync('memory.log', process.memoryUsage().heapUsed+"\n");
    },5*1000)
}*/


var HOST = '192.168.1.109';
var PORT = 6969;

var routes = {};
routes.dashboard = require('./routes/dashboard.route.js')(Apio);
routes.events = require('./routes/events.js')(Apio);
routes.states = require('./routes/states.js')(Apio);
routes.objects = require('./routes/objects.js')(Apio);
routes.notifications = require('./routes/notifications.js')(Apio);
routes.users = require('./routes/users.js')(Apio);



var d = domain.create();
// Because req and res were created before this domain existed,
    // we need to explicitly add them.
    // See the explanation of implicit vs explicit binding below.


    //Il domain è un "ambiente chiuso" in cui far finire gli errori per non crashare il server
    //L'alternativa è fail fast e restart ma non mi piace
d.on('error',function(err){
    //Apio.Util.debug("Apio.Server error : "+err);
    //Apio.Util.debug(err.stack);
    Apio.Util.printError(err);
});

d.run(function(){


function puts(error, stdout, stderr) {
    sys.puts(stdout);
}


if (Apio.Configuration.serial.enabled === true){
  com.list(function (err, ports) {
    if (err) {
      Apio.Util.debug("Unable to get serial ports, error: ", err);
    } else {
      ports.forEach(function (port) {
      console.log(port);
      if(String(port.manufacturer) === configuration.serial.manufacturer){
        configuration.serial.port = String(port.comName);
        Apio.Serial.init();
      }
    });
    }
  });
}

Apio.Socket.init(http);
//Apio.Mosca.init();
Apio.Database.connect(function(){
    /*
    Inizializzazione servizi Apio
    Fatti nel callback della connessione al db perchè ovviamente devo avere il db pronto come prima cosa
    */

    Apio.System.resumeCronEvents(); //Ricarica dal db tutti i cron events
    setupRemoteConnection();
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");


app.use(logger("dev"));
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));
app.use(session({
    store: new mongoSession({
        db: configuration.database.database
    }),
    secret: 'e8cb0757-f5de-4c109-9774-7Bf45e79f285',
    resave: true,
    saveUninitialized: true
}))

app.use(express.static(path.join(__dirname, "public")));

app.post('/apio/log',function(req,res){
    var log_entry = {
        timestamp : Date.now(),
        source : req.body.log.source || null, //Una stringa che identifica chi ha prodotto questo log
        event : req.body.log.event || null, //Una stringa che identifica il tipo di evento
        value : req.body.log.value || null, //Un valore assegnato all'evento
    }

    Apio.Logger.log(log_entry);
})

app.get('/', function(req, res) {
    res.sendfile('public/html/index.html');
})
app.get('/admin', function(req, res) {
    res.sendfile('public/html/settings.html');
})



app.post('/apio/user/setCloudAccess', function(req, res) {
    var user = req.body.user;
    var flag;
    if (req.body.cloudAccess === true)
        flag = true
    else
        flag = false;

    Apio.Database.db.collection('Users').update({
        email: user.email
    }, {
        $set: {
            'enableCloud': flag
        }
    }, function(err) {
        if (err) {
            Apio.Util.log("Unable to enable the user " + user.email + " on the cloud due to a local database error.")
            console.log(err);
        } else {
            Apio.Util.log("The user has been locally enabled to access the cloud. Now telling ApioCloud...")
            Apio.Util.log("Contacting ApioCloud to enable user "+user.email+" ...")
            request.post(configuration.remote.uri + '/apio/user/' + user.email + '/editAccess', {
                form: {
                    "apioId": Apio.System.getApioIdentifier(),
                    "grant": flag
                }
            }, function(err, httpResponse, body) {
                Apio.Util.log("ApioCloud responded with ("+body+").")
                var response = JSON.parse(body);
                res.send(response)
            })
        }
    })

})

app.post('/apio/adapter',function(req,res){
                var req_data = {
                        json : true,
                        uri : req.body.url,
                        method : "POST",
                        body : req.body.data
                }
                console.log("\n\n /apio/adapter sending the following request")
                console.log(req_data);
                console.log("\n\n")
                var _req = request(req_data,function(error,response,body){
                        if ('undefined' !== typeof response){
                            if ('200' === response.statusCode || 200 === response.statusCode) {
                            console.log("Apio Adapter method : got the following response from "+req.body.url)
                            console.log(body);
                            res.send(body)
                            }
                            else {
                                console.log("Apio Adapter : Something went wrong ")
                                res.status(response.statusCode).send(body);
                            }
                        } else {
                            res.status(500).send();
                        }

                });
})



//New: Rotta che gestisce il restore del database
app.get('/apio/restore', function(req, res){
      var sys = require('sys');
      var exec = require('child_process').exec;
      console.log("Qui");
      var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio", function (error, stdout, stderr) {
          //sys.print('stdout: '+stdout);
          //sys.print('stderr: '+stderr);
          if (error !== null) {
              console.log('exec error: '+error);
          }
      });
      res.status(200).send({});
  });

app.get("/dashboard",routes.dashboard.index);


/*Shutdown*/
    app.get('/apio/shutdown', function(req, res){
        var sys = require('sys');
        var exec = require('child_process').exec;
        var child = exec("sudo shutdown -h now", function (error, stdout, stderr) {
            //sys.print('stdout: '+stdout);
            //sys.print('stderr: '+stderr);
            if (error !== null) {
                console.log('exec error: '+error);
            }
        });
    });



/*
*   Crea un nuovo evento
**/
app.post("/apio/event",routes.events.create);

app.get('/apio/notifications',routes.notifications.list);
app.get('/apio/notifications/listDisabled',routes.notifications.listdisabled);
app.post('/apio/notifications/markAsRead',routes.notifications.delete);
app.post('/apio/notifications/disable',routes.notifications.disable);
app.post('/apio/notifications/enable',routes.notifications.enable);


//Routes
app.post('/apio/user', routes.users.create)
app.get('/apio/user', routes.users.list)
app.post('/apio/user/authenticate', routes.users.authenticate)
app.get('/apio/user/logout', routes.users.logout)


    app.post('/apio/notify',function(req,res){
        console.log("REQ");
        console.log(req.body);

        Apio.Database.db.collection('Objects').findOne({objectId : req.body.objectId}, function(err, data){
        //Apio.Database.db.collection('Objects').findOne({objectId : "1000"}, function(err, data){
            if(err){
                console.log("Unable to find object with id "+req.body.objectId);
                //console.log("Unable to find object with id 1000");
            }
            else{
                var notifica = {
                    objectId : req.body.objectId,
                    //objectId : "1000",
                    timestamp : new Date().getTime(),
                    objectName : data.name,
                    properties : {}
                };
                for(var i in req.body){
                    if(i !== "objectId"){
                        notifica.properties[i] = req.body[i];
                        notifica.message = data.notifications[i][req.body[i]];
                    }
                }
                Apio.System.notify(notifica);
                Apio.Database.db.collection("States").findOne({objectId : notifica.objectId, properties : notifica.properties}, function(err, foundState){
                    if(err){
                        console.log("Unable to find States for objectId "+notifica.objectId);
                    }
                    else if(foundState){
                        var stateHistory = {};

                        var getStateByName = function(stateName,callback) {
                            Apio.Database.db.collection('States').findOne({name : stateName},callback);
                        };
                        //Mi applica lo stato se non è già stato applicato
                        /*var applyStateFn = function(stateName) {

                         console.log("\n\nApplico lo stato "+stateName+"\n\n")
                         if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
                         getStateByName(stateName,function(err,state){
                         if (err) {
                         console.log("applyState unable to apply state")
                         console.log(err);
                         }
                         else if(state){
                         if (state.active == true){
                         Apio.Database.db.collection('States').update({name : state.name},{$set : {active : false}},function(errOnActive){
                         if (errOnActive) {
                         console.log("Impossibile settare il flag dello stato");
                         res.status(500).send({error : "Impossibile settare il flag dello stato"})
                         } else {
                         var s = state;
                         s.active = false;
                         Apio.io.emit('apio_state_update',s);
                         res.send({error:false});
                         }
                         })
                         }
                         else {
                         Apio.Database.db.collection('States').update({name : state.name},{$set : {active : true}},function(err){
                         if (err)
                         console.log("Non ho potuto settare il flag a true");
                         })
                         console.log("Lo stato che sto per applicare è ")
                         console.log(state)
                         Apio.Database.updateProperty(state,function(){
                         stateHistory[state.name] = 1;
                         //Connected clients are notified of the change in the database
                         Apio.io.emit("apio_server_update",state);
                         if (ENVIRONMENT == 'production') {
                         Apio.Serial.send(state, function(){
                         console.log("SONO LA CALLBACK");
                         //Ora cerco eventuali eventi
                         Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                         if (err) {
                         console.log("error while fetching events");
                         console.log(err);
                         }
                         console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                         console.log(data)
                         //data è un array di eventi
                         data.forEach(function(ev,ind,ar){
                         var states = ev.triggeredStates;
                         states.forEach(function(ee,ii,vv){
                         applyStateFn(ee.name);
                         })
                         })
                         res.send({});
                         })
                         pause(500);
                         });
                         }
                         else{
                         Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                         if (err) {
                         console.log("error while fetching events");
                         console.log(err);
                         }
                         console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                         console.log(data)
                         //data è un array di eventi
                         data.forEach(function(ev,ind,ar){
                         var states = ev.triggeredStates;
                         states.forEach(function(ee,ii,vv){
                         applyStateFn(ee.name);
                         })
                         })
                         res.send({});
                         })
                         pause(500);
                         }
                         });
                         }
                         }
                         })
                         } else {
                         console.log("Skipping State application because of loop.")
                         }
                         } //End of applyStateFn*/
                        var arr = [];
                        var applyStateFn = function(stateName, callback, eventFlag) {
                            console.log("\n\nApplico lo stato "+stateName+"\n\n")
                            if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
                                getStateByName(stateName,function(err,state){
                                    if (err) {
                                        console.log("applyState unable to apply state")
                                        console.log(err);
                                    }
                                    else if(eventFlag){
                                        arr.push(state);
                                        Apio.Database.db.collection('States').update({name : state.name},{$set : {active : true}},function(err){
                                            if (err)
                                                console.log("Non ho potuto settare il flag a true");
                                        });
                                        console.log("Lo stato che sto per applicare è ");
                                        console.log(state);
                                        Apio.Database.updateProperty(state,function(){
                                            stateHistory[state.name] = 1;
                                            //Connected clients are notified of the change in the database
                                            Apio.io.emit("apio_server_update",state);
                                            Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                                                if (err) {
                                                    console.log("error while fetching events");
                                                    console.log(err);
                                                }
                                                console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                                                console.log(data);
                                                if(callback && data.length == 0){
                                                    callback();
                                                }
                                                //data è un array di eventi
                                                data.forEach(function(ev,ind,ar){
                                                    var states = ev.triggeredStates;
                                                    states.forEach(function(ee,ii,vv){
                                                        applyStateFn(ee.name, callback, true);
                                                    })
                                                });
                                                res.send({});
                                            });
                                        });
                                    }
                                    else{
                                        if (state.active == true){
                                            Apio.Database.db.collection('States').update({name : state.name},{$set : {active : false}},function(errOnActive){
                                                if (errOnActive) {
                                                    console.log("Impossibile settare il flag dello stato");
                                                    res.status(500).send({error : "Impossibile settare il flag dello stato"})
                                                } else {
                                                    var s = state;
                                                    s.active = false;
                                                    Apio.io.emit('apio_state_update',s);
                                                    res.send({error:false});
                                                }
                                            })
                                        }
                                        else {
                                            arr.push(state);
                                            Apio.Database.db.collection('States').update({name : state.name},{$set : {active : true}},function(err){
                                                if (err)
                                                    console.log("Non ho potuto settare il flag a true");
                                            });
                                            console.log("Lo stato che sto per applicare è ");
                                            console.log(state);
                                            Apio.Database.updateProperty(state,function(){
                                                stateHistory[state.name] = 1;
                                                //Connected clients are notified of the change in the database
                                                Apio.io.emit("apio_server_update",state);
                                                Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                                                    if (err) {
                                                        console.log("error while fetching events");
                                                        console.log(err);
                                                    }
                                                    console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                                                    console.log(data);
                                                    if(callback && data.length == 0){
                                                        callback();
                                                    }
                                                    //data è un array di eventi
                                                    data.forEach(function(ev,ind,ar){
                                                        var states = ev.triggeredStates;
                                                        states.forEach(function(ee,ii,vv){
                                                            applyStateFn(ee.name, callback, true);
                                                        })
                                                    });
                                                    res.send({});
                                                });
                                            });
                                        }
                                    }
                                })
                            } else {
                                console.log("Skipping State application because of loop.")
                            }
                        }; //End of applyStateFn

                        applyStateFn(foundState.name, function(){
                            if(ENVIRONMENT == "production") {
                                var pause = function (millis) {
                                    var date = new Date();
                                    var curDate = null;
                                    do {
                                        curDate = new Date();
                                    } while (curDate - date < millis);
                                };
                                console.log("arr vale:");
                                console.log(arr);
                                for (var i in arr) {
                                    Apio.Serial.send(arr[i], function () {
                                        pause(100);
                                    });
                                }
                                arr = [];
                            }
                        }, false);
                    }
                });
            }
        });
    });

/* Returns all the events */
app.get("/apio/event",routes.events.list)
/* Return event by name*/
app.get("/apio/event/:name",routes.events.getByName)

app.delete("/apio/event/:name",routes.events.delete)

app.put("/apio/event/:name",routes.events.update);

/****************************************************************
****************************************************************/

app.post("/apio/state/apply",routes.states.apply);
/*app.post("/apio/state/apply",function(req,res){
    console.log("Ciao vorresti applicare uno stato, ma non puoi.")
    res.send({});
});*/

app.delete("/apio/state/:name",function(req,res){
    console.log("Mi arriva da eliminare questo: "+req.params.name)
    Apio.Database.db.collection("States").findAndRemove({name : req.params.name}, function(err,removedState){
        if (!err) {
            Apio.io.emit("apio_state_delete", {name : req.params.name});
            Apio.Database.db.collection("Events").remove({triggerState : req.params.name}, function(err){
                if(err){
                    res.send({error : 'DATABASE_ERROR'});
                }
                else{
                    Apio.io.emit("apio_event_delete", {name : req.params.name});
                }
            });
            if (removedState.hasOwnProperty('sensors')) {

              removedState.sensors.forEach(function(e,i,a){
                var props = {};
                props[e] = removedState.properties[e];
                Apio.Serial.send({
                  'objectId' : removedState.objectId,
                  'properties' : props
                })

              })


            }

            res.send({error : false});
        }
        else
            res.send({error : 'DATABASE_ERROR'});
    })
})


app.put("/apio/state/:name",function(req,res){
    console.log("Mi arriva da modificare questo stato: "+req.params.name);
    console.log("Il set di modifiche è ")
    console.log(req.body.state);

    var packagedUpdate = { properties : {}};
    for (var k in req.body.state) {
        packagedUpdate.properties[k] = req.body.state[k];
    }

    Apio.Database.db.collection("States").update({name : req.params.name},{$set : packagedUpdate},function(err){
        if (!err) {
            Apio.io.emit("apio_state_update",{name : req.params.name, properties : req.body.state});
            res.send({error : false});
        }
        else
            res.send({error : 'DATABASE_ERROR'});
    })
})


/*
    Creazione stato
 */
app.post("/apio/state",routes.states.create);


/*
    Returns state list
 */
app.get("/apio/state",routes.states.list);
/*
Returns a state by its name
 */
app.get("/apio/state/:name",routes.states.getByName);


//TODO sostituire l'oggetto 1 con un oggetto verify in maniera tale da evitare la presenza di un oggetto.
//O guardare il discorso del pidfile.h
app.get("/app",
  function(req, res, n) {
            if (req.session.hasOwnProperty('email'))
                n();
            else {
                console.log("Unauthorized access redirected to login screen")
                res.redirect('/');
            }
        }, function(req, res) {

          console.log("Richiesta /app")
          Apio.Database.db.collection('Users').findOne({
                 name: "verify"
               }, function(err, doc) {
                   if (err) {
                     var sys = require('sys');
                     var exec = require('child_process').exec;
                     var child = exec("mongorestore ./data/apio -d apio");


                    } else {
                      if(doc){
                      console.log("Il database c'è faccio il dump");
                      var sys = require('sys');
                      var exec = require('child_process').exec;
                      var child = exec("mongodump --out ./backup");



                      } else {
                    console.log("Il database non c'è faccio il restore");
                     var sys = require('sys');
                     var exec = require('child_process').exec;
                     var child = exec("mongorestore ./data/apio -d apio");
                      }

                    }
             })
            res.sendfile("public/html/app.html");
})


/*
*   Lancia l'evento
*/
app.get("/apio/event/launch",routes.events.launch)
/*
*   restituisce la lista degli eventi
*/
app.get("/apio/event",routes.events.list)

/// error handlers

// development error handler
// will print stacktrace
/*
if (app.get("env") === "development" || ENVIRONMENT === "development") {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        console.log("========== ERROR DETECTED ===========")
        console.log(err);
        res.send({
            status : false,
            errors: [{message : err.message}]
        });
        //Da testare
        next();
    });
}



// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({status : false});
    console.log(err);
    //Da testare
    next();
});
*/


//FIXME andrebbero fatte in post per rispettare lo standard REST
/*
app.post('/apio/serial/send',function(req,res){

         var keyValue = req.body.message;
            if (req.body.isSensor === true)
                keyValue = 'r'+keyValue;
            var keyValue = keyValue.slice(0,-1);
            var tokens = keyValue.split(":");
            var props = {};
            props[tokens[0]] = tokens[1];

            var obj = {
                objectId: req.body.objectId,
                properties : props
            };
            console.log("Questo è loggetto che arriva da /apio/serial/send")
            console.log(obj);

            Apio.Serial.send(obj);
            res.send();
});
*/
app.post('/apio/serial/send',function(req,res){

            var obj = req.body.data;
            console.log("\n\n%%%%%%%%%%\nAl seria/send arriva questp")
            console.log(obj)
            console.log("\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n\n")
            Apio.Serial.send(obj);
            res.send({status : true});
});



/* APIO creation and export of the .tar container of the App */
app.get('/apio/app/export', routes.dashboard.exportApioApp);

/* APIO export of the arduino sketchbook file NUOVA*/
app.get('/apio/app/exportIno', routes.dashboard.exportInoApioApp);

/* APIO upload of the App */
app.post('/apio/app/upload', routes.dashboard.uploadApioApp);

/* APIO recovery of the actual maximum id in mongo -> apio -> Objects */
app.post('/apio/app/maximumId', routes.dashboard.maximumIdApioApp);

/* APIO clone from the git repo of a standard Apio App*/
app.post('/apio/app/gitCloneApp', routes.dashboard.gitCloneApp);

/* APIO delete of the App */
app.post('/apio/app/delete', routes.dashboard.deleteApioApp);

/* APIO make an empty App folder */
app.post('/apio/app/folder', routes.dashboard.folderApioApp);

/* APIO modify of the App (it's binded in launch.js and it's used to launch the editor with the updating parameters)*/
app.post('/apio/app/modify', routes.dashboard.modifyApioApp);

/*APIO update of the application for a specified object (it's binded in editor.js and do the actual update of an application)*/
app.post('/apio/database/updateApioApp', routes.dashboard.updateApioApp);

/*APIO creation of the new ino html js mongo files from the wizard*/
app.post('/apio/database/createNewApioAppFromEditor', routes.dashboard.createNewApioAppFromEditor);

/*APIO creation of the new ino html js mongo files from the wizard*/
app.post('/apio/database/createNewApioApp', routes.dashboard.createNewApioApp);


app.get('/apio/database/getObjects',routes.objects.list);
app.get('/apio/database/getObject/:id',routes.objects.getById);

app.patch('/apio/object/:id',routes.objects.update);
app.put('/apio/object/:id',routes.objects.update);

app.get("/apio/object/:obj", function(req, res){
        Apio.Database.db.collection('Objects').findOne({objectId : req.params.obj},function(err, data){
            if (err) {
                console.log("Error while fetching object "+req.params.obj);
                res.status(500).send({error : "DB"});
            }
            else {
                res.status(200).send(data);
            }
        });
    });

    app.get("/apio/objects", function(req, res){
        Apio.Database.db.collection('Objects').find().toArray(function(err, data){
            if (err) {
                console.log("Error while fetching objects");
                res.status(500).send({error : "DB"});
            }
            else {
                var json = {};
                for(var i in data){
                    json[i] = data[i];
                }
                res.status(200).send(json);
            }
        });
    });

    app.post("/apio/updateListElements", function(req, res){
        for(var i in req.body){
            if(i != "objectId"){
                var update = {};
                update[i] = req.body[i];
            }
        }
        Apio.Database.db.collection('Objects').update({objectId : req.body.objectId}, {$set : {'db' : update, 'notifications' : update}}, function(err){
        //Apio.Database.db.collection('Objects').update({objectId : "1000"}, {$set : {'db' : update, 'notifications' : update}}, function(err){
            if (err) {
                res.status(500).send({status : false});
            }
            else {
                res.status(200).send({status : true});
                Apio.io.emit("list_updated", update);
            }
        });
    });


//Handling Mosca pub sub manager
//
//module.exports = app;
/*
*   Mosca listener instantiation
*/
/*Apio.Mosca.server.on('clientConnected', function(client) {
  console.log('client connected', client.id);
});

Apio.Mosca.server.on('published', function(packet, client) {
  console.log('Published', packet.payload);
});
//Handling Serial events and emitting
//APIO Serial Port Listener
//module.exports = app;
/*
*   Socket listener instantiation
*/
Apio.io.on("connection", function(socket){
    socket.on("input", function(data){
        console.log(data);
        Apio.Database.updateProperty(data, function(){
            socket.broadcast.emit("apio_server_update_", data);
        });
        console.log("input");
        console.log(data);
        Apio.Serial.send(data);
    });

    //Streaming
    socket.on("apio_client_stream", function(data){
        socket.broadcast.emit("apio_server_update", data);
        console.log("apio_client_stream");
        console.log(data)
        Apio.Serial.stream(data);
    })


    console.log("a socket connected");
    var sys = require('sys');
    var exec = require('child_process').exec;
    var child = exec("hostname -I", function (error, stdout, stderr) {
        sys.print("Your IP address is: "+stdout);
        //sys.print('stderr: '+stderr);
        if (error !== null) {
            console.log('exec error: '+error);
        }
    });
    socket.join("apio_client");

    socket.on('apio_notification', function(data) {
                console.log("> Arrivato un update, mando la notifica");
                //Prima di tutto cerco la notifica nel db
                console.log(data);
                //Controllo Se esiste uno stato che rispecchia lo stato attuale dell'oggetto
                if ('string' === typeof data)
                    data = JSON.parse(data)
                console.log(typeof data);

                Apio.Database.db.collection('Objects').findOne({
                    address : data.address
                }, function(err, document) {
                    if (err) {
                        console.log('Apio.Serial.read Error while looking for notifications');
                    } else {
                        console.log("Aggiorno data")
                        data.objectId = document.objectId;

                        if (document.hasOwnProperty('notifications')) {
                            for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                                if (document.notifications.hasOwnProperty(prop)) {
                                //Ho trovato una notifica da lanciare
                                if (document.notifications[prop].hasOwnProperty(data.properties[prop])) {
                                    console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                                    Apio.Database.getObjectById(data.objectId, function(result) {
                                        var notifica = {
                                            objectId: data.objectId,
                                            objectName: result.objectName,
                                            message: document.notifications[prop][data.properties[prop]],
                                            properties: data.properties,
                                            timestamp: new Date().getTime()
                                        };
                                        console.log("Mando la notifica");
                                        Apio.System.notify(notifica);
                                    });
                                } //Se ha una notifica per il valore attuale
                                else {
                                    console.log("Ho una notifica registarata per quella property ma non per quel valore")
                                }


                            } else {
                                console.log("L'oggetto non ha una notifica registrata per la proprietà " + prop)
                            }
                        }
                    }
                                    Apio.Database.db.collection('States')
                    .find({
                        objectId: data.objectId
                    })
                    .toArray(
                        function(err, states) {
                        console.log("CI sono " + states.length + " stati relativi all'oggetto " + data.objectId)
                        var sensorPropertyName = Object.keys(data.properties)[0]
                        states.forEach(function(state) {
                            if (state.hasOwnProperty('sensors') && state.sensors.length > 0) {
                                if (state.sensors.indexOf(sensorPropertyName) > -1 && state.properties[sensorPropertyName] == data.properties[sensorPropertyName]) {

                                    console.log("Lo stato " + state.name + " è relativo al sensore che sta mandando notifiche ed il valore corrisponde")
                                    data.message = state.name
                                    Apio.System.notify(data);
                                } else {
                                    console.log("Lo stato " + state.name + " NON è relativo al sensore che sta mandando notifiche")
                                }
                            }
                        })
                        Apio.Database.updateProperty(data, function() {
                        Apio.io.emit('apio_server_update', data);
                        //Apio.Remote.socket.emit('apio.server.object.update', data);

                        Apio.Database.db.collection('Objects')
                            .findOne({
                                objectId: data.objectId
                            }, function(err, obj_data) {
                                if (err || obj_data === null) {
                                    console.log("An error has occurred while trying to figure out a state name")
                                } else {
                                    Apio.Database.db.collection('States')
                                        .find({
                                            objectId: obj_data.objectId
                                        }).toArray(function(error, states) {
                                            console.log("\n\n@@@@@@@@@@@@@@@@@@@")
                                            console.log("Inizio controllo stati")
                                            console.log("Ho " + states.length + " stati relativi all'oggetto " + obj_data.objectId);
                                            states.forEach(function(state) {

                                                var test = true;
                                                for (var key in state.properties)
                                                    if (state.properties[key] !== obj_data.properties[key])
                                                        test = false;
                                                if (test === true) {
                                                    console.log("Lo stato " + state.name + " corrisponde allo stato attuale dell'oggetto")

                                                    Apio.System.applyState(state.name, function(err) {

                                                        if (err) {
                                                            console.log("An error has occurred while applying the matched state")
                                                        }
                                                    }, true)


                                                }
                                            })

                                            console.log("Fine controllo degli stati\n\n@@@@@@@@@@@@@@@@@@@@@@@")
                                        });
                                }
                            })
                        });
                    })
                })




        })
        socket.on("input", function(data) {
            console.log(data);
            Apio.Database.updateProperty(data, function() {
                socket.broadcast.emit("apio_server_update_", data);
            });
            Apio.Serial.send(data);
        });

        //Streaming
        socket.on("apio_client_stream", function(data) {
            socket.broadcast.emit("apio_server_update", data);
            Apio.Serial.stream(data);
        })

        socket.on("apio_client_update", function(data){
            Apio.Object.update(data,function(){
                //Apio.Remote.socket.emit('apio.server.object.update',data)
            })
        });

});


Apio.io.on("disconnect",function(){
    console.log("Apio.Socket.event A client disconnected");
});


  //http.globalAgent.maxSockets = Infinity;
  var server = http.createServer(app);


    Apio.io.listen(server);
    server.listen(configuration.http.port, function() {
        Apio.Util.log("APIO server started on port " + configuration.http.port + " using the configuration:");
        console.log(util.inspect(configuration,{colors:true}));
    });






});

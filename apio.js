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


//apio.js
/*
 *	jshint strict: true
 *
 */
 //apio.js
 /*
  *  jshint strict: true
  *
  */
 module.exports = function(config) {
    "use strict";
    /*
	@module Apio
*/
    var Apio = {};

    /* Dependencies */
    var com = require("serialport"); //Modulo comunicazione con la seriale
    var MongoClient = require("mongodb").MongoClient;
    var PrettyError = require('pretty-error');
    var jade = require("jade");
    var CronJob = require('cron').CronJob;
    var time = require('time');
    var fs = require("fs");
    var mqtt = require("mqtt");
    var mosca = require('mosca');
    var request = require('request');
    var crypto = require('crypto');
    var uuidgen = require('node-uuid');
    var async = require('async')
    Apio.Configuration = config;
    /* Set to false to disable debugging messages */
    Apio.DEBUG = true;



    /* Set to false to disable debugging messages */
    Apio.DEBUG = true;

    //TODO incapsulare l'oggetto Apio
    Apio.getService = function(serviceName) {
      if ("undefined" == typeof Apio[serviceName])
        throw new Error("APIO::SDK::ERROR There is no sercvice named " + serviceName);
    };

    /*
     *	Apio Util Service
     */
    Apio.Util = {};

    //TODO implementa servizio Apio.Logger
    Apio.Util.debug = function(message) {
      if (Apio.DEBUG === true)
        console.log(message);
    };
    /*
     *	Returns true if value is not null or undefined
     */
    Apio.Util.isSet = function(value) {
      if (value !== null && "undefined" !== typeof value)
        return true;
      return false;
    };
    Apio.Util.printError = function(error) {
        var pe = new PrettyError();
        var renderedError = pe.render(error);
        console.log(renderedError);
      }
      /*
       *	Convert a JSON object into a string written in the Codifica Apio and return it
       */
    Apio.Util.JSONToApio = function(obj) {

      var string = "";
      string += obj.protocol + obj.objectId + ":";
      //Se siamo in receiveSerialData, mi serve gestire il campo command
      if (obj.hasOwnProperty("command"))
        string += obj.command + ":";
      //Aggiungo tutte le proprietà
      for (var key in obj.properties)
        string += key + ":" + obj.properties[key] + "-";

      return string;
    };
    Apio.Util.log = function(str) {
        console.log('[' + (new Date()) + '] ApioOS >>> ' + str);
    }
    /*
     *	Convert a string written in the Codifica Apio into a JSON object  and return it
     */
    Apio.Util.ApioToJSON = function(str) {
      //var regex = /(.[a-z0-9])*\:([a-z0-9]*\:[a-z0-9]*\-).*/gi;
      var regex = /([lz])?(\w+)\:(send|update|hi|register|request+)?\:?([\w+\:(\w|\w\.\w)+\-]+)/;
      var match = regex.exec(str);
      var obj = {};
      if (Apio.Util.isSet(match[1]))
        obj.protocol = match[1];
      obj.objectId = match[2];
      if (Apio.Util.isSet(match[3]))
        obj.command = match[3];
      var mess = match[4];
      obj.properties = {};
      var index = mess.indexOf(":-");
      mess = mess.split("-");
      if (index > -1 && index != mess.length - 1) {
        mess[1] = "-" + mess[1];
        mess[0] += mess[1];
      }
      mess.pop();
      mess.forEach(function(e) {
        //newline
        var e = mess[0]; //Ignoring everything after the "-" character
        console.log("Prima di splittare la stringa codificata" + e);
        var t = e.split(":");
        console.log("Dopo aver splittato la stringa codificata");
        console.log(t);
        obj.properties[t[0]] = t[1];
      });

      return obj;
    };

    Apio.Util.setCurrentHTTPRequest = function(req) {
      Apio.Util._httpRequest = req;
    }
    Apio.Util.getCurrentHTTPRequest = function() {
      return Apio.Util._httpRequest;
    }

    /**
     *	Apio Logger Service
     *	@class Logger
     */
    Apio.Logger = {};

    /*
     *	@param logLevel
     *	@param message
     */
    Apio.Logger.log = function(tag, message) {
      var time = new Date();

      //Applica una logica che sceglie il meccanismo di logging
      //Probabilmente una query MongoDB
      //Per il momento è un mock
      console.log(time + " " + tag + " " + message);

      Apio.Database.db.collection("Logs").insert({
        "time": time,
        "message": message,
        "tag": tag
      }, function(err) {
        if (err)
          throw new Error("Apio.Logger.log() encountered an error while trying to connect to the database");
      });

    };

    /**
     *	Apio Socket
     *	@class Socket
     *
     */
    Apio.Socket = {};
    //FIXME Apio.io va incapsulato
    Apio.Socket.init = function(httpInstance) {
      if (!Apio.hasOwnProperty("io")) {
        Apio.io = require("socket.io")(httpInstance);
      }
    };

    /*
     *	Apio Mosca Service
     *	@class Serial
     */
    Apio.Mosca = {};

    Apio.Mosca.Ascoltatore = {
      //using ascoltatore
      type: 'mongo',
      url: 'mongodb://localhost:27017/mqtt',
      pubsubCollection: 'ascoltatori',
      mongo: {}
    };

    Apio.Mosca.Settings = {
      port: 1883,
      backend: Apio.Mosca.Ascoltatore
    };

    Apio.Mosca.init = function() {
      Apio.Mosca.server = new mosca.Server(Apio.Mosca.Settings);
      Apio.Mosca.server.on('ready', setup);

      function setup() {
        console.log("Mosca server is up and running");
      }
    };


    /*
     *	Apio Serial Service
     *	@class Serial
     */
    //FIXME wrappa completamente l"oogetto serialPort
    var ApioSerialRefresh = false;
    var checkDongleRecive = "c";


    Apio.Serial = {};
    //Apio.Configuration.serial = {};
    if (process.argv.indexOf('--serial-port') > -1) {
        var index = process.argv.indexOf('--serial-port');
        Apio.Configuration.serial.port = process.argv[index+1];
        //console.log(Apio.Configuration.serial.port)
    }

    Apio.Serial.Error = function(message) {
      this.message = message;
      this.stack = (new Error()).stack;
    };
    /*
     * Extend the Error Class
     */
    Apio.Serial.Error.prototype = Object.create(Error.prototype);
    Apio.Serial.Error.prototype.name = "Apio.Serial.Error";
    /*
     *	 Initializes the serial port service if it isn"t initialized
     */
    Apio.Serial.init = function() {

      if (!Apio.Serial.hasOwnProperty("serialPort")) {


        //FIXME sarebbe meglio incapsulare serialPort e nasconderla dall"esterno.

        Apio.Serial.serialPort = new com.SerialPort(Apio.Configuration.serial.port, {
          baudrate: Apio.Configuration.serial.baudrate,
          parser: com.parsers.readline("\r\n")
        });
        Apio.Serial.serialPort.on("error", function(err) {
          console.log("SERIAL PORT ERROR (0): ", err);
        });
        Apio.Serial.serialPort.on("open", function() {
            Apio.Util.debug("Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port);
            var d = new Date(),
              ms = d.getMilliseconds();
                //Correct
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port + ", Apio.Serial.serialFlag = " + Apio.Serial.serialFlag + "\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });

                Apio.Serial.serialPort.on("data", function(serialString) {
                  serialString = serialString.toString();
                  Apio.Util.debug("Apio.Serial data received " + serialString);
                  if (serialString === "COORDINATOR ACTIVE") {
                    var d = new Date(),
                      ms = d.getMilliseconds();
                    fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": RECEIVED COORDINATOR ACTIVE\n", function(err) {
                      if (err) {
                        console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                      }
                    });
                  }
                  if (serialString == "c") {
                    checkDongleRecive = "c"
                  }


                  //TODO add validation
                  //TODO Cambierà in futuro perchè saranno supportati messaggi del

                  var tokens = serialString.split(":");
                  //Se la serialString è da meno di 4 token significa che non è wellformed (fatta bene)
                  if (tokens.length >= 4) {
                    //if (tokens.length >= 1) {
                    //Impacchetto la stringa ricevuta da seriale in un oggetto
                    var dataObject = Apio.Util.ApioToJSON(serialString);

                    if (Apio.Util.isSet(dataObject.objectId) && Apio.Util.isSet(dataObject.command))
                      Apio.Serial.read(dataObject);
                    else {
                      //TODO ADD ACTUAL ERROR MANAGEMENT
                      //Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is not well formed");
                    }
                  } else {
                    if (!isNaN(tokens[0]) && !isNaN(tokens[1])) {
                      Apio.Serial.ACK = Number(tokens[0]) === 1;
                      Apio.Serial.isRead = true;
                      //console.log("Apio.Serial.ACK: " + Apio.Serial.ACK);
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK = " + tokens[0] + ":" + tokens[1] + "\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                    } else {
                      //Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is too short ");
                    }
                    //Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is too short ");
                  }
                  //Se arriva un evento da seriale non devo subito spararlo ai client, devo prima processarlo
                  //Come in receiveSerialData.php
                });
              });

          Apio.Serial.serialPort.on("close", function() {
            Apio.Util.debug("APIO::SERIAL::CLOSED");
            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SERIAL PORT CLOSED (0)\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
          });
          return Apio.Serial.serialPort;
        }
      };
      /*
       *	Take a JSON in input and split it into a regular Apio Codifica string
       *	adding the end transmission char -
       *	and check the protocol type
       */
      /*

      //Coda di messaggi da inviare con la seriale
      */
      Apio.Serial.queue = [];
      Apio.Serial.available = true;
      Apio.Serial.counter = 0;

      var checkDongle;
      var CCounter = 0;

      function checkGenericDongle() {
        console.log("+++++++Reactive checkDongle+++++++");
        var d = new Date(),
          ms = d.getMilliseconds();
        fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": Reactive checkDongle\n", function(err) {
          if (err) {
            console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
          }
        });
        
        
        checkDongle = setInterval(function() {
          console.log("+++++++Check a Dongle+++++++");
          var d = new Date(),
            ms = d.getMilliseconds();
          fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": Check a Dongle\n", function(err) {
            if (err) {
              console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
            }
          });
          if (checkDongleRecive == "c") {
            checkDongleRecive = "";
            ApioSerialRefresh = false;
            Apio.io.emit('apio_serial_refresh', {
              refresh: false
            });
            CCounter++;
            if (CCounter === 3) {
              Apio.Serial.serialFlag = true;
            }

            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": C RECEIVED, Coordinator alive, CCounter = " + CCounter + "\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
          } else {
            CCounter = 0;
            ApioSerialRefresh = true;
            Apio.io.emit('apio_serial_refresh', {
              refresh: true
            });
            setTimeout(checkGenericDongle, 15000);
            clearInterval(checkDongle);
          }
        }, 3000);
      }

      console.log("+++++++Sto per labciare checkGenericDongle+++++++");
      
	  checkGenericDongle();
	  //Ciclo che gestisce la coda
      Apio.Serial.counter = 0;
      Apio.Serial.TotalCounter = 0;
      Apio.Serial.queueIndex = -1;
      Apio.Serial.failedSends = 0;
      Apio.Serial.serialFlag = true;
      Apio.Serial.isRead = true;
      var ApioSerialIsOpen = true;
      var ApioDongleDisconnect = false;
      var ApioDongleReconnect = 0;
      setInterval(function() {
        var trovato=0;
        com.list(function(err, ports) {
          if (err) {

            Apio.Util.debug("APIO::SERIAL::DISCONNECT");
            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": (ERROR) APIO::SERIAL::DISCONNECT\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
            //console.log("ERROREEEE")
            ApioDongleDisconnect = true;
          } else {
            ports.forEach(function(port) {


              if (String(port.manufacturer) === Apio.Configuration.serial.manufacturer) {
                //console.log(port.comName);
                //console.log(Apio.Configuration.serial.port)
                Apio.Configuration.serial.port= port.comName;
                ApioDongleDisconnect = false;
                trovato = 1;
                //break;

              }

            });
            if (trovato != 1) {
              Apio.Util.debug("APIO::SERIAL::DISCONNECT");
              console.log("ERROREEEE")
              var d = new Date(),
                ms = d.getMilliseconds();
              fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": (trovato != 1) APIO::SERIAL::DISCONNECT\n", function(err) {
                if (err) {
                  console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                }
              });
              ApioDongleDisconnect = true;
            }
          }
        });
        if (ApioDongleDisconnect) {
          ApioDongleReconnect = 1;
        } else if (!ApioDongleDisconnect && ApioDongleReconnect == 1) {
          ApioDongleReconnect = 2;
        }
        if (ApioDongleReconnect == 2) {
          ApioSerialIsOpen = false;
          console.log("++++++++++++++NUOVA SERIALE++++++++++++++");
          ApioDongleReconnect = 0;

          var d = new Date(),
            ms = d.getMilliseconds();
          fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": OPENED NEW SERIAL (1)\n", function(err) {
            if (err) {
              console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
            }
          });
          /*com.list(function (err, ports) {
            if (err) {
              Apio.Util.debug("Unable to get serial ports, error: ", err);
            } else {
              ports.forEach(function (port) {
              console.log(port);
              if(String(port.manufacturer) === "Apio Dongle"){
                Apio.Configuration.serial.port = String(port.comName);
                //Apio.Serial.init();
              }
            });
            }
          });*/
          Apio.Serial.serialPort = new com.SerialPort(Apio.Configuration.serial.port, {
            baudrate: Apio.Configuration.serial.baudrate,
            parser: com.parsers.readline("\r\n")
          });

          var d = new Date(),
            ms = d.getMilliseconds();
          fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: INIZIO\n", function(err) {
            if (err) {
              console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
            }
          });
          while (Apio.Serial.queue.length) {
            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: CICLO\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
            Apio.Serial.queue.shift();
          }
          var d = new Date(),
            ms = d.getMilliseconds();
          fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: FINE\n", function(err) {
            if (err) {
              console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
            }
          });

          Apio.Serial.serialPort.on("error", function(err) {
            console.log("SERIAL PORT ERROR (1): ", err);
            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SERIAL PORT ERROR (1)\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
          });

          Apio.Serial.serialPort.on("open", function() {
            Apio.Serial.serialFlag = true;
            ApioSerialIsOpen = true;
            Apio.Util.debug("Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port);
            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port + ", Apio.Serial.serialFlag = " + Apio.Serial.serialFlag + "\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
            Apio.Serial.serialPort.on("data", function(serialString) {
              serialString = serialString.toString();
              Apio.Util.debug("SECONDA SERIALE " + serialString);
              if (serialString === "COORDINATOR ACTIVE") {
                var d = new Date(),
                  ms = d.getMilliseconds();
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": RECEIVED COORDINATOR ACTIVE\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });
              }
              if (serialString == "c") {
                checkDongleRecive = "c"
              }
              var tokens = serialString.split(":");
              //Se la serialString è da meno di 4 token significa che non è wellformed (fatta bene)
              if (tokens.length >= 4) {
                //if (tokens.length >= 1) {
                //Impacchetto la stringa ricevuta da seriale in un oggetto
                var dataObject = Apio.Util.ApioToJSON(serialString);

                if (Apio.Util.isSet(dataObject.objectId) && Apio.Util.isSet(dataObject.command))
                  Apio.Serial.read(dataObject);
                else {
                  //TODO ADD ACTUAL ERROR MANAGEMENT
                  Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is not well formed");
                }
              } else {
                if (!isNaN(tokens[0]) && !isNaN(tokens[1])) {
                  Apio.Serial.ACK = Number(tokens[0]) === 1;
                  Apio.Serial.isRead = true;
                  //console.log("Apio.Serial.ACK: " + Apio.Serial.ACK);
                  var d = new Date(),
                    ms = d.getMilliseconds();
                  fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK (1) = " + tokens[0] + ":" + tokens[1] + "\n", function(err) {
                    if (err) {
                      console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                    }
                  });
                } else {
                  //Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is too short ");
                }
              }
              //Se arriva un evento da seriale non devo subito spararlo ai client, devo prima processarlo
              //Come in receiveSerialData.php
            });
          });

          Apio.Serial.serialPort.on("close", function() {
            Apio.Util.debug("APIO::SERIAL::CLOSED");

            var d = new Date(),
              ms = d.getMilliseconds();
            fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SERIAL PORT CLOSED (1)\n", function(err) {
              if (err) {
                console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
              }
            });
          });
          Apio.Serial.isRead = true;
          Apio.Serial.failedSends = 0;
        }

        if (Apio.Serial.serialPort && ApioSerialRefresh) {
          ApioSerialRefresh = false;
          console.log("ApioDongleReconnect = " + ApioDongleReconnect);
          console.log("Apio.Serial.isRead = " + Apio.Serial.isRead);
          console.log("Apio.Serial.failedSends = " + Apio.Serial.failedSends);
          console.log("+++++++++++++++SECONDA SERIALE+++++++++++++++++++");
          CCounter = 0;
          Apio.Serial.serialPort.close(function(error) {
            if (error) {
              console.log("Unable to close Serial Port");
            } else {
              console.log("Serial Port successfully closed");
              Apio.Serial.serialFlag = false;
              var d = new Date(),
                ms = d.getMilliseconds();
              fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": OPENED NEW SERIAL (2)\n", function(err) {
                if (err) {
                  console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                }
              });

              Apio.Serial.serialPort = new com.SerialPort(Apio.Configuration.serial.port, {
                baudrate: Apio.Configuration.serial.baudrate,
                parser: com.parsers.readline("\r\n")
              });

              var d = new Date(),
                ms = d.getMilliseconds();
              fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: INIZIO\n", function(err) {
                if (err) {
                  console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                }
              });
              while (Apio.Serial.queue.length) {
                var d = new Date(),
                  ms = d.getMilliseconds();
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: CICLO\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });
                Apio.Serial.queue.shift();
              }
              var d = new Date(),
                ms = d.getMilliseconds();
              fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SVUOTO SERIALE: FINE\n", function(err) {
                if (err) {
                  console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                }
              });

              Apio.Serial.serialPort.on("error", function(err) {
                console.log("SERIAL PORT ERROR (2): ", err);
                var d = new Date(),
                  ms = d.getMilliseconds();
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SERIAL PORT ERROR (2)\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });
              });

              Apio.Serial.serialPort.on("open", function() {
                Apio.Serial.serialFlag = true;
                Apio.Util.debug("Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port);
                var d = new Date(),
                  ms = d.getMilliseconds();
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": Apio.Serial.init() port is now open and listening on " + Apio.Configuration.serial.port + ", Apio.Serial.serialFlag = " + Apio.Serial.serialFlag + "\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });
                Apio.Serial.serialPort.on("data", function(serialString) {
                  serialString = serialString.toString();
                  if (serialString === "COORDINATOR ACTIVE") {
                    var d = new Date(),
                      ms = d.getMilliseconds();
                    fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": RECEIVED COORDINATOR ACTIVE\n", function(err) {
                      if (err) {
                        console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                      }
                    });
                  }
                  Apio.Util.debug("Apio.Serial data received " + serialString);
                  if (serialString == "c") {
                    checkDongleRecive = "c"
                  }
                  var tokens = serialString.split(":");
                  if (tokens.length >= 4) {
                    var dataObject = Apio.Util.ApioToJSON(serialString);

                    if (Apio.Util.isSet(dataObject.objectId) && Apio.Util.isSet(dataObject.command))
                      Apio.Serial.read(dataObject);
                    else {
                      Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is not well formed");
                    }
                  } else {
                    if (!isNaN(tokens[0]) && !isNaN(tokens[1])) {
                      Apio.Serial.ACK = Number(tokens[0]) === 1;
                      Apio.Serial.isRead = true;
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK = " + tokens[0] + ":" + tokens[1] + "\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                    } else {
                      //Apio.Util.debug("APIO::SERIAL::DATA:IGNORED String is too short ");
                    }
                  }
                });
              });

              Apio.Serial.serialPort.on("close", function() {
                Apio.Util.debug("APIO::SERIAL::CLOSED");

                var d = new Date(),
                  ms = d.getMilliseconds();
                fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": SERIAL PORT CLOSED (2)\n", function(err) {
                  if (err) {
                    console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                  }
                });
              });
            }
          });
          Apio.Serial.isRead = true;
          Apio.Serial.failedSends = 0;
        }

        if (CCounter >= 3 && Apio.Serial.serialFlag && Apio.Serial.queue.length) {
          if (Apio.Serial.ACK && Apio.Serial.isRead) {
            if (Apio.Serial.queueIndex > -1) {
              Apio.Serial.queue.splice(Apio.Serial.queueIndex, 1);
            } else {
              Apio.Serial.queueIndex++;
            }
            var messageToSend = Apio.Serial.queue[Apio.Serial.queueIndex];
            console.log("Apio.Serial.queue is processing: " + messageToSend);
            if (messageToSend) {
              Apio.Serial.serialPort.write(messageToSend, function(error) {
                if (error) {
                  //console.log("An error has occurred while sending " + messageToSend);
                  var d = new Date(),
                    ms = d.getMilliseconds();
                  fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK TRUE, An error has occurred while sending " + messageToSend + "\n", function(err) {
                    if (err) {
                      console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                    }
                  });
                } else {
                  Apio.Serial.serialPort.drain(function(err) {
                    if (err) {
                      //console.log("ERROR ON DRAIN: ", err);
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK TRUE, ERROR ON DRAIN\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                    } else {
                      //console.log("The message '" + messageToSend + "' was correctly written to serial");
                      Apio.Serial.isRead = false;
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK TRUE, The message '" + messageToSend + "' was correctly written to serial\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": °°°°°°°°°°°°°°°°°°°INVIATO IL NUMERO " + (Apio.Serial.TotalCounter++) + "°°°°°°°°°°°\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                      console.log("°°°°°°°°°°°°°°°°°°°INVIATO IL NUMERO (1) " + (Apio.Serial.TotalCounter) + "°°°°°°°°°°°");
                    }
                  });
                }
              });
            }
          }
          //else if (Apio.Serial.ACK === false || Apio.Serial.isRead === false){
          else {
            Apio.Serial.counter++;
            if (Apio.Serial.queueIndex === -1) {
              Apio.Serial.queueIndex++;
            }
            var messageToSend = Apio.Serial.queue[Apio.Serial.queueIndex];
            if (messageToSend) {
              Apio.Serial.serialPort.write(messageToSend, function(error) {
                if (error) {
                  //console.log("An error has occurred while sending " + messageToSend);
                  var d = new Date(),
                    ms = d.getMilliseconds();
                  fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK FALSE, An error has occurred while sending " + messageToSend + "\n", function(err) {
                    if (err) {
                      console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                    }
                  });
                } else {
                  Apio.Serial.serialPort.drain(function(err) {
                    if (err) {
                      //console.log("ERROR ON DRAIN: ", err);
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK FALSE, ERROR ON DRAIN\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                    } else {
                      //console.log("The message '" + messageToSend + "' was correctly written to serial");
                      Apio.Serial.isRead = false;
                      var d = new Date(),
                        ms = d.getMilliseconds();
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + ": ACK FALSE, The message '" + messageToSend + "' was correctly written to serial\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                      fs.appendFile(__dirname + '/log.txt', d + ", " + ms + "°°°°°°°°°°°°°°°°°°°INVIATO IL NUMERO " + (Apio.Serial.TotalCounter++) + "°°°°°°°°°°°\n", function(err) {
                        if (err) {
                          console.log("ERROR WHILE APPENDING ON FILE LOG.TXT");
                        }
                      });
                      console.log("°°°°°°°°°°°°°°°°°°°INVIATO IL NUMERO (2) " + (Apio.Serial.TotalCounter) + "°°°°°°°°°°°");
                    }
                  });
                }
              });
            }

            if (Apio.Serial.queue.length === 1) {
              if (Apio.Serial.counter >= 6) {
                Apio.Serial.queue.splice(Apio.Serial.queueIndex, 1);
                Apio.Serial.failedSends++;
                Apio.Serial.queueIndex = 0;
                Apio.Serial.counter = 0;
                Apio.Serial.ACK = true;
              }
            } else if (Apio.Serial.counter >= 3) {
              Apio.Serial.queue.splice(Apio.Serial.queueIndex, 1);
              Apio.Serial.failedSends++;
              Apio.Serial.queueIndex = 0;
              Apio.Serial.counter = 0;
              Apio.Serial.ACK = true;
            }
          }
        } else {
          Apio.Serial.queueIndex = -1;
        }
      }, 40);

      setInterval(function() {
        if (Apio.Serial.serialPort) {
          Apio.Serial.serialPort.flush(function(error) {
            if (error) {
              console.log("Unable to flush serial port");
            } else {
              console.log("Serial port flushed correctly");
            }
          });
        }
      }, 10000);

	        
  

      
      Apio.Serial.stream = function(data, callback) {

        function doTheStreaming(protocol, address, key, value, callback) {


          var message = protocol + address + ":" + key + ":" + value + "-";
          //console.log(message);
          switch (protocol) {
            case 'l':
            case 'z':
            case 's':
              if (!Apio.Serial.hasOwnProperty("serialPort")) {
                console.log("The serial port is disabled, the following message cannot be sent: " + message);
              } else {
                Apio.Serial.serialPort.write(message, function(err) {
                  if (err) {
                    console.log("An error has occurred while streaming to serialport.")
                  } else {
                    console.log("The message " + message + " was correctly streamed to serial port")
                  }
                })
              }
              break;
            default:
              if (fs.existsSync(__dirname + "/public/applications/" + data.objectId + "/adapter.js")) {
                var adapter = require(__dirname + "/public/applications/" + data.objectId + "/adapter.js");
                console.log("Protocollo " + protocol + " sconosciuto, lancio l'adapter manager, mado questo oggetto:");
                console.log(data);
                adapter.send(data);
                if (callback) {
                  console.log("PARTE LA CALLBACK DELLA SERIAL");
                  callback();
                }
              } else {
                Apio.Util.debug("Apio.Serial.Send() Error: protocol " + data.protocol + "is not supported and no adapter was found.");
              }
              break;
          }
        }

        var keys = Object.keys(data.properties);
        Apio.Database.db.collection('Objects').findOne({
          objectId: data.objectId
        }, function(err, doc) {
          if (err) {
            console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
          } else {
            data.address = doc.address;
            data.protocol = doc.protocol;

            var counter = 0;
            var numberOfKeys = keys.length;
            var available = true;
            keys.forEach(function(key) {
              doTheStreaming(data.protocol, data.address, key, data.properties[key], function(err) {})
            })

          }
        })
      }

      Apio.Serial.send = function(data, callback) {
          //NOTA data dovrebbe mandare soltanto objID e le prop
          console.log('---------------SerialSend------------------')
          console.log(data)
          console.log('-------------------------------------------\n\n')


          var packageMessageAndAddToQueue = function(protocol, address, key, value, callback) {
            var message = protocol + address + ":" + key + ":" + value + "-";
            switch (protocol) {
              case 'l':
              case 'z':
              case 's':
                if (!Apio.Serial.hasOwnProperty("serialPort")) {
                  console.log("The serial port is disabled, the following message cannot be sent: " + message);
                } else if (CCounter >= 3) {
                  Apio.Serial.queue.push(message);
                }
                break;
              default:
                if (fs.existsSync(__dirname + "/public/applications/" + data.objectId + "/adapter.js")) {
                  var adapter = require(__dirname + "/public/applications/" + data.objectId + "/adapter.js");
                  console.log("Protocollo " + protocol + " sconosciuto, lancio l'adapter manager, mado questo oggetto:");
                  console.log(data);
                  adapter.send(data);
                  if (callback) {
                    console.log("PARTE LA CALLBACK DELLA SERIAL");
                    callback();
                  }
                } else {
                  Apio.Util.debug("Apio.Serial.Send() Error: protocol " + data.protocol + "is not supported and no adapter was found.");
                }
                break;
            }
          }


          if (typeof data === "object") {
            console.log("DATA VALE: ", data);
            var keys = Object.keys(data.properties);


            Apio.Database.db.collection('Objects').findOne({
              objectId: data.objectId
            }, function(err, doc) {
              if (err) {
                console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
              } else {
                data.address = doc.address;
                data.protocol = doc.protocol;

                var counter = 0;
                var numberOfKeys = keys.length;
                var available = true;
                keys.forEach(function(key) {
                  packageMessageAndAddToQueue(data.protocol, data.address, key, data.properties[key], function(err) {})
                })
                if (callback) {
                    //console.log("PARTE LA CALLBACK DELLA SERIAL");
                    callback();
                }

              }
            })
          } else if (typeof data === "string") {
            var protocolAndAddress = data.split(":");
            protocolAndAddress = protocolAndAddress[0];
            var dataComponents = data.split("-");
            for (var i in dataComponents) {
              if (dataComponents[i] !== "") {
                if (CCounter >= 3) {
                  if (dataComponents[i].indexOf(protocolAndAddress) > -1) {
                    Apio.Serial.queue.push(dataComponents[i] + "-");
                  } else {
                    Apio.Serial.queue.push(protocolAndAddress + ":" + dataComponents[i] + "-");
                  }
                }
              }
            }
          }
        }
        /*
         *	used when the Server Apio has received some message on the serial from
         * 	an external Apio Object (mostly a Sensor/Button) which is trying to
         *	update some information on the database
         */
      Apio.Serial.read = function(data) {

        //I sensori invieranno le seguenti informazioni
        //SensorID:command:Chiave:Valore
        //Quindi la funzione read, deve fare una query nel db per capire quale azione intraprendere
        //Per il momento invece, in fase di testing, i sensori inviano: TargetADDR:command:chiave:valore
        var command = data.command;
        if (!Apio.Serial.hasOwnProperty("serialPort"))
          throw new Error("The Apio.Serial service has not been initialized. Please, call Apio.Serial.init() before using it.");
        if (Apio.Database.db) {
          Apio.Database.db.collection("Objects").findOne({
              address: data.objectId
          }, function(err, res) {
            data.objectId = res.objectId;
            switch (command) {
              case "send":

                //Prendo i dati ddell"oggetto in db, scrivo in seriale e updato il db.
                //In seriale verrà mandata una stringa del tipo
                //objId:command:chiavivalori

                //Invece di fare questa query, dovrò cercare gli eventi associati a quel sensore
                Apio.Database.getObjectById(data.objectId, function(object) {
                  //object contiene le informazioni aggiuntive dell'oggetto a cui inviare l'evento
                  //tra cui l'address e il protocol
                  data.objectId = object.objectId;
                  data.protocol = object.protocol;

                  Apio.Serial.send(data); //Mando data perchè ancora i sensori scrivono in seriale l'evento che vogliono scatenare
                  //Poi invece manderò i dati recuperati dalla query getEventsByTrigger() o qualcosa del genere

                  Apio.Database.updateProperty(data, function() {
                    //Notificare i client connessi

                    Apio.io.to("apio_client").emit("apio_server_update", data);
                  });
                });
                break;
              case "time":
                console.log("SONO DENTRO TIME, DATA VALE: ", data);
                var t = new Date().getTime();
                Apio.Serial.send("l" + data.objectId + ":time:" + t + "-");
                break;
              case "update":
                console.log("> Arrivato un update, mando la notifica");
                //Prima di tutto cerco la notifica nel db
                console.log(data);
                //Controllo Se esiste uno stato che rispecchia lo stato attuale dell'oggetto

                if (Apio.Database.db) {
                  Apio.Database.db.collection("Objects").findOne({
                    objectId: data.objectId
                  }, function(err, res) {
                    if (err) {
                      console.log("Unable to find object with objectId " + data.objectId);
                    } else if (res) {
                      if (res.sensor === true || res.sensor === "true") {
                        for (var i in data.properties) {
                          var x = data.properties[i];
                          var y = res.properties[i];
                        }
                        console.log("x = " + x + ", y = " + y);
                        Apio.Database.db.collection("States").find({
                          objectId: data.objectId
                        }).toArray(function(error, result) {
                          if (error) {
                            console.log("Unable to find states of object with objectId " + data.objectId);
                          } else if (result) {
                            for (var i in result) {
                              for (var j in result[i].properties) {
                                for (var p in data.properties) {
                                  console.log("j = " + j + ", p = " + p);
                                  if (j === p) {
                                    console.log("z = " + result[i].properties[j]);
                                    if (Number(x) > Number(y)) {
                                      if (Number(result[i].properties[j]) < Number(x) && Number(result[i].properties[j]) > Number(y)) {
                                        console.log("#Applico perchè sto salendo");
                                        Apio.Database.db.collection('Objects').findOne({
                                          objectId: data.objectId
                                        }, function(err, document) {
                                          if (err) {
                                            console.log('Apio.Serial.read Error while looking for notifications');
                                          } else {
                                            if (document.hasOwnProperty('notifications')) {
                                              for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                                                if (document.notifications.hasOwnProperty(prop)) {
                                                //Ho trovato una notifica da lanciare
                                                if (document.notifications[prop].hasOwnProperty(result[i].properties[j])) {
                                                  console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                                                  Apio.Database.getObjectById(data.objectId, function(result) {
                                                    var notifica = {
                                                      objectId: data.objectId,
                                                      objectName: result.name,
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
                                        });

                                        Apio.System.applyState(result[i].name);
                                      }
                                    } else {
                                      if (Number(result[i].properties[j]) > Number(x) && Number(result[i].properties[j]) < Number(y)) {
                                        console.log("#Applico perchè sto scendendo")
                                        Apio.Database.db.collection('Objects').findOne({
                                          objectId: data.objectId
                                        }, function(err, document) {
                                          if (err) {
                                            console.log('Apio.Serial.read Error while looking for notifications');
                                          } else {
                                            if (document.hasOwnProperty('notifications')) {
                                              for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                                                if (document.notifications.hasOwnProperty(prop)) {
                                                //Ho trovato una notifica da lanciare
                                                if (document.notifications[prop].hasOwnProperty(result[i].properties[j])) {
                                                  console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                                                  Apio.Database.getObjectById(data.objectId, function(result) {
                                                    var notifica = {
                                                      objectId: data.objectId,
                                                      objectName: result.name,
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
                                        });

                                        Apio.System.applyState(result[i].name);
                                      }
                                    }
                                    /*if (Math.abs(Number(x) - Number(y)) >= Math.abs(Number(result[i].properties[j]) - Number(x))) {
                                     Apio.Database.db.collection('Objects').findOne({
                                     objectId: data.objectId
                                     }, function (err, document) {
                                     if (err) {
                                     console.log('Apio.Serial.read Error while looking for notifications');
                                     } else {
                                     if (document.hasOwnProperty('notifications')) {
                                     for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                                     if (document.notifications.hasOwnProperty(prop)) {
                                     //Ho trovato una notifica da lanciare
                                     if (document.notifications[prop].hasOwnProperty(result[i].properties[j])) {
                                     console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                                     Apio.Database.getObjectById(data.objectId, function (result) {
                                     var notifica = {
                                     objectId: data.objectId,
                                     objectName: result.name,
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
                                     });

                                        Apio.System.applyState(result[i].name);
                                    }*/
                                  }
                                }
                              }
                            }
                          }
                          Apio.Database.updateProperty(data, function() {
                            Apio.io.emit('apio_server_update', data);
                          });

                        });
                      } else {
                        Apio.Database.db.collection('Objects').findOne({
                          objectId: data.objectId
                        }, function(err, document) {
                          if (err) {
                            console.log('Apio.Serial.read Error while looking for notifications');
                          } else {
                            if (document.hasOwnProperty('notifications')) {
                              for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                                if (document.notifications.hasOwnProperty(prop)) {
                                //Ho trovato una notifica da lanciare
                                if (document.notifications[prop].hasOwnProperty(data.properties[prop])) {
                                  console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                                  Apio.Database.getObjectById(data.objectId, function(result) {
                                    var notifica = {
                                      objectId: data.objectId,
                                      objectName: result.name,
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
                        });

                        Apio.Database.db.collection('States')
                          .find({
                            objectId: data.objectId
                          })
                          .toArray(function(err, states) {
                            console.log("CI sono " + states.length + " stati relativi all'oggetto " + data.objectId)
                            var sensorPropertyName = Object.keys(data.properties)[0]
                            states.forEach(function(state) {
                              if (state.hasOwnProperty('sensors') && state.sensors.length > 0) {
                                if (state.sensors.indexOf(sensorPropertyName) > -1 && Number(state.properties[sensorPropertyName]) == Number(data.properties[sensorPropertyName])) {

                                  console.log("Lo stato " + state.name + " è relativo al sensore che sta mandando notifiche ed il valore corrisponde")
                                  data.message = state.name
                                  Apio.System.notify(data);
                                } else {
                                  console.log("sensorPropertyName = " + sensorPropertyName);
                                  console.log("state.sensors: ", state.sensors);
                                  console.log("state.properties: ", state.properties);
                                  console.log("data.properties: ", data.properties);
                                  console.log("Lo stato " + state.name + " NON è relativo al sensore che sta mandando notifiche")
                                }
                              }
                            })
                          })

                        Apio.Database.updateProperty(data, function() {
                          Apio.io.emit('apio_server_update', data);

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
                                      console.log(state.properties)
                                      if(state.properties==undefined){
                                        test = false;
                                      }
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
                      }
                    }
                  });
                }
                break;
              case "request":
                console.log("> Arrivato un update, mando la notifica");
                //Prima di tutto cerco la notifica nel db
                console.log(data);
                //Controllo Se esiste uno stato che rispecchia lo stato attuale dell'oggetto

                if (Apio.Database.db) {
                  Apio.Database.db.collection('Objects').findOne({
                    objectId: data.objectId
                  }, function(err, document) {
                    if (err) {
                      console.log('Apio.Serial.read Error while looking for notifications');
                    } else {
                      if (document.hasOwnProperty('notifications')) {
                        for (var prop in data.properties) //prop è il nome della proprietà di cui cerco notifiche
                          if (document.notifications.hasOwnProperty(prop)) {
                          //Ho trovato una notifica da lanciare
                          if (document.notifications[prop].hasOwnProperty(data.properties[prop])) {
                            console.log("Ho trovato una notifica per la proprietà " + prop + " e per il valore corrispondente " + data.properties[prop])
                            Apio.Database.getObjectById(data.objectId, function(result) {
                              var notifica = {
                                objectId: data.objectId,
                                objectName: result.name,
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
                  })
                  Apio.Database.db.collection('States')
                    .find({
                      objectId: data.objectId
                    })
                    .toArray(function(err, states) {
                      console.log("CI sono " + states.length + " stati relativi all'oggetto " + data.objectId)
                      var sensorPropertyName = Object.keys(data.properties)[0]
                      states.forEach(function(state) {
                        if (state.hasOwnProperty('sensors') && state.sensors.length > 0) {
                          if (state.sensors.indexOf(sensorPropertyName) > -1 && Number(state.properties[sensorPropertyName]) == Number(data.properties[sensorPropertyName])) {

                            console.log("Lo stato " + state.name + " è relativo al sensore che sta mandando notifiche ed il valore corrisponde")
                            data.message = state.name
                            Apio.System.notify(data);
                          } else {
                            console.log("sensorPropertyName = " + sensorPropertyName);
                            console.log("state.sensors: ", state.sensors);
                            console.log("state.properties: ", state.properties);
                            console.log("data.properties: ", data.properties);
                            console.log("Lo stato " + state.name + " NON è relativo al sensore che sta mandando notifiche")
                          }
                        }
                      })
                    })

                  Apio.Database.updateProperty(data, function() {
                    Apio.io.emit('apio_server_update', data);

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
                              console.log(states);
                              states.forEach(function(state) {


                                var test = true;

                                for (var key in state.properties)
                                  //console.log(state.properties);
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
                }
                break;
              case "hi":
                console.log("Ho riconosciuto la parola chiave hi");
                console.log("L'indirizzo fisico dell'oggetto che si è appena connesso è " + data.address);
                Apio.Database.db.collection('Objects').findOne({
                  objectId: data.objectId
                }, function(err, document) {
                  if (err) {
                    console.log("non esiste un oggetto con address " + data.objectId);
                  } else {
                    console.log("l'oggetto con address " + document.address + " è " + document.objectId);
                    var notifica = {
                      objectId: document.objectId,
                      objectName: document.name,
                      message: document.name + " is now online",
                      properties: 'online',
                      timestamp: new Date().getTime()
                    };
                    Apio.System.notify(notifica);
                    Apio.Database.db.collection('States').findOne({
                      name: "Connected" + document.objectId
                    }, function(err, doc) {
                      if (!doc) {
                        console.log("Lo stato non esiste, quindi lo creo");
                        var req_data = {
                          json: true,
                          uri: "http://localhost:8083/apio/state",
                          method: "POST",
                          body: {
                            state: {
                              active: false,
                              name: "Connected: " + document.name,
                              objectName: document.name,
                              objectId: document.objectId
                            }
                          }
                        }
                        var req = request(req_data, function(error, response, body) {
                          console.log("Try to launch state associated: ");
                          console.log(body);
                          if ("200" === response.statusCode || 200 === response.statusCode) {
                            console.log("ok");
                            return true;
                          } else {

                            console.log("no");
                            return false;
                          }
                        })

                      } else {
                        var o = {};
                        o.name = "Connected: " + document.name;
                        var req_data = {
                          json: true,
                          uri: "http://localhost:8083/apio/state/apply",
                          method: "POST",
                          body: {
                            state: {
                              name: o.name
                            }
                          }
                        }
                        var req = request(req_data, function(error, response, body) {
                          console.log("Try to launch state associated: ");
                          console.log(body);
                          if ("200" === response.statusCode || 200 === response.statusCode) {
                            console.log("ok");
                            return true;
                          } else {

                            console.log("no");
                            return false;
                          }
                        })

                      }
                    })

                  }

                  //app.post("/apio/state/apply", o);

                });
                //Attivare lo stato Hi associato alla scheda che arriva:

                //TODO
                break;
              default:
                //Il
                break;
            }





          })
        }


      };



      /*
       *  Apio Database service
       */
      Apio.Database = {};
      //La connessione non viene Tenuta sempre aperta per questioni di stabilità.
      //Questa scelta può essere rivista in caso di necessità di migliori performance
      //TODO carica dati da un file di configurazione, insieme ai dati della seriale ecc..
      /*
       * Take the configuration file of MongoDB and
       * return a string which can be used for the
       * connection to the DB
       */
      Apio.Database.getConnectionString = function() {
          var c = Apio.Configuration.database;
          return "mongodb://" + c.hostname + ":" + c.port + "/" + c.database;
      };
      /*
      Returns the default database instance
      */
      Apio.Database.getDatabaseInstance = function() {
          return Apio.Database.db;
      }

      Apio.Database.connect = function(callback) {
          MongoClient.connect(Apio.Database.getConnectionString(), function(error, db) {
              if (error) {
                  console.log(error)
                  Apio.Util.debug("Apio.Database.connect() encountered an error while trying to connect to the database");
                  return;
              }
              console.log("Apio.Database.connect() created a new connection to MongoDB");
              Apio.Database.db = db;
              /*Apio.Database.db.stats(function(err, stats){
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
                                          command : "update",
                                          log : objs[i].log,
                                          objectId : objs[i].objectId
                                      };
                                      Apio.Remote.socket.emit('apio.server.object.update', send);
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
                                                      console.log(result);
                                                  }
                                              });
                                          }
                                      });
                                  }
                              }
                          }
                      });
                  }
              });*/
              if (callback)
                  callback();
          })
      };

      Apio.Database.disconnect = function() {
          Apio.Database.db.close();
      }

      /**
       *	Updates a property on the database
       *
       *	@param objectId
       *	@param propertyName
       *	@param propertyValue
       *	@param callback
       *
       */
      Apio.Database.updateProperty = function(data, callback) {
        var objectId = data.objectId;
        var packagedUpdate = {};

        for (var key in data.properties)
          packagedUpdate["properties." + key] = data.properties[key];
        //db.collection("Objects").update({"objectId" : objectId},{ "$set" : packagedUpdate},function(error) {
        Apio.Database.db.collection("Objects").findAndModify({
          "objectId": objectId
        }, [
          ["name", 1]
        ], {
          "$set": packagedUpdate
        }, function(err, result) {
          if (err) {
            Apio.Util.debug("Apio.Database.updateProperty() encountered an error while trying to update the property on the database: ");
            console.log(err)
            throw new Apio.Database.Error("Apio.Database.updateProperty() encountered an error while trying to update the property on the database");
          } else if (null === result) {
            throw new Apio.Database.Error("Apio.Database.updateProperty() the object with id " + objectId + "  does not exist.");
          } else {
            Apio.Util.debug("Apio.Database.updateProperty() Successfully updated the  object " + objectId);
            if (callback !== null)
              callback();
          }

        });
      };

      Apio.Database.getMaximumObjectId = function(callback) {

        console.log('getMaximumObjectId');
        var error = null;
        var result = null;

        var options = {
          "sort": [
            ['objectId', 'desc']
          ]
        };
        Apio.Database.db.collection("Objects").find({}, options).toArray(function(err, docs) {
          if (err) {
            error = 'Apio.Database.getMaximumObjectId() failed to fetch maximum objectId';
            console.log('Apio.Database.getMaximumObjectId() failed to fetch maximum objectId');
          } else {
            if (docs.length === 0) {
              console.log('No maximum id. Return 0');;
              result = '0';
            } else {
              var max = 0;
              docs.forEach(function(el) {
                var cur_id = parseInt(el.objectId, 10);
                if (cur_id > max)
                  max = cur_id;
              })
              console.log('Recoverder as maximum id: ' + max);
              result = max + "";
            }
          }
          callback(error, result);
        });

      };

      /*
       *	Exception object definition
       *	This is very useful when doing error management, since it allows to understand which is the failure point
       *	and handle the errror accordingly.
       *
       *	Ovvero, se dobbiamo implementare un sistema di transazioni atomiche, voglio sempre sapere a che punto
       *	del processo si è verificato l'errore, in modo da applicare i giusti rollback
       */
      Apio.Database.Error = function(message) {
        this.message = message;
        this.stack = (new Error()).stack;
      };
      Apio.Database.Error.prototype = Object.create(Error.prototype);
      Apio.Database.Error.prototype.name = "Apio.Database.Error";


      Apio.Database.registerObject = function(objectData, callback) {

        Apio.Database.db.collection("Objects").insert(objectData, function(error) {

          if (error) {
            throw new Apio.Database.Error("APIO::ERROR Apio.Database.registerObject() encountered an error while trying to update the property on the database" + error);
          }
          Apio.Util.debug("Apio.Database.registerObject() Object Successfully registered");
          callback(error);

        });


      };



      Apio.Database.deleteObject = function(id, callback) {

        Apio.Database.db.collection("Objects").remove({
          "objectId": id
        }, function(error) {
          if (error)
            throw new Apio.Database.Error("Apio.Database.deleteObject() encountered an error while trying to connect to the database");
          if (null !== callback)
            callback();
        });

      };

      Apio.Database.getObjects = function(callback) {


        Apio.Database.db.collection("Objects").find().toArray(function(error, result) {
          if (error) {
            throw new Apio.Database.Error("Apio.Database.getObjects() encountered an error while trying to update the property on the database" + error);
          }
          if (result === null) {
            //SE result è nullo, significa che nel db non è stato trovato alcun oggetto
            //Con l'id dato. Questo è un grave problema, indica che si sta richiedendo un oggetto non
            //Installato o non installato correttamente o che dei dati sono corrotti.

            //Ogni processo usato da app.js deve poter riconoscere il tipo di errore per gestirlo correttamente
            throw new Apio.Database.Error("Apio.Database.getObjects() Unable to fetch an object with id " + id);
          }
          Apio.Util.debug("Apio.Database.getObjectById() Objects Successfully fetched.");
          if (callback !== null)
            callback(result);
        });

      };

      Apio.Database.getObjectById = function(id, callback) {


        Apio.Database.db.collection("Objects").findOne({
          objectId: id
        }, function(error, result) {
          if (error) {
            throw new Apio.Database.Error("Apio.Database.getObjectId() encountered an error while trying to update the property on the database" + error);
          }
          if (result === null) {
            //SE result è nullo, significa che nel db non è stato trovato alcun oggetto
            //Con l'id dato. Questo è un grave problema, indica che si sta richiedendo un oggetto non
            //Installato o non installato correttamente o che dei dati sono corrotti.

            //Ogni processo usato da app.js deve poter riconoscere il tipo di errore per gestirlo correttamente
            throw new Apio.Database.Error("Apio.Database.getObjectId() Unable to fetch an object with id " + id);
          }
          Apio.Util.debug("Apio.Database.getObjectById() Object Successfully fetched (id : " + id + ")");
          if (callback !== null)
            callback(result);

        });



      };

      Apio.State = {};

      Apio.State.create = function(newState, eventToCreate, callback) {

          Apio.Database.db.collection('States').findOne({
              name: newState.name
          }, function(err, data) {
              if (data) {
                  console.log("Esiste già uno stato con questo nome (" + newState.name + ")")
                  callback({
                      error: "STATE_NAME_EXISTS"
                  });
              } else {
                  console.log("objectId vale:");
                  console.log(newState.objectId);
                  console.log("properties vale:");
                  console.log(newState.properties);
                  //Apio.Database.db.collection('States').aggregate({$match : {objectId : newState.objectId, properties: newState.properties}},function(err,result){
                  Apio.Database.db.collection('States').findOne({
                      objectId: newState.objectId,
                      properties: newState.properties
                  }, function(err, result) {
                      console.log("result vale:");
                      console.log(result);
                      if (result !== null) {
                          console.log("Esiste già uno stato con queste proprietà");

                          callback({
                              error: 'STATE_PROPERTIES_EXIST',
                              state: result.name
                          });
                      } else {
                          if (eventToCreate) {
                              //se sono qui devo anchr creare un evento che ha come stato scatenante lo stato inviato
                              var evt = {
                                  name: eventToCreate.name,
                                  triggerState: newState.name,
                                  type: 'stateTriggered'
                              };
                              Apio.Database.db.collection('Events').findOne({
                                  name: evt.name
                              }, function(err, data) {
                                  if (err) {
                                      callback({
                                          error: true
                                      })
                                      console.log('/apio/state error while checking event name availability');
                                  }
                                  if (data) {
                                      //Significa che ho già un evento con questo nome
                                      callback({
                                          error: 'EVENT_NAME_EXISTS'
                                      });
                                  } else {
                                      //Se sono qui significa che non c'è un evento con quel nome.
                                      Apio.Database.db.collection('States').insert(newState, function(err, data) {
                                          if (!err) {
                                              console.log("Stato (" + newState.name + ") salvato con successo")
                                              Apio.io.emit("apio_state_new", newState);

                                              Apio.Database.db.collection('Events').insert(evt, function(error) {
                                                  if (!error) {
                                                      Apio.io.emit("apio_event_new", evt);

                                                      console.log("Evento (" + evt.name + ") relativo allo stato (" + newState.name + "), salvato con successo")
                                                      callback({
                                                          error: false
                                                      })
                                                  }

                                              });
                                          } else {
                                              console.log("Apio.Database.Error unable to save the new state");
                                              callback({
                                                  error: 'DATABASE_ERROR'
                                              });
                                          }
                                      })
                                  }
                              })
                          } else {
                              //Se non devo salvare eventi
                              Apio.Database.db.collection('States').insert(newState, function(err, data) {
                                  if (!err) {
                                      console.log("Stato (" + newState.name + ") salvato con successo")
                                      Apio.io.emit("apio_state_new", newState);

                                      callback({
                                          error: false
                                      })
                                  } else {
                                      console.log("Apio.Database.Error unable to save the new state");
                                      callback({
                                          error: 'DATABASE_ERROR'
                                      });
                                  }
                              })
                          }


                      }
                  }) //states aggregate
              }

          })
      }
      Apio.State.list = function(callback) {
          Apio.Database.db.collection("States")
              .find()
              .toArray(function(err, data) {
                  if (err)
                      callback(err, null)
                  else
                      callback(null, data);
              });
      };
      Apio.State.getByName = function(stateName, callback) {
          Apio.Database.db.collection("States").findOne({
              name: stateName
          }, function(err, data) {
              if (err)
                  callback(err, null);
              else
                  callback(null, data);
          });
      }
      Apio.State.delete = function(stateToDelete, callback) {
          Apio.Util.log("Requested deletion of state " + stateToDelete)
          Apio.Database.db.collection("States").findAndRemove({
              name: stateToDelete
          }, function(err, removedState) {
              if (!err) {
                  Apio.io.emit("apio_state_delete", {
                      name: stateToDelete
                  });


                  Apio.Database.db.collection("Events").remove({
                      triggerState: stateToDelete
                  }, function(err) {
                      if (err) {
                          callback({
                              error: 'DATABASE_ERROR'
                          });
                      } else {
                          Apio.io.emit("apio_event_delete", {
                              name: stateToDelete
                          });

                      }
                  });
                  if (removedState.hasOwnProperty('sensors')) {

                      removedState.sensors.forEach(function(e, i, a) {
                          var props = {};
                          props[e] = removedState.properties[e];
                          Apio.Serial.send({
                              'objectId': removedState.objectId,
                              'properties': props
                          })

                      })


                  }

                  callback({
                      error: false
                  });
              } else {
                  Apio.Util.log("An error has occurred while removing a state")
                  console.log(err)
                  callback({
                      error: 'DATABASE_ERROR'
                  });
              }

          })
      };
      Apio.State.update = function(stateName, update, callback) {


          var packagedUpdate = {
              properties: {}
          };
          for (var k in update) {
              packagedUpdate.properties[k] = update[k];
          }

          Apio.Database.db.collection("States").update({
              name: stateName
          }, {
              $set: packagedUpdate
          }, function(err) {
              if (!err) {
                  Apio.io.emit("apio_state_update", {
                      name: stateName,
                      properties: update
                  });

                  callback({
                      error: false
                  });
              } else
                  callback({
                      error: 'DATABASE_ERROR'
                  });
          })
      };
      Apio.Event = {};
      Apio.Event.create = function(evt, callback) {
          Apio.Database.db.collection('Events').insert(evt, function(err, result) {
              if (err) {
                  console.log("Error while creating a new event");
                  callback(err, null);
              } else {
                  if (evt.hasOwnProperty('triggerTimer')) {
                      Apio.System.registerCronEvent(evt);
                  }
                  Apio.io.emit("apio_event_new", evt);


                  callback(null, result[0].objectId);
              }
          })
      };
      Apio.Event.list = function(callback) {
          Apio.Database.db.collection("Events").find({}).toArray(function(err, result) {
              if (err)
                  callback(err, null)
              else
                  callback(null, result)
          });
      };
      Apio.Event.getByName = function(stateName, callback) {
          Apio.Database.db.collection('Events').findOne({
              name: stateName
          }, function(err, data) {
              if (err) {
                  console.log("Error while fetching event named " + stateName);
                  callback(err, null);
              } else {
                  callback(null, data);
              }
          })
      }
      Apio.Event.delete = function(eventName, callback) {
          Apio.Database.db.collection("Events").remove({
              name: eventName
          }, function(err) {
              if (!err) {
                  Apio.io.emit("apio_event_delete", {
                      name: eventName
                  });
                  callback(null);
              } else
                  callback(err);
          })
      };
      Apio.Event.update = function(eventName, eventUpdate, callback) {
          delete eventUpdate["_id"];
          Apio.Database.db.collection("Events").update({
              name: eventName
          }, eventUpdate, function(err) {
              if (!err) {
                  Apio.io.emit("apio_event_update", {
                      event: eventUpdate
                  });
                  callback(null, {
                      error: false
                  });
              } else
                  callback(err, {
                      error: 'DATABASE_ERROR'
                  });
          })
      };

      Apio.Event.launch = function(eventName, cb) {
          var counter = 0;
          var loops = 1;
          var loopCounter = 1;

          Apio.Database.db.collection('Events')
              .findOne({
                      name: eventName
                  },
                  function(error, event) {

                      if (error) {
                          console.log("launchEvent() Error while fetching event " + eventName);
                          callback(error);
                      }
                      if (event !== null) {
                          console.log("Ecco gli scatenati");
                          console.log(event.triggeredStates)
                          if (event.hasOwnProperty('loop'))
                              loops = event.loop;
                          var processTriggeredState = function() {
                              var delay = 0;
                              if (event.triggeredStates[counter].hasOwnProperty('delay'))
                                  delay = 10; //event.triggeredStates[counter].delay;
                              console.log("Setto il timeout dello stato " + event.triggeredStates[counter].name + " al valore " + delay)
                              setTimeout(function() {

                                  Apio.State.apply(event.triggeredStates[counter].name, function() {

                                      console.log("Ho processato " + event.triggeredStates[counter].name);
                                      counter++;
                                      if (counter >= event.triggeredStates.length) {
                                          counter = 0;
                                          loopCounter++;
                                          console.log("\nFinito il ciclo")
                                      }
                                      if (loopCounter > loops) {
                                          console.log("\nFinito evento")
                                      } else {
                                          processTriggeredState();
                                      }
                                  })
                              }, delay)

                          }
                          processTriggeredState();




                      }
                  })
      }


      function getStateByName(stateName, callback) {
          Apio.Database.db.collection('States')
              .findOne({
                  name: stateName
              }, function(err, state) {
                  if (err) {
                      console.log("Error in while fetching applied state data.")
                      console.log(error);
                      callback(error, null)
                  } else {
                      callback(null, state)
                  }
              })
      }

      Apio.State.apply = function(stateName, callback, options) {
          getStateByName(stateName, function(error, state) {
	          console.log("Lo stato che vado ad applicare:");
	          console.log(state)
	          /*if (state.active == true) {
                            console.log("Lo stato è attivo")
                            Apio.Database.db.collection('States').update({
                                name: state.name
                            }, {
                                $set: {
                                    active: false
                                }
                            }, function(errOnActive) {
                                if (errOnActive) {
                                    console.log("Impossibile settare il flag dello stato");
                                    callback(new Error('Impossibile settare il flag dello stato'))
                                } else {
                                    var s = state;
                                    s.active = false;
                                    Apio.io.emit('apio_state_update', s);
                                }
                            })
                        } else {
                            console.log("Lo stato è disattivo")
                            arr.push(state);
                            Apio.Database.db.collection('States').update({
                                name: state.name
                            }, {
                                $set: {
                                    active: true
                                }
                            }, function(err) {
                                if (err) {
                                    console.log("Non ho potuto settare il flag a true");
                                } else {
                                    var s = state;
                                    s.active = true;
                                    Apio.io.emit('apio_state_update', s);
                                }
                            })
                         }*/
                        
                           


              Apio.Database.updateProperty(state, function() {
                  Apio.Serial.send(state, function() {
	                  //Apio.io.emit("apio_server_update", data);


                      if (callback) {
                          callback();
                      }
                  })
              });
          })
          //At this point, the http response has been sent
          //but we keep looking for events to launch
          Apio.Database.db.collection('Events')
              .find({
                  triggerState: stateName
              })
              .toArray(function(err, triggeredEvents) {
                  if (err) {
                      console.log("Error in applyState while fetching triggered events.")
                  } else {
                      triggeredEvents.forEach(function(event) {
                          Apio.Event.launch(event.name);
                      })
                  }
              })
      }
      Apio.Object = {};
      Apio.Object.list = function(callback) {
          Apio.Database.db.collection('Objects')
              .find()
              .toArray(function(err, data) {
                  if (err)
                      callback(err, null)
                  else
                      callback(null, data)
              });
      }


      //Questo è il server remoto.
      Apio.Object.update = function(data, callback) {
          var socket = Apio.io
          Apio.Logger.log({
                  source : 'ApioOS',
                  event : 'update',
                  value : data
              })
              //console.log("Sono dentro Object.update e data vale "+data)

          if (data.writeToDatabase === true) {
              Apio.Database.updateProperty(data, function() {
                  //Connected clients are notified of the change in the database
                  socket.emit("apio_server_update", data);
                  //socket.broadcast.emit("apio.object.update", data);
                  if (data.writeToSerial === true && Apio.Configuration.serial.enabled == true) {
                      Apio.Serial.send(data, function() {
                          callback(); //si serial si update
                      });
                  } else {
                      callback(); //no serial si update
                  }
              });
          } else {
              if (data.writeToSerial === true && Apio.Configuration.serial.enabled == true) {
                //console.log(data);
                  Apio.Serial.send(data, function() {
                      callback(); //solo serial
                  });
              } else {
                  callback(); //no serial no update
              }
          }
      }


      Apio.System = {};

      Apio.System = {
          ApioIdentifier: null
      };
      
      
      
      Apio.System.launchEvent = function(eventName, callback) {
        Apio.Database.db.collection('Events')
            .find({
                name: eventName
            })
            .toArray(
                function(error, data) {

                    if (error) {
                        console.log("launchEvent() Error while fetching event data");
                        callback(error);
                    }
                    if (data !== null) {

                        if (data instanceof Array) {
                            console.log("Data è un array di " + data.length + " elementi")
                            data.forEach(function(e, i, v) {
                                console.log("Trovato un evento da lanciare")
                                e.triggeredStates.forEach(function(_e, _i, _v) {
                                    console.log("Trovato stato da triggerare: " + _e);
                                    console.log(_e)
                                    Apio.System.applyState(_e.name, function(err) {
                                        //
                                    },true)
                                })
                            })
                            if (callback)
                                callback(null);
                        } else {
                            console.log("Data non è un array :/")
                        }

                    } else {
                        console.log("nON c'è alcun evento chiamato dallo stato " + triggerState)
                        callback("No events")
                    }
                }
        );
    }
    Apio.System.applyState = function applyState(stateName, callback,eventTriggered) {
        if ("undefined" == typeof eventTriggered)
            eventTriggered = false;
        function pause(millis) {
            var date = new Date();
            var curDate = null;
            do {
                curDate = new Date();
            } while (curDate - date < millis);
        }



        var stateHistory = {};

        var getStateByName = function(stateName, callback) {
            Apio.Database.db.collection('States').findOne({
                name: stateName
            }, callback);
        }

        var arr = [];
        var hounsensore = false;
        var applyStateFn = function(stateName, callback, eventFlag) {
            console.log("***********Applico lo stato " + stateName + "************");
            if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
                getStateByName(stateName, function(err, state) {
                		if (state.hasOwnProperty('sensors') && state.sensors.length >0) {
                			console.log("Skipping sensor state")
                			hounsensore = true;
                		}
                    if (err) {
                        console.log("applyState unable to apply state");
                        console.log(err);
                    } else if (eventFlag) {
                        console.log("eventFlag è true, quindi setto lo stato ad active")
                        arr.push(state);
                        Apio.Database.db.collection('States').update({
                            name: state.name
                        }, {
                            $set: {
                                active: true
                            }
                        }, function(err) {
                            if (err) {
                                console.log("Non ho potuto settare il flag a true");
                            } else {
                                var s = state;
                                s.active = true;
                                Apio.io.emit('apio_state_update', s);
                            }
                        });
                        console.log("Lo stato che sto per applicare è " + state.name);
                        //console.log(state);

                        Apio.Database.updateProperty(state, function() {
                            stateHistory[state.name] = 1;
                            //Connected clients are notified of the change in the database
                            Apio.io.emit("apio_server_update", state);
                            Apio.Database.db.collection("Events").find({
                                triggerState: state.name
                            }).toArray(function(err, data) {
                                if (err) {
                                    console.log("error while fetching events");
                                    console.log(err);
                                }
                                console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                console.log(data);
                                if (callback && data.length == 0) {
                                    callback();
                                }
                                //data è un array di eventi
                                data.forEach(function(ev, ind, ar) {
                                    var states = ev.triggeredStates;
                                    console.log("states vale:");
                                    console.log(states)
                                    states.forEach(function(ee, ii, vv) {
                                        console.log("Chiamo applyStateFN con eventflag=true")
                                        applyStateFn(ee.name, callback, true);
                                    })
                                })
                            });
                        });
                    } else {
                        if (state.active == true) {
                            console.log("Lo stato è attivo")
                            Apio.Database.db.collection('States').update({
                                name: state.name
                            }, {
                                $set: {
                                    active: false
                                }
                            }, function(errOnActive) {
                                if (errOnActive) {
                                    console.log("Impossibile settare il flag dello stato");
                                    callback(new Error('Impossibile settare il flag dello stato'))
                                } else {
                                    var s = state;
                                    s.active = false;
                                    //Apio.io.emit('apio_state_update', s);
                                }
                            })
                        } else {
                            console.log("Lo stato è disattivo")
                            arr.push(state);
                            Apio.Database.db.collection('States').update({
                                name: state.name
                            }, {
                                $set: {
                                    active: true
                                }
                            }, function(err) {
                                if (err) {
                                    console.log("Non ho potuto settare il flag a true");
                                } else {
                                    var s = state;
                                    s.active = true;
                                    Apio.io.emit('apio_state_update', s);
                                }
                            });
                            console.log("Lo stato che sto per applicare è ");
                            //console.log(state);
                            Apio.Database.updateProperty(state, function() {
                                stateHistory[state.name] = 1;
                                //Connected clients are notified of the change in the database
                                Apio.io.emit("apio_server_update", state);
                                Apio.Database.db.collection("Events").find({
                                    triggerState: state.name
                                }).toArray(function(err, data) {
                                    if (err) {
                                        console.log("error while fetching events");
                                        console.log(err);
                                    }
                                    console.log("Ho trovato eventi scatenati dallo stato " + state.name);
                                    console.log(data);
                                    if (callback && data.length == 0) {
                                        callback();
                                    }
                                    //data è un array di eventi
                                    data.forEach(function(ev, ind, ar) {
                                        var states = ev.triggeredStates;
                                        console.log("states vale:");
                                        console.log(states)
                                        states.forEach(function(ee, ii, vv) {
                                            console.log("Chiamo applyStateFN con eventFlag=true")
                                            applyStateFn(ee.name, callback, true);
                                        })
                                    })
                                });
                            });
                        }
                    }
                })
            } else {
                console.log("Skipping State application because of loop.")
            }
        }; //End of applyStateFn
        applyStateFn(stateName, function() {
            console.log("applyStateFn callback")
                var pause = function(millis) {
                    var date = new Date();
                    var curDate = null;
                    do {
                        curDate = new Date();
                    } while (curDate - date < millis);
                };
                //console.log("arr vale:");
                //console.log(arr);
                var contatore = 0;
                for (var i in arr) {
                  //Questo fix migliora gli eventi, c'è da verificare se comunque funziona tutto come dovrebbe.
                  if(contatore==0){
                    contatore= contatore+1;

                  }else{


                		if (hounsensore == true && i==0){
                			console.log("Non mando la seguente cosa in seriale perchè ho un sensore")
                            console.log(arr[i])
                		} else {
                			console.log("Mando alla seriale la roba numero " + i)
                            console.log(arr[i]);
                            console.log('============================================')
                    Apio.Serial.send(arr[i], function() {
                        pause(100);
                    });
                		}
                  }


                }
                if ('undefined' !== typeof callback)
                    callback(null);
                arr = [];
        }, eventTriggered);
    }
    Apio.System.checkEvent = function(state) {
        //Se allo stato triggerato corrisponde un evento, lancia quell'evento
    };


      Apio.System.getApioIdentifier = function() {
          if (null !== Apio.System.ApioIdentifier && 'undefined' !== typeof Apio.System.ApioIdentifier) {
              return Apio.System.ApioIdentifier
          } else {
              if (fs.existsSync('./Identifier.apio')) {
                  Apio.System.ApioIdentifier = fs.readFileSync('./Identifier.apio', {
                      encoding: 'utf-8'
                  }).trim();
              } else {
                  Apio.System.ApioIdentifier = uuidgen.v4()
                  fs.writeFileSync('./Identifier.apio', Apio.System.ApioIdentifier);
              }
              return Apio.System.ApioIdentifier;
          }

      }
      Apio.System.getApioSecret = function() {
          var key = '';
          if (fs.existsSync('./Secret.apio')) {
              key = fs.readFileSync('./Secret.apio', {
                  encoding: 'utf-8'
              });
              key = key.trim()
          } else {
              //Lo genero per ora, poi ci penserà un installer
              key = uuidgen.v4()
              Apio.Util.log("Generating Secret.apio.. THIS MUST BE CREATED AT FACTORY TIME")
              fs.writeFileSync('./Secret.apio', key);
          }
          return key;
      }
      Apio.Event.launch = function(eventName, cb) {
          var counter = 0;
          var loops = 1;
          var loopCounter = 1;

          Apio.Database.db.collection('Events')
              .findOne({
                      name: eventName
                  },
                  function(error, event) {

                      if (error) {
                          console.log("launchEvent() Error while fetching event " + eventName);
                          callback(error);
                      }
                      if (event !== null) {
                          console.log("Ecco gli scatenati");
                          console.log(event.triggeredStates)
                          if (event.hasOwnProperty('loop'))
                              loops = event.loop;
                          var processTriggeredState = function() {
                              var delay = 0;
                              if (event.triggeredStates[counter].hasOwnProperty('delay'))
                                  delay = event.triggeredStates[counter].delay;
                              console.log("Setto il timeout dello stato " + event.triggeredStates[counter].name + " al valore " + event.triggeredStates[counter].delay)
                              setTimeout(function() {

                                  Apio.State.apply(event.triggeredStates[counter].name, function() {

                                      console.log("Ho processato " + event.triggeredStates[counter].name);
                                      counter++;
                                      if (counter >= event.triggeredStates.length) {
                                          counter = 0;
                                          loopCounter++;
                                          console.log("\nFinito il ciclo")
                                      }
                                      if (loopCounter > loops) {
                                          console.log("\nFinito evento")
                                      } else {
                                          processTriggeredState();
                                      }
                                  })
                              }, delay)

                          }
                          processTriggeredState();




                      }
                  })
      }



      /*Apio.System.notify = function(notification,callback) {
      //Notifica a tutti gli utenti di un evento
      //Questo viene fatto inviando una notifica ai client attivi
      console.log("Ciao, sono Apio..System.notify e mi è arrivata questa notifica")
      notification.timestamp = (new Date()).getTime();
      console.log(notification);
      Apio.Database.db.collection('Users').update({},{$push : {"unread_notifications" : notification}},function(err,data){
          if (err)
              console.log("Apio.System.notify Error, unable to send the notification");
          else {
              console.log("Emitto la notifica");
              Apio.io.emit('apio_notification',notification);
              if (callback)
                  callback();
          }
      })

  }*/
      /*
       *
       */
      function getStateByName(stateName, callback) {
          Apio.Database.db.collection('States')
              .findOne({
                  name: stateName
              }, function(err, state) {
                  if (err) {
                      console.log("Error in while fetching applied state data.")
                      console.log(error);
                      callback(error, null)
                  } else {
                      callback(null, state)
                  }
              })
      }

      Apio.State.apply = function(stateName, callback, options) {
          getStateByName(stateName, function(error, state) {
	          console.log(state);
			  //state.active=true;

              Apio.Database.updateProperty(state, function() {
                  Apio.Serial.send(state, function() {
	                  Apio.io.emit("apio_server_update", state);
	                  
	                  //Apio.io.emit("apio_state_update", state);


                      if (callback) {
                          callback();
                      }
                  })
              });
          })
          //At this point, the http response has been sent
          //but we keep looking for events to launch
          Apio.Database.db.collection('Events')
              .find({
                  triggerState: stateName
              })
              .toArray(function(err, triggeredEvents) {
                  if (err) {
                      console.log("Error in applyState while fetching triggered events.")
                  } else {
                      triggeredEvents.forEach(function(event) {
                          Apio.Event.launch(event.name);
                      })
                  }
              })
      }

      Apio.System.notify = function(notification, callback) {
          var areJSONsEqual = function(a, b) {
              function check(a, b) {
                  for (var attr in a) {
                      if (attr !== "timestamp" && a.hasOwnProperty(attr) && b.hasOwnProperty(attr)) {
                          if (a[attr] != b[attr]) {
                              switch (a[attr].constructor) {
                                  case Object:
                                      return areJSONsEqual(a[attr], b[attr]);
                                  case Function:
                                      if (a[attr].toString() != b[attr].toString()) {
                                          return false;
                                      }
                                      break;
                                  default:
                                      return false;
                              }
                          }
                      } else {
                          return false;
                      }
                  }
                  return true;
              }

              return check(a, b) && check(b, a);
          };

          //Notifica a tutti gli utenti di un evento
          //Questo viene fatto inviando una notifica ai client attivi
          console.log("Ciao, sono Apio..System.notify e mi è arrivata questa notifica")
          notification.timestamp = (new Date()).getTime();
          console.log(notification);
          Apio.Remote.socket.emit('apio.server.notification', notification)
          if (notification.properties == "online") {
              Apio.io.emit('apio_notification', notification);
              Apio.Remote.socket.emit('apio.server.notification', notification)
          } else {
              Apio.Database.db.collection("Users").find().toArray(function(err, data) {
                  if (err) {
                      console.log("Errore: " + err);
                  } else {
                      for (var i in data) {
                          var flag = false;
                          for (var j in data[i].disabled_notification) {
                              if (typeof data[i].disabled_notification !== "undefined" && data[i].disabled_notification.length > 0 && areJSONsEqual(data[i].disabled_notification[j], notification)) {
                                  flag = true;
                                  break;
                              }
                          }
                          if (true) {
                              Apio.Database.db.collection('Users').update({
                                  "email": data[i].email
                              }, {
                                  $push: {
                                      "unread_notifications": notification
                                  }
                              }, function(err, data) {
                                  if (err)
                                      console.log("Apio.System.notify Error, unable to send the notification");
                                  else {
                                      console.log("Emitto la notifica");
                                      Apio.io.emit('apio_notification', notification);
                                      Apio.Remote.socket.emit('apio.server.notification', notification)
                                      if (callback)
                                          callback();
                                  }
                              });
                          }
                      }
                  }
              });
          }
      };

      Apio.System.jobs = {};

      //Questa funzione deve essere chiamata alla creazione dell''evento se quell'evento è scheduled
      Apio.System.registerCronEvent = function(event) {
          /*
          Seconds: 0-59
          Minutes: 0-59
          Hours: 0-23
          Day of Month: 1-31
          Months: 0-11
          Day of Week: 0-6

          * * * * * *
          00 10 16 20 *
      */
          console.log("Registro evento con timer (" + event.triggerTimer + ")");
          Apio.System.jobs[event.name] = new CronJob(event.triggerTimer,
              function() {
                  console.log("Apio.System Executing Scheduled Event '" + event.name + "'");
                  Apio.Event.launch(event.name); //Lancio l'evento
              },
              function() {
                  console.log("Event launched on time");
              },
              true,
              "Europe/Rome");
      }
      Apio.System.resumeCronEvents = function() { //FIX
          //Trova tutti gli eventi schedulati
          Apio.Database.db.collection('Events').find({
              triggerTimer: {
                  $exists: true
              }
          }).toArray(function(err, docs) {

              docs.forEach(function(event, i, a) {
                  Apio.System.registerCronEvent(event);
              })
          })
      }
      //FIXME SE riavvio il processo i cron task si perdono!
      //Devo scriverli nel db e caricarli al bootstrap dell'applicazione
      Apio.System.deleteCronEvent = function(eventName) {
          if (Apio.System.jobs.hasOwnProperty(eventName))
              delete Apio.System.jobs[eventName];
          else
              console.log("Apio.System.deleteCronEvent: unable to delete cron event " + eventName + " : the cron event does not exist;");
      }

      Apio.Remote = {
          connectionRetryCounter: 0
      };
      Apio.Remote.initializeSocket = function() {

      }
      if (Apio.Configuration.remote.enabled === true) {
          Apio.Remote.socket = require('socket.io-client')(Apio.Configuration.remote.uri);
      }




      return Apio;



  };

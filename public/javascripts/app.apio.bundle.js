(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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


(function(){
	"use strict";
	var Apio = {};

	//Dovrà essere nascosto o incapsulato. Il programmatore non deve aver accesso al socket.
	//Magari con un getSocket() o qualcosa che utilizzi solo chi sa cosa fa
	Apio.Socket = {};

	Apio.Socket.init = function() {
		Apio.socket = io();

		Apio.socket.on('apio_server_update',function(event){
			//Se arriva un evento inerente ad una app aperta, la updato subito
			/*if (Apio.Application.hasOwnProperty('current') && Apio.Application.getCurrentApplication().objectId == event.objectId)
				Apio.Application.getApplicationById(event.objectId).update(event);
			else
				Apio.NotificationCenter.pushEvent(event);  //altrimenti lo faccio gestire dal centro notifiche
			*/
		});
	};



	Apio.Application = {};
	Apio.Application._applications = {};


	Apio.Application.load = function(appName,callback) {
		//Ignoro se già in cache
		if (!Apio.Application._applications.hasOwnProperty(appName))
			$.getScript("/javascripts/applications/"+appName+"/"+appName+".js",callback);
		else
			callback();
	}
	Apio.Application.getCurrentApplication = function() {
		return Apio.Application.current;
	}
	/*
	*	@param name The application's name
	*/
	Apio.Application.create = function(config) {



		var app_object = config;

		console.log("apio.client.js Creating the "+app_object.objectId+" application");

		$.getJSON('/apio/database/getObject/'+app_object.objectId,function(data){
			console.log("Dentro il callback")
			for (var key in data.properties)
				app_object[key] = data.properties[key];

			Apio.Application.current = app_object;




			//caching applications
			Apio.Application._applications[app_object.objectId] = app_object;
			console.log("apio.client.js Ho registrato una applicazione di nome "+app_object.objectId)

			if (app_object.hasOwnProperty('init'))
				app_object.init();

			return app_object;

		});
		//Carico il file con la definizione dell'interfaccia
		//Disegno la view
		//Carico lo stato dell'oggetto dal database
		//Bindo il model al controller
		//Applico il model alla view
		//Bindo il controller alla view
		//Così nel controller se manipolo il model, si riflettono i cambiamenti sulla view



	};
	Apio.Application.launch = function(appName) {
		Apio.Application._applications[appName].init();
	}

	//Queste saranno funzioni di sistema non usate dal programmatore di app, anche se
	//comunque rilasciate come lib probabilmente.
	Apio.Property = {};

	Apio.Property.Object = function() {
		this.render = function() {};
	}
	Apio.Property.Slider = function(config) {
		//oggetto slider, con rendering ed eventi
		if (!config.hasOwnProperty('min') || !config.hasOwnProperty('max') || !config.hasOwnProperty('step'))
			throw new Error("Apio.Property.Slider(config) must specify min,max and step values");
	};
	Apio.Property.Trigger = function(config) {
		/*
			Valori richiesti
			off, on
		*/
		if (!config.hasOwnProperty('off') || !config.hasOwnProperty('on'))
			throw new Error("Apio.Property.Trigger(config) must specify on and off values");
	}
	Apio.Property.Trigger.prototype.render = function() {
		var html = 	'<div class="onoffswitch" style="position:relative;width:90px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;" >'+
    				'<input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch" checked style="display:none;" >'+
    				'<label class="onoffswitch-label" for="myonoffswitch" style="display:block;overflow:hidden;cursor:pointer;border-width:2px;border-style:solid;border-color:#999999;border-radius:20px;" >'+
        			'<span class="onoffswitch-inner" style="display:block;width:200%;margin-left:-100%;-moz-transition:margin 0.3s ease-in 0s;-webkit-transition:margin 0.3s ease-in 0s;-o-transition:margin 0.3s ease-in 0s;transition:margin 0.3s ease-in 0s;" ></span>'+
        			'<span class="onoffswitch-switch" style="display:block;width:18px;margin-top:6px;margin-bottom:6px;margin-right:6px;margin-left:6px;background-color:#FFFFFF;background-image:none;background-repeat:repeat;background-position:top left;background-attachment:scroll;border-width:2px;border-style:solid;border-color:#999999;border-radius:20px;position:absolute;top:0;bottom:0;right:56px;-moz-transition:all 0.3s ease-in 0s;-webkit-transition:all 0.3s ease-in 0s;-o-transition:all 0.3s ease-in 0s;transition:all 0.3s ease-in 0s;" ></span>'+
    				'</label></div>';

		return html;
	}

	function renderApplication(appName,domElement) {
		$.get("/apio/getApplicationXml"+appName,function(data){
			//data is xml content
			//var obj = xml2json(data)
			//Scorro il dom dell'app
			// Faccio i miei succosi bindings
			//Attacco il dom dell'app al dom dell'applicazionemadre
			//profit
			//
		})
	}



Apio.Util = {};

Apio.Util.isSet = function(value) {
  if (value !== null && "undefined" !== typeof value)
    return true;
  return false;
};

Apio.Util.ApioToJSON = function(str) {
  //var regex = /(.[a-z0-9])*\:([a-z0-9]*\:[a-z0-9]*\-).*/gi;
  var regex = /([lz])?(\w+)\:(send|update|register+)?\:?([\w+\:\w+\-]+)/;
  var match = regex.exec(str);
  var obj = {};
  if (Apio.Util.isSet(match[1]))
    obj.protocol = match[1];
  obj.objectId = match[2];
  if (Apio.Util.isSet(match[3]))
    obj.command = match[3];
  var mess = match[4];
    obj.properties = {};
  mess = mess.split("-");
  mess.pop();
  mess.forEach(function(e){
    var t = e.split(":");
    console.log(t);
    obj.properties[t[0]] = t[1];
  });


  return obj;
};
		module.exports = Apio;
})();


},{}],2:[function(require,module,exports){
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


var Apio = require ('./apio.client.js');
//var q = require("./bower_components/q");
//Trova un modo migliore per iniettare le dipendenze
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();
//Fixare questo scempio con la dependency injection
Apio.appWidth = parseInt($("#ApioApplicationContainer").css('width'),10);
Apio.newWidth = parseInt($("#ApioApplicationContainer").css('width'),10);
Apio.currentApplication = {};
Apio.currentApplication.subapps = {};

$("#notificationTrigger").on('click',function() {
  $( "#notificationsCenter" ).toggle( "slide",{ direction : 'up'}, 500 );
});

$("#notificationTrigger_mobile").on('click tap',function() {
    $( "#notificationsCenter" ).toggle( "slide",{ direction : 'up'}, 500 );
});

var ApioApplication = angular.module('ApioApplication',['ui.bootstrap','ngRoute','hSweetAlert']);

window.swipe = function(target, callback){
	var startX, startY;
    //Touch event
    $("#"+target).on("touchstart", function(event){
        startX = event.originalEvent.changedTouches[0].pageX;
        startY = event.originalEvent.changedTouches[0].pageY;
    });
    $("#"+target).on("touchend", function(event){
        var distX = event.originalEvent.changedTouches[0].pageX - startX;
        var distY = event.originalEvent.changedTouches[0].pageY - startY;
        if(!$(event.target).is("input") && distX > parseFloat($("#"+target).css("width"))/3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
            $("#"+target).hide("slide", {
                direction: 'right'
            }, 700, callback());
        }
    });

    //Mouse event
    $("#"+target).on("mousedown", function(event){
        startX = event.pageX;
        startY = event.pageY;
    });
    $("#"+target).on("mouseup", function(event){
        var distX = event.pageX - startX;
        var distY = event.pageY - startY;
        if(!$(event.target).is("input") && distX > parseFloat($("#"+target).css("width"))/3 && ((distY >= 0 && distY <= 40) || (distY >= -40 && distY <= 0))){
            $("#"+target).hide("slide", {
                direction: 'right'
            }, 700, callback());
        }
    });
}
window.affix = function(targetScoll,target,top,bottom,callback,callback1){
var startY;
var scroll;
var ex_top = document.getElementById(targetScoll).style.marginTop;
if(!ex_top){
	ex_top = 0;
}
var touch = 1;
var firstInteract = 1;
var interact = 0;
 $("#"+targetScoll).on("touchstart", function(event){
 	//alert('');
	touch = 0;
	if(firstInteract == 1){
	firstInteract = 0;
		if(top === null){
			top = {};
			top.top = $('#'+target).offset().top;
		}
	}
 });
 $("#"+targetScoll).on("scroll", function(event){
 	//alert('');
	touch = 0;
	if(firstInteract == 1){
	firstInteract = 0;
		if(top === null){
			top = {};
			top.top = $('#'+target).offset().top;
		}
	}
 });
    var interval_ = setInterval(function(){
        if(!document.getElementById(targetScoll)){
            clearInterval(interval_);
        }
        else{
            scroll = document.getElementById(targetScoll).scrollTop;
            if(touch == 0){
                //console.log(scroll+' '+top.top);
                if(scroll >= top.top && interact == 0){
                    interact = 1;
                    //document.getElementById(targetScoll).classList.add('webkitOverflowScrollingOn');
                    //document.getElementById(targetScoll).classList.remove('webkitOverflowScrollingOff');
                    document.getElementById(target).style.marginTop = '-'+(top.top)+'px';
                    callback();
                    //alert('maggiore')
                } else if(scroll <= top.top) {
                    interact = 0;
                    //document.getElementById(targetScoll).classList.remove('webkitOverflowScrollingOn');
                    //document.getElementById(targetScoll).classList.add('webkitOverflowScrollingOff');
                    document.getElementById(target).style.marginTop = ex_top+'px'
                    callback1();
                    //alert('minore')
                }
            }
        }
    }, 100) ;

}


ApioApplication.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/home',{
        templateUrl : 'systemApps/home/app.home.html',
        controller : 'ApioHomeController',
        reloadOnSearch: false
      }).
      when('/home/:application',{
        templateUrl : 'systemApps/home/app.home.html',
        controller : 'ApioHomeController',
        reloadOnSearch: false
      }).
      when('/wall',{
        templateUrl : 'systemApps/wall/app.wall.html',
        controller : 'ApioWallController'
      }).
      when('/events',{
        templateUrl : 'systemApps/events/app.events.html',
        controller : 'ApioEventsController'
      }).
      otherwise({
        redirectTo: '/home'
      });
  }]);



ApioApplication.factory('socket', function ($rootScope) {
  return {
    on: function (eventName, callback) {
      Apio.socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(Apio.socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      Apio.socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(Apio.socket, args);
          }
        });
      })
    }
  };
});

ApioApplication.factory('objectService', ['$rootScope','$http',function($rootScope,$http){
  return {
    list : function() {
      var promise = $http.get('/apio/database/getObjects').then(function(response){
        return response;
      })
      return promise;
    },
    getById : function(id) {
      var promise = $http.get('/apio/database/getObject/'+id).then(function(response){
        return response;
      })
      return promise;
    }
  }
}])

ApioApplication.directive('ngTouchEnd', function() {
    return function(scope, element, attrs) {
      var tapping;
      element.bind('touchend', function(e) {
        element.removeClass('active');
          scope.$apply(attrs['ngouchEnd'], element);
      });
    };
  });

ApioApplication.factory('DataSource', ['$http',function($http){
       return {
           get: function(url,callback){
                $http.get(
                    url,
                    {transformResponse:function(data) {
                      // convert the data to JSON and provide
                      // it to the success function below
                        var x2js = new X2JS();
                        var json = x2js.xml_str2json( data );

                        console.log(json);
                        return json;
                        }
                    }
                ).
                success(function(data, status) {
                    // send the converted data back
                    // to the callback function
                    callback(data);
                })
           }
       }
    }]);

/*

ApioApplication.controller('ApioNotificationController',['$scope','$http','socket',function($scope,$http,socket){
        socket.on('apio_notification', function(notification) {
            console.log(notification)
            if (!("Notification" in window)) {
                alert("Apio Notification : " + notification.message);
            }
            // Let's check if the user is okay to get some notification
            else if (Notification.permission === "granted") {
                // If it's okay let's create a notification
                var notification = new Notification("Apio Notification", {
                    body: notification.message,
                    icon : '/images/Apio_Logo.png'
                });

            }

            // Otherwise, we need to ask the user for permission
            // Note, Chrome does not implement the permission static property
            // So we have to check for NOT 'denied' instead of 'default'
            else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function(permission) {
                    // If the user is okay, let's create a notification
                    if (permission === "granted") {
                        var notification = new Notification("Apio Notification", {
                            body: notification.message,
                            icon : '/images/Apio_Logo.png'
                        });
                    }
                });
            }


        });
}])
*/

ApioApplication.filter('removeUndefinedFilter',function(){

  return function(items) {
    var filtered = [];
    items.forEach(function(x){
      if ('undefined' !== typeof x)
        filtered.push(x);
    })

    return filtered;
  }
});

var apioProperty = angular.module('apioProperty', ['ApioApplication']);

  ApioApplication.service('currentObject', ['$rootScope','$window','socket','objectService','$http',function($rootScope, $window,socket,objectService,$http){
  	var modifying = false;
    var obj = {};
    var recording = false;
    var recordingObject = {};
    var _recordingObjectName = "";
    $window.rootScopes = $window.rootScopes || [];
    $window.rootScopes.push($rootScope);

    if (!!$window.sharedService){
      return $window.sharedService;
    }

    $window.sharedService = {
      set: function(newObj){
        obj = newObj;
        angular.forEach($window.rootScopes, function(scope) {
          if(!scope.$$phase) {
              scope.$apply();
          }
        });
      },
      get: function(){
        return obj;
      },
      isModifying : function(val) {
        if ('undefined' == typeof val)
          return modifying;
        else
          modifying = val;
      },
      isRecording : function(val) {
        if ('undefined' == typeof val)
          return recording;
        else
          recording = val;
      },
      recordingStateName : function(name) {
        if ('undefined' === typeof name)
          return _recordingObjectName;
        else
          _recordingObjectName = name;
      },
      stream : function(prop,value) {
        var packet = {
          objectId : obj.objectId,
          properties : {}
        }
        packet.properties[prop] = value;
        socket.emit('apio_client_stream',packet);
      },
      update : function(prop,value,objectId,writeDb,writeSerial) {
        if ('undefined' == typeof writeDb)
          writeDb = true;
        if ('undefined' == typeof writeSerial)
          writeSerial = true;
        obj.properties[prop] = value;
        var o = {
          objectId : typeof objectId !== "undefined" ? objectId : obj.objectId,
          properties : {

          },
          writeToDatabase : writeDb,
          writeToSerial : writeSerial
        }
        o.properties[prop] = value;
        socket.emit('apio_client_update', o);


      },
      updateMultiple : function(update,writeDb,writeSerial) {
        if ('undefined' == typeof writeDb)
          writeDb = true;
        if ('undefined' == typeof writeSerial)
          writeSerial = true;
        var o = {}
        o.objectId = obj.objectId;
        o.properties = update;
        o.writeToDatabase = writeDb;
        o.writeToSerial = writeSerial;
        socket.emit('apio_client_update',o);
      },
      record : function(key,value) {
        if ('undefined' === typeof key && 'undefined' === typeof value)
          return recordingObject
        else if ('undefined' !== typeof key && 'undefined' === typeof value)
          return recordingObject[key];
        else
          recordingObject[key] = value;
      },
      removeFromRecord: function(key) {
        if (recordingObject.hasOwnProperty(key))
          delete recordingObject[key];
      },
      recordLength : function() {
        return Object.keys(recordingObject).length;
      },
      resetRecord : function() {
        recordingObject = {};
        console.log("resetRecord()");
        console.log(recordingObject)
      },
      sync : function(c) {
        var self = this;
          objectService.getById(obj.objectId).then(function(d){
            self.set(d.data);
            if ('function' == typeof c)
              c()
          })

      },
      JSONToArray : function(obj){
       var arr = [];
       for(var i in obj){
           if(isNaN(i)){
               throw new Error("All indexes of JSON must be numbers");
           }
           else{
               arr[parseInt(i)] = obj[i];
           }
       }
       console.log(arr)
       return arr;
   }
    }

    return $window.sharedService;
  }]);

ApioApplication.controller("ApioMainController", ["socket", "sweet", function (socket, sweet) {
    socket.on("apio_serial_refresh", function (data) {
        if(data.refresh === true){
            var time = 25;
            sweet.show({
                title: "Allineamento in corso, tempo rimasto: 25 secondi",
                text: "Questo messaggio si chiuderà automaticamente",
                type: "warning",
                timer: 25000,
                showCancelButton: false,
                confirmButtonClass: "btn-success",
                closeOnConfirm: false
            });

            var nodes = document.getElementsByClassName("sweet-alert").item(0).childNodes;
            for (var i in nodes) {
                if (nodes[i].nodeName === "H2") {
                    var titleNode = nodes[i];
                    titleNode.nextSibling.nextSibling.style.display = "none";
                    break;
                }
            }
            var countdown = setInterval(function () {
                time--;
                if (time === 0) {
                    clearInterval(countdown);
                }
                else if (time === 1) {
                    titleNode.innerHTML = "Allineamento in corso, tempo rimasto: " + time + " secondo";
                }
                else {
                    titleNode.innerHTML = "Allineamento in corso, tempo rimasto: " + time + " secondi";
                }
            }, 1000);
        } else if(data.refresh === false){
            sweet.close();
        }
    });
}]);
},{"./apio.client.js":1}]},{},[2]);

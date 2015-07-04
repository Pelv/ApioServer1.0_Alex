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


(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Apio = require ('../javascripts/apio.client.js');
var ApioDashboardApplication = angular.module('ApioDashboardApplication',['ui.utils','ui.ace','hSweetAlert','ui.router','angularFileUpload','ngImgCrop']);

//Trova un modo migliore per iniettare le dipendenze 
window.Apio = Apio;
window.$ = $;
Apio.Socket.init();

/**
**  Lavora con il singleton creato con Apio.Socket.init()
**/
ApioDashboardApplication.factory('socket', function ($rootScope) {
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

//implemets ajax request to the server and sync the objects in the interface with those in the db
ApioDashboardApplication.factory('objectService', ['$rootScope','$http',function($rootScope,$http){
  return {
    list : function() {
      var promise = $http.get('/apio/database/getObjects').then(function(response){
        return response;
      })
      return promise;
    },
    getById : function(id) {
      var promise = $http.get('/apio/database/getObjectById/'+id).then(function(response){
        return response;
      })
      return promise;      
    }
  }
}]);

//object injector directive
ApioDashboardApplication.directive('wizardObject', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_object.html' 
  };
});
//properties injector directive
ApioDashboardApplication.directive('wizardProperties', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_properties.html'
  };
});
//micro injector directive
ApioDashboardApplication.directive('wizardMicro', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_micro.html'
  };
});
//pins injector directive
ApioDashboardApplication.directive('wizardPins', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_pins.html'
  };
});
//protocol injector directive
ApioDashboardApplication.directive('wizardProtocol', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_protocol.html'
  };
});
//summary injector directive
ApioDashboardApplication.directive('wizardSummary', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_summary.html'
  };
});
//editor injector directive
ApioDashboardApplication.directive('wizardEditor', function(){
  return{
    restrict : 'E',
    templateUrl : '/dashboardApp/objects/objectsApp/new/wizard/wizard_editor.html'
  };
});

/* Apio ui router declaration */
ApioDashboardApplication.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/');
    
    $stateProvider
        
        // HOME STATES AND NESTED VIEWS ========================================
        .state('home', {
            url: '/home',
            templateUrl: '/dashboardApp/home/dashboard_home.html',
            controller: 'ApioDashboardHomeController'
        })

        .state('objects', {
            url: '/objects',
            templateUrl: '/dashboardApp/objects/dashboard_objects.html'
        })

            .state('objects.objectsLaunch', {
                url: '/launch',
                templateUrl: '/dashboardApp/objects/objectsApp/launch/launch.html',
                controller: 'ApioDashboardLaunchController'
            })

            .state('objects.new', {
                url: '/new',
                templateUrl: '/dashboardApp/objects/objectsApp/new/new.html',
                controller: 'ApioDashboardNewController'
            })

            .state('objects.import', {
                url: '/import',
                templateUrl: '/dashboardApp/objects/objectsApp/import/import.html',
                controller: 'ApioDashboardImportController'
            })

        .state('events', {
            url: '/events',
            templateUrl: '/html/dashboard/dashboard_events.html',
            controller: 'ApioDashboardEventsController'
        })

        .state('states', {
            url: '/states',
            templateUrl: '/html/dashboard/dashboard_states.html',
            controller: 'ApioDashboardStatesController'
        })

        .state('settings', {
            url: '/settings',
            templateUrl: '/html/dashboard/dashboard_settings.html'
        })

        .state('documentation', {
            url: '/documentation',
            templateUrl: '/html/dashboard/dashboard_documentation.html'
        })
        
});

ApioDashboardApplication.controller('ApioDashboardGeneralController', ['$scope','objectService','$state', function($scope,objectService,$state){

  $scope.switchToApioOS = function (){
    console.log('switchToApioOS')
    window.location='/app';
  };

  $scope.pageHooks = {
        Events : function() {
              $http.get('/apio/event')
              .success(function(data){
                $scope.events = data;
              });
        },
        Objects : function() {
              objectService.list().then(function(d){
                  $scope.objects = d.data;
              })
        },
        States : function() {

          $http.get('/apio/state')
          .success(function(data){
              $scope.states = data;
          })
        }
  };
  $scope.currentPage='';
  $scope.switchPage = function(pageName) {  
    //$('.dashboardPage#'+$scope.currentPage).css('display','none');
    //$('.dashboardPage#'+pageName).css('display','block');

    $scope.currentPage = pageName;
    if ($scope.pageHooks.hasOwnProperty(pageName)){
      console.log('has pageName: '+pageName);
      $scope.pageHooks[pageName]();
      if(pageName==='Objects'){
        if(pageName!==$scope.currentPage){
          //window.location = 'dashboard#/objects/launch';
          $state.go('objects.objectsLaunch');
        }
        else{
          location.reload();
        }
      }
    }
    else{
      console.log('has no pageName');
    }
  }

}]);


$(function(){
	$(".launcherIcon").error(function(){
	console.log("Image "+$(this).attr("src")+" does not exist");
	$(this).attr("src","/images/Apio_Logo.png");



})
})

},{"../javascripts/apio.client.js":2}],2:[function(require,module,exports){
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


},{}]},{},[1]);

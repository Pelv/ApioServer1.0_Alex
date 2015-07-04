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


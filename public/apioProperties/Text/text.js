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


var apioProperty = angular.module("apioProperty");
apioProperty.directive("text", ["currentObject", "socket", "$timeout", function(currentObject, socket, $timeout){
	return{
		restrict : "E",
		replace : true,
		scope : {
			model : "=propertyname"
		},
		templateUrl : "apioProperties/Text/text.html",
		link : function(scope, elem, attrs){
	    	scope.object = currentObject.get();
	    	scope.currentObject = currentObject;
	    	scope.isRecorded = function() {
	    		return scope.currentObject.record(attrs['propertyname']);
	    	}
	    	scope.addPropertyToRecording = function() {
	    		scope.currentObject.record(attrs['propertyname'], scope.model);
	    	}
	    	scope.removePropertyFromRecording = function() {
	    		scope.currentObject.removeFromRecord(attrs['propertyname']);
	    	}	    	
			//Serve per il cloud: aggiorna in tempo reale il valore di una proprietà che è stata modificata da un"altro utente
			socket.on("apio_server_update", function(self) {
				if (self.objectId === scope.object.objectId  && !currentObject.isRecording()) {
					if (self.properties.hasOwnProperty(attrs["propertyname"])){
						scope.$parent.object.properties[attrs["propertyname"]] = self.properties[attrs["propertyname"]];
						//Se è stata definita una funzione di push viene chiama questa altrimenti vengono fatti i settaggi predefiniti
		    			if(attrs["push"]){
		    				scope.$parent.$eval(attrs["push"]);
		    				$property = {
		    					name : attrs["propertyname"],
		    					value : self.properties[attrs["propertyname"]]
		    				}
			    			var fn = scope.$parent[attrs["push"]];
			    			if(typeof fn === "function"){
			    				var params = [$property];
			    				fn.apply(scope.$parent,params);
			    			}
			    			else{
			    				throw new Error("The Push attribute must be a function name present in scope")
			    			}
		    			}
		    			else{
		    				scope.model = self.properties[attrs["propertyname"]];
		    			}
		    			//
		    			
						/*if(attrs["correlation"]){
							scope.$parent.$eval(attrs["correlation"]);
						}*/
					}
				}
			});
			socket.on("apio_server_update_", function(data){
				if(data.objectId === scope.object.objectId  && !scope.currentObject.isRecording()){
					scope.model = data.properties[attrs["propertyname"]];
				}
			});
			
			//Se il controller modifica l'oggetto allora modifico il model;
			scope.$watch("object.properties."+attrs["propertyname"], function(){
			  	scope.model = scope.object.properties[attrs["propertyname"]];
	    	});
	    	//
	    	
            scope.$on('propertyUpdate',function() {
            	scope.object = currentObject.get();
			});

			
			scope.label = attrs["label"];
			scope.model = scope.object.properties[attrs["propertyname"]];
			scope.propertyname = attrs["propertyname"];
			
            var event = attrs["event"] ? attrs["event"] : "keyup";
			elem.on(event, function(){
				scope.object.properties[attrs["propertyname"]] = scope.model;
	    		if (!currentObject.isRecording()) {
					
					
					//Se è stato definito un listener da parte dell'utente lo eseguo altrimenti richiamo currentObject.update che invia i dati al DB e alla seriale
					if(attrs["listener"]){
						scope.$parent.$eval(attrs["listener"]);
					}
					else{
						currentObject.update(attrs["propertyname"], scope.model);
						scope.$parent.object.properties[attrs["propertyname"]] = scope.model;
					}
					//
					
					//Se è stata definita una correlazione da parte dell'utente la eseguo
					if(attrs["correlation"]){
						scope.$parent.$eval(attrs["correlation"]);
					}
					//
					
					scope.$apply();
				}
			});
			
		    //Esegue i listener dopo che il browser ha fatto il render

		    //
		}
	};
}]);
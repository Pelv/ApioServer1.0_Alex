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


angular.module('ApioDashboardApplication')
.controller('ApioDashboardNewController', ['$scope','objectService','$http','$timeout', function($scope,objectService,$http,$timeout){

	$scope.myImage='';
	$scope.myCroppedImage='';

 	  $scope.handleFileSelect=function(evt) {
 	  	console.log('handle')
 	  	console.log('evt: ');
 	  	console.log(evt);
 	  	console.log('evt.currentTarget: ');
 	  	console.log(evt.currentTarget);
 	  	console.log('evt.currentTarget.files[0]: ');
 	  	console.log(evt.currentTarget.files[0]);
	  var file=evt.currentTarget.files[0];

	  var reader = new FileReader();
	  reader.onload = function (evt) {
	  	console.log('reader.onload');
	  	console.log('evt onload');
	  	console.log(evt)
	    $scope.$apply(function($scope){
	    	console.log('apply');
	    	console.log('evt.target');
	    	console.log(evt.target);
	    	console.log('evt.target.result');
	    	console.log(evt.target.result);
	      $scope.myImage=evt.target.result;
	      console.log('img');
	      console.log($scope.myImage)
	    });
	  };
	  reader.readAsDataURL(file);
	};

	$scope.currentApplication=$scope.$parent.currentApplication;
	$scope.hideWizard=true;
	$scope.hideNewEditor=true;
	$scope.newEditorDisabled=false;
	$scope.wizardDisabled=false;

	$scope.newObject = {};
    $scope.newObject.properties = {};
    $scope.newObject.pins = {};
    $scope.newObject.functions = {};
    $scope.newObject.variables = {};

	$scope.newProperty = {
      name : null,
      type : null
    };
    
    $scope.newPin = {
      name : null,
      number : null,
      type : null
    };

    $scope.getNewObjectId = function(){
    console.log('getNewObjectId running')
    $http.post('/apio/app/maximumId')
        .success(function(data,status,headers){
          console.log("actual maximum Id: "+data);
          $scope.newObject.objectId = (parseInt(data)+1).toString();
        })
        .error(function(){
          console.log("An error has occurred while recovering the actual maximum Id")
        });
 	}

	$scope.showWizard = function(){
	  $scope.hideWizard=false;
	  $scope.hideNewEditor=true;
	  $scope.newEditorDisabled=false;
	  $scope.wizardDisabled=true;
	  $scope.getNewObjectId();
	};
	
	$scope.showNewEditor = function(){
		$scope.hideNewEditor=false;
	    $scope.hideWizard=true;
	    $scope.hideUpdate=true;
	    $scope.newEditorDisabled=true;
	    $scope.wizardDisabled=false;
	    $scope.hideCreate=true;
	    $scope.hideCreateNew=false;
	    $scope.hideUpdate=true;
	    $scope.initNewEditor();
	};

	$scope.initNewEditor = function(){
		var emptyIno = '#include <INSERT_LIBRARY_NAME.h>\n';
	    emptyIno += 'void setup() {\n}\n';
	    emptyIno += 'void loop(){\n}\n';

	    var emptyHtml = '<div id="ApioApplicationINSERT_ID_APPLICATION" ng-app="ApioApplicationINSERT_ID_APPLICATION"  style="padding:10px;">\n';
	    emptyHtml += '\t<div ng-controller="defaultController">\n';
	    emptyHtml += '\t<topappapplication></topappapplication>\n';
	    emptyHtml += '\t<h2 style="text-align:center;">INSERT_NAME_OBJECT</h2>\n';
	    emptyHtml += '\t<!--INSERT_OBJECT_PROPIERTIES-->\n';
	    emptyHtml += '\t</div>\n';
	    emptyHtml += '</div>\n';
	    emptyHtml += '<script src="applications/INSERT_ID_APPLICATION/INSERT_ID_APPLICATION.js"></script>';

	    var emptyJs = 'var app = angular.module(\'ApioApplicationINSERT_ID_APPLICATION\', [\'apioProperty\'])\n';
	    emptyJs += 'app.controller(\'defaultController\',[\'$scope\', \'currentObject\', function($scope, currentObject){\n';
	    emptyJs += '\tconsole.log("Sono il defaultController e l\'oggetto è")\n';
	    emptyJs += '\tconsole.log(currentObject.get());\n';
	    emptyJs += '\t$scope.object = currentObject.get();\n';
	    emptyJs += '\t$scope.myCustomListener = function() {\n';
	    emptyJs += '\t\t/*INSERT_CUSTOM_LISTENER*/\n';
	    emptyJs += '\t}\n';
	    emptyJs += '}]);\n';
	    emptyJs += 'setTimeout(function(){\n';
	    emptyJs += '\tangular.bootstrap(document.getElementById(\'ApioApplicationINSERT_ID_APPLICATION\'), [\'ApioApplicationINSERT_ID_APPLICATION\']);\n';
	    emptyJs += '},10);';

	    var emptyMongo = '{\n';
	    emptyMongo += '\t"properties" : {\n';
	    emptyMongo += '\t\t"INSERT_NAME1_PROPERTY" : "INSERT_VALUE1_PROPERTY",\n';
	    emptyMongo += '\t\t"INSERT_NAME2_PROPERTY" : "INSERT_VALUE2_PROPERTY"\n';
	    emptyMongo += '\t},\n';
	    emptyMongo += '\t"name" : "INSERT_NAME_OBJECT",\n';
	    emptyMongo += '\t"objectId" : "INSERT_ID_OBJECT",\n';
	    emptyMongo += '\t"protocol" : "INSERT_PROTOCOL_OBJECT",\n';
	    emptyMongo += '\t"address" : "INSERT_ADDRESS_OBJECT",\n';
	    emptyMongo += '\t"db" : {\n\t}\n';
	    emptyMongo += '}';

	    console.log('editorHtml: ')
	    console.log($scope.editorHtml)
	    console.log('editorJs: ')
	    console.log($scope.editorJs)
	    console.log('emptyMongo: ')
	    console.log($scope.editorMongo)

	    $timeout(function(){
	     	$scope.editorIno.setValue(emptyIno);
		    $scope.editorIno.clearSelection();  
		    $scope.editorHtml.setValue(emptyHtml);  
		    $scope.editorHtml.clearSelection();
		    $scope.editorJs.setValue(emptyJs); 
		    $scope.editorJs.clearSelection();
		    $scope.editorMongo.setValue(emptyMongo);  
		    $scope.editorMongo.clearSelection(); 
	    	console.log('nel timeout')
	    	$scope.ino = emptyIno;
			$scope.html = emptyHtml;
			$scope.js = emptyJs;
			$scope.mongo = emptyMongo;
			
			//$scope.$digest();
			//$scope.$apply();
	    },1,false)

		   	
	    //devo settare anche i valori nello scope perchè altrimenti se viene
	    //premuto update prima che sia stato dato il focus all'editor 
	    //i relativi ng-model rimangono vuoti
	    
	    //$timeout(function(){}, [delay], [invokeApply]);

     
	   
	};
	
	$scope.addNewProperty = function() {
      var t = $scope.newProperty;
      $scope.newObject.properties[$scope.newProperty.name] = t;
      console.log($scope.newObject.properties)
      $scope.newProperty = {};
    }

    $scope.removeKeyValueProperties = function(key){
    	delete $scope.newObject.properties[key]
 	}

 	$scope.removeKeyValuePins = function(key){
    	delete $scope.newObject.pins[key]
 	}
  
    $scope.addNewPin = function() {
      var t = $scope.newPin;
      $scope.newPin.propertyType = $scope.newObject.properties[$scope.newPin.propertyName].type
      $scope.newObject.pins[$scope.newPin.name] = t;
      $scope.newPin = {};
    }

    $scope.addNewFunction = function() {
      var t = $scope.newFunction;
      $scope.newObject.functions[$scope.newFunction.text] = t;
      $scope.newFunction = {};
    }
    
    $scope.addNewVariable = function() {
      var t = $scope.newVariable;
      $scope.newObject.variables[$scope.newVariable.name] = t;
      $scope.newVariable = {};
    }

    $scope.newListItem = {
      name : "",
      value : ""
    };

    $scope.addListItemToListProperty = function() {
      console.log($scope);
        if (!$scope.newProperty.hasOwnProperty("items"))
          $scope.newProperty.items = {};
        //l'ho dovuta cambiare per adattarsi alla struttura di matteo 
        //e ora l'ho riportata alla vecchia versione
        $scope.newProperty.items[$scope.newListItem.name] = $scope.newListItem.value;
        //$scope.newProperty.items[$scope.newListItem.value] = $scope.newListItem.name;
        console.log($scope.newProperty.items);
        $scope.newListItem.name = '';
        $scope.newListItem.value = '';
        
      }

    $scope.newTriggeredState = '';

    $scope.removeKeyValue = function(key) {
  			console.log("removeKeyValue() "+key)
  	}

    $scope.generateObjectViewFile = function() {
      var html = '<application objectId="'+$scope.newObject.objectId+'">';
      
      
      for (var k in $scope.newObject.properties) {
        var e = $scope.newObject.properties[k];
        html += "<"+e.type+' model="'+e.name+'" />';
      }
      html += '</application>';
      $scope.view = html;


    }

  	$scope.createNewObject = function() {

  			var keys = ["name","objectId","address","pins","functions","variables","properties","virtual","protocol"];
  			var dao = {};
        dao = angular.copy($scope.newObject);

        console.log("Mi accingo a salvare questo oggetto")
        console.log(dao);
  			$http.post('/apio/database/createNewObject',{object : dao})
		      .success(function(){
		        alert("Virtual Object successfullyCreated");
            $scope.newObject = {};
		        $scope.newObject.properties = {};
		        $scope.newObject.pins = {};
		        $scope.newObject.functions = {};
		        $scope.newObject.variables = {};
		      })
		      .error(function(){
		      	alert("An error has occurred while saving the object")
		      });
  	}
  	
}]);
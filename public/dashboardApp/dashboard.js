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

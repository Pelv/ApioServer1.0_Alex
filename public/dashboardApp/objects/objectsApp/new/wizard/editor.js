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
.controller('EditorPanel', ['$scope','$http','sweet','objectService','$state','$rootScope', function($scope,$http,sweet,objectService,$state,$rootScope){

  this.tabb = 1;
  $scope.createIsDisabled = false;


  this.selectTab = function(setTab){
    this.tabb = setTab;
  };

  this.isSelected = function(checkTab){
    return this.tabb === checkTab;
  };

  $scope.aceLoadedIno = function(_editor){
    $scope.$parent.editorIno=_editor;
    
    /*console.log('editor in ace ino loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace ino loaded: ');
    console.log($scope.$parent.editorIno);*/
  }

  $scope.aceLoadedHtml = function(_editor){
    $scope.$parent.editorHtml=_editor;

    /*console.log('editor in ace html loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace html loaded: ');
    console.log($scope.$parent.editorHtml);*/
  }

  $scope.aceLoadedJs = function(_editor){
    $scope.$parent.editorJs=_editor;
    
    /*console.log('editor in ace js loaded: ');
    console.log(_editor);
    console.log('$scope.editor in js ino loaded: ');
    console.log($scope.$parent.editorJs);*/
  }

  $scope.aceLoadedMongo = function(_editor){
    $scope.$parent.editorMongo=_editor;
    
    /*console.log('editor in ace mongo loaded: ');
    console.log(_editor);
    console.log('$scope.editor in ace mongo loaded: ');
    console.log($scope.$parent.editorMongo);*/
  }

  $scope.updateLaunch = function(oldId,newId,ino,html,js,mongo,makefile,icon){
    console.log('I am the updateLaunch updating the app: '+oldId)
    console.log()
    $http.post('/apio/database/updateApioApp',
        {
          objectId : oldId,
          newId: newId,
          ino   : ino,
          html  : html,
          js    : js,
          mongo : mongo,
          makefile : makefile,
          icon : icon
        })
      .success(function(){
        // $scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click'); //simulate the click to refresh the object list      
        $('#static').modal('hide');
        //sweet.show('Done!', 'Your Apio object is now updated in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now updated in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                        //$state.go('objects.objectsLaunch');
                        $state.go($state.current, {}, {reload: true});
                    });

      })
      .error(function(){
        alert("An error has occurred while updating the object" + $rootScope.currentApplication.objectId);
    });
  }

  this.updateApioApp = function(){
    console.log('updating object: '+ $rootScope.currentApplication.objectId);
    console.log('$rootScope.currentApplication.objectId: '+$rootScope.currentApplication.objectId);
    console.log('$rootScope.ino: '+$rootScope.ino);
    console.log('$scope.$parent.ino: '+$scope.$parent.ino);
    console.log('$scope.ino: '+$scope.ino);
    var actualId = $rootScope.currentApplication.objectId;
    var modifiedId = (JSON.parse($scope.mongo)).objectId;


    if(actualId===modifiedId){
      console.log('id has not been modified. It\'s just needed to update the file in the '+actualId+' folder')
      $scope.updateLaunch(actualId,modifiedId,$scope.ino,$scope.html,$scope.js,$scope.mongo,$scope.makefile,$scope.icon);
    }
    else{
      console.log('id has been modified.\n\tActualId: '+actualId+'\n\tModifiedId: '+modifiedId);
      console.log('It\'s needed to drop the old folder and create a new one');
      $http.post('/apio/app/delete',{id:actualId})
      .success(function(){
        console.log('folder '+actualId+'successfully deleted')
        $http.post('/apio/app/folder',{id:modifiedId})
        .success(function(){
          console.log('folder '+modifiedId+'successfully created');
          //it's needed to modify the id in the files.
          $scope.js=$scope.js.replace('ApioApplication'+actualId,'ApioApplication'+modifiedId+'');
          $scope.js=$scope.js.replace('ApioApplication'+actualId,'ApioApplication'+modifiedId+'');
          $scope.js=$scope.js.replace('ApioApplication'+actualId,'ApioApplication'+modifiedId+'');
          
          $scope.html=$scope.html.replace('ApioApplication'+actualId,'ApioApplication'+modifiedId+'');
          $scope.html=$scope.html.replace('ApioApplication'+actualId,'ApioApplication'+modifiedId+'');
          $scope.html=$scope.html.replace('applications/'+actualId+'/'+actualId+'.js','applications/'+modifiedId+'/'+modifiedId+'.js');

          //object.json=object.json.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');
          $scope.mongo=$scope.mongo.replace('"objectId":"'+actualId+'"','"objectId":"'+modifiedId+'"');

          $scope.updateLaunch(actualId,modifiedId,$scope.ino,$scope.html,$scope.js,$scope.mongo,$scope.makefile,$scope.icon);
        })
        .error(function(){console.log('Error. Folder '+actualId+'not created')});
        })
      .error(function(){console.log('Error. Folder '+actualId+'not deleted')});
    }
  };

  this.createNewApioAppFromEditor = function(){
    $scope.createEditorIsDisabled = true;
    console.log($scope.createIsDisabled)
    var self = this;
    $scope.makefile ='';
    var dao = {}; //dataAccessObject
    dao = JSON.parse($scope.mongo);
    console.log("Trying to create the new object from new editor");
    console.log(dao);

    $http.post('/apio/database/createNewApioAppFromEditor',{object : dao, ino : $scope.ino, html : $scope.html, js : $scope.js, mongo : $scope.mongo, makefile : $scope.makefile})
      .success(function(){
        //$scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click');        
        //sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now available in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                        $scope.createEditorIsDisabled = false;
                        $state.go('objects.objectsLaunch');
                    });

      })
      .error(function(){
        $scope.createEditorIsDisabled = false;
        alert("An error has occurred while saving the object" + dao.objectName);
      });
  };

  
  this.sendFilesToServer = function(){
    //$scope.icon=$scope.$parent.icon;
    var icon=$scope.$parent.myCroppedImage;
    console.log($scope.icon)

    $scope.createIsDisabled = true;
    var self = this;
    var dao = {}; //dataAccessObject
    var mongoObject = JSON.parse($scope.mongo);
    console.log("Trying to create the new object")
    dao = angular.copy($scope.newObject);
    console.log('dao');
    console.log(dao);
    if(mongoObject.objectId!==dao.objectId)
    {
      console.log('Id has been changed')
      console.log('mongoObject Id: '+mongoObject.objectId)
      console.log('mongoObject Id: '+dao.objectId)
      dao.objectId = mongoObject.objectId;
    }
    else{
      console.log('Id has not been changed')
      console.log('mongoObject Id: '+mongoObject.objectId)
      console.log('mongoObject Id: '+dao.objectId)
    }
    $http.post('/apio/database/createNewApioApp',{object : dao, ino : $scope.ino, html : $scope.html, js : $scope.js, mongo : $scope.mongo, makefile : $scope.makefile, icon: icon})
      .success(function(){
        //$scope.switchPage('Objects');
        //$('#objectIdTrigger').trigger('click');        
        //$state.go('objects.objectsLaunch');
        //sweet.show('Done!', 'Your Apio object is now available in the home!', 'success');
        sweet.show({
                      title: "Done!",
                      text: "Your Apio object is now available in the home!",
                      type: "success",
                      showCancelButton: false,
                      confirmButtonClass: "btn-success",
                      confirmButtonText: "Ok",
                      closeOnConfirm: true
                    },
                    function(){
                      $scope.createIsDisabled = false;
                      window.open('/apio/app/exportIno?id='+dao.objectId);
                      $state.go('objects.objectsLaunch');
                    });

        $scope.$parent.newObject = {};
        $scope.$parent.newObject.properties = {};
        $scope.$parent.newObject.pins = {};
        $scope.$parent.hide=false;
        $scope.$parent.tab = 1;
        
        $scope.$parent.progressBarValue = 0;
        $scope.$parent.activeForm = 1; 
        console.log('self.tabb before' + self.tabb);
        self.tabb = 1;
        console.log('self.tabb after' + self.tabb);
        //$scope.$apply();
      })
      .error(function(){
        $scope.createIsDisabled = false;
        alert("An error has occurred while saving the object" + $scope.newObject.objectName);
      });
  };

}]);
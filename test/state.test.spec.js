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


//state test

var frisby = require('frisby');
var test_state = {
	name : 'TestState',
	objectId : '0000',
	objectName : 'TestObject',
	properties : {
		'test_prop_1' : '1',
		'test_prop_2' : '0'
	}
}

var test_object = {

    "address" : "40B39AFFD0",
    "db" : {},
    "name" : "TestObject",
    "objectId" : "0000",
    "properties" : {
        'test_prop_1' : '1',
		'test_prop_2' : '0'
    },
    "protocol" : "z"
}
var url = 'http://localhost:8083';
frisby.create('Apio Server States test: fetch all')
			.get(url+'/apio/state/')
			.expectStatus(200)
			.expectJSONTypes('', Array)
			.toss();

frisby.create('Apio Server States test: create')
	.post(url+'/apio/state',{'state' : test_state})
	.expectStatus(200)
	.afterJSON(function(json){

		frisby.create('Apio Server States test: read')
			.get(url+'/apio/state/'+test_state.name)
			.expectStatus(200)
			.expectJSON(test_state)
			.toss();
		frisby.create('Apio Server States test: read')
			.post(url+'/apio/state/apply',{'state' : test_state})
			.expectStatus(200)
			.toss();
		frisby.create('Apio Server States test: delete')
			.delete(url+'/apio/state/'+test_state.name)
			.expectStatus(200)
			.toss();

	})
	.toss();
#include <apioGeneral.h>

String name;

void serialEvent(){
	name = Serial.readStringUntil(':');
	Serial.println("Ciao "+ name);
	
}

void setup(){
	generalSetup();

}

void loop(){
	
}
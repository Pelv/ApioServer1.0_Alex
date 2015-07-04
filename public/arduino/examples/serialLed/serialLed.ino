#include <apioGeneral.h>

String property;

void serialEvent(){
	property = Serial.readStringUntil(':');
	
}

void setup(){
	generalSetup();
	pinMode(20, OUTPUT);

}

void loop(){
	if(property=="on")
	{
		digitalWrite(20,HIGH);
	}
	if(property=="off")
	{
		digitalWrite(20,LOW);
	}
}

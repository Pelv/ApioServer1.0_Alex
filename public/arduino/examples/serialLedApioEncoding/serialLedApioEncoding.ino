#include <apioGeneral.h>

String property;
String valore;

void serialEvent(){
	property = Serial.readStringUntil(':');
        valore = Serial.readStringUntil(':');
	
}

void setup(){
	generalSetup();
	pinMode(20, OUTPUT);

}

void loop(){
	if(property=="onoff")
	{
                if(valore=="1"){
                  digitalWrite(20,HIGH);
                }
                if(valore=="0"){
                  digitalWrite(20,LOW);
                }         
	}
}

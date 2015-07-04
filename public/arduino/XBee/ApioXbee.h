/*
libreria contenente le variabili generali 
e funzioni utili
*/

/*-----------------------definizione costanti -------------------------------*/
#define ARRAY_LENGTH 20


/*---------------------dichiarazioni variabili-----------------------------*/

String dispositivo;
String proprieta; // variabili che sono da processare nel loop in corso
String valore;  // variabili che sono da processare nel loop in corso
//String content; //contiene tutta la stringa: dispositivo+proprieta1+valore1+...+proprietan+valoren
String proprietaArray[ARRAY_LENGTH];
String valoreArray[ARRAY_LENGTH];
int numberkey=0;
int j=0;

//dati ricevuti


bool TX_has_gone; 
bool RX_has_arrived;

int flag=1; //flag che gestisce la logica della select
int x=0;//serve per tenere traccia dell'attuale chiave valore nel loop

XBee xbee = XBee();
ZBRxResponse zbRx = ZBRxResponse(); //per il pacchetto in ricezione vero e proprio
ZBTxRequest zbTx = ZBTxRequest(); 
ZBTxStatusResponse txStatus = ZBTxStatusResponse(); // per la risposta dell'xbee 

char Buffer[62]; //serve sulla funzione apioRecive() 


//----------------------------------------------------------------------------------------
//RICEZIONE
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//This function choose property and value from propertyArray valueArray. This must be declared on every loop(Can be
//placed in input?)
void select()
{
  if(x==numberkey && flag==1)
  {
    x=0;
    for(int k=0; k<numberkey; k++)
    {
      proprietaArray[k]="";
      valoreArray[k]="";
    }
    numberkey=0;
    j=0;
    flag=0;
    
  }
  if(numberkey!=0)
  {
    proprieta=proprietaArray[x];
    valore=valoreArray[x];
    x++;
    flag=1;
    Serial.println(proprieta+":"+valore);
    Serial.println(x);
    delay(10);
  }

}

//funzione che salva le coppie propireta valore nei rispettivi vettori ovvero proprietaArray_in[ARRAY_LENGTH] 
//e valoreArray_in[ARRAY_LENGTH];
void divide_string(String striga_da_dividere) {
  
  int strlen=striga_da_dividere.length();

  int i; //contatore
  dispositivo=""; 
  for(i=0; i<strlen ; i++)
  {
    if(striga_da_dividere.charAt(i)=='-')
      numberkey++;

  }
  Serial.println(numberkey);
  
  //-----------dispositivo----------------  
  
  for(i=0; striga_da_dividere.charAt(i)!=':' && i<strlen ;i++)
  {
    dispositivo += String(striga_da_dividere.charAt(i));
  }

  for(j; j<numberkey ;j++)
  {
    //-----------proprietà----------------

    for(i++; striga_da_dividere.charAt(i)!=':' && i<strlen ;i++)
    {
      proprietaArray[j] += String(striga_da_dividere.charAt(i));
      
    }
    Serial.println(proprietaArray[j]);

    
    //-----------valore----------------  
    
    for(i++; striga_da_dividere.charAt(i)!='-' && i<strlen ;i++)
    {
      valoreArray[j] += String(striga_da_dividere.charAt(i)); 
    }
    
  }
}
//INIZIALIZZAZIONE
void apioSetupUno()
{
  Serial.begin(9600);
  xbee.setSerial(Serial);
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//This function receive from comunication channel(in this case XBee) launch divide string for populate proprietaArry
//valueArray
void apioReceive()
{

  // 1. This will read any data that is available:
  xbee.readPacket();

  // 2. Now, to check if a packet was received: 
  if (xbee.getResponse().isAvailable()) //se è vero ho ricevuto qualcosa
  {
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) //se è vero ho ricevuto un pacchetto zb rx
    {
        //Serial.println("ciao");
       xbee.getResponse().getZBRxResponse(zbRx); //riempio la classe zb rx
       /*flashLed(led, zbRx.getDataLength(), 500);*/
       for (int i = 0; i < zbRx.getDataLength(); i++) 
       {
           /*buffer[i] = char*/
           Buffer[i]=zbRx.getData()[i];
       }
       Serial.println(String(Buffer));
       divide_string(String(Buffer));
       //content="";
       for (int i = 0; i < 62; i++) 
       {
           /*buffer[i] = char*/
           Buffer[i]=NULL;
       }
    }
  }
  select();
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/


//INVIO
/*------------------------------------------------------------------------*/
//funzione che invia ciò che gli viene passato al cordinatore della rete.
void apioSend(String daInviare)
{
  char daInviare_char[100]; //contiene la stringa daInviare (ma in char ). Serve perche la funzione
  daInviare.toCharArray(daInviare_char, 100);
  XBeeAddress64 addr64 = XBeeAddress64(0x0013A200, 0x40B3E1D4);
  zbTx = ZBTxRequest(addr64, (uint8_t*)(daInviare_char), strlen(daInviare_char)); //strlen NON include anche '\0'
  xbee.send(zbTx);
}

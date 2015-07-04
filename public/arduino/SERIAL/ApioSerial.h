/*---------------------dichiarazioni costanti-----------------------------*/

#define INDIRIZZO_COORDINATORE  0
#define ARRAY_LENGTH 50
#define INDIRIZZO_OGGETTO  34

/*---------------------dichiarazioni variabili-----------------------------*/

String content; //contiene tutta la stringa: dispositivo+proprieta1+valore1+...+proprietan+valoren 

String dispositivo;
String proprieta; // variabili che sono da processare nel loop in corso
String valore;  // variabili che sono da processare nel loop in corso
//String content; //contiene tutta la stringa: dispositivo+proprieta1+valore1+...+proprietan+valoren
String proprietaArray[ARRAY_LENGTH];
String valoreArray[ARRAY_LENGTH];
int numberkey=0;
int j=0;


char sendThis[109]; //se lo dichiaro locale non funziona bene


int flag; //flag che gestisce la logica della select
int x=0;//serve per tenere traccia dell'attuale chiave valore nel loop



/*---------------------dichiarazioni funzioni-----------------------------*/

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//funzione che salva le coppie propireta valore nei rispettivi vettori ovvero proprietaArray[ARRAY_LENGTH] 
//e valoreArray[ARRAY_LENGTH];

void divide_string(String stringa_da_dividere) {
  
  int strlen=stringa_da_dividere.length();
 
  int i; //contatore
  dispositivo=""; 
  for(i=0; i<strlen ; i++)
  {
    if(stringa_da_dividere.charAt(i)=='-')
      numberkey++;
  }
  Serial.println(numberkey);
  //-----------dispositivo----------------  
  
  for(i=0; stringa_da_dividere.charAt(i)!=':' && i<strlen ;i++)
  {
    dispositivo += String(stringa_da_dividere.charAt(i));
  }

  for(j; j<numberkey ;j++)//j non viene inizializzato perche deve tener conto anche delle coppie che sono arrivate prima
  {
    //-----------proprietà----------------

    for(i++; stringa_da_dividere.charAt(i)!=':' && i<strlen ;i++)
    {
      proprietaArray[j] += String(stringa_da_dividere.charAt(i));
    }

    
    //-----------valore----------------  
    
    for(i++; stringa_da_dividere.charAt(i)!='-' && i<strlen ;i++)
    {
      valoreArray[j] += String(stringa_da_dividere.charAt(i)); 
    }
    Serial.println(proprietaArray[j]+":"+valoreArray[j]);

  }
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/


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
    Serial.print("select: ");
    Serial.print(proprieta);
    Serial.println(":"+valore);
  }

}
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

void apioReceive()
{
  if(Serial.available()>0)
  {
    while (Serial.available())
    {
      char buf = Serial.read();
      delay(1);
      content += buf;
      delay(1);
    }
    Serial.println(content);

    divide_string(content);    
    content="";
  }    
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void apioLoop(){
    apioReceive();
    select();
}
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void apioSetup()
{
  Serial.begin(9600);
  Serial.println("setup oggetto");

}


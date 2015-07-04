/*---------------------constants definition-----------------------------*/

#define COORDINATOR_ADDRESS_LWM  0
#define ARRAY_LENGTH 10

/*---------------------variables definition-----------------------------*/

String deviceAddr;
String property; // variables that are to be processed in the running loop
String value;  // variables that are to be processed in the running loop
String propertyArray[ARRAY_LENGTH];
String valueArray[ARRAY_LENGTH];
int numberkey=0;
int j=0;


char sendThis[109]; //if it does not work well declare local
bool nwkDataReqBusy = false;

bool TX_has_gone;
bool RX_has_arrived;

int flag; //flag which manages the logic of the select
int x=0;//is used to keep track the running property:value in the loop



/*---------------------function declaration-----------------------------*/

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//function that saves the pairs propiretà: value in their respective vectors or propertyArray [array_length] and valueArray [array_length]

void divide_string(String stringToSplit) {

  int strlen=stringToSplit.length();
  //Serial1.println(stringToSplit); //debug
  int i; //counter
  deviceAddr="";
  for(i=0; i<strlen ; i++)
  {
    if(stringToSplit.charAt(i)=='-')
      numberkey++;
  }
  //Serial1.println(numberkey);
  //-----------deviceAddr----------------

  for(i=0; stringToSplit.charAt(i)!=':' && i<strlen ;i++)
  {
    deviceAddr += String(stringToSplit.charAt(i));
  }

  for(j; j<numberkey ;j++)
  {
    //-----------property----------------

    for(i++; stringToSplit.charAt(i)!=':' && i<strlen ;i++)
    {
      propertyArray[j] += String(stringToSplit.charAt(i));
    }


    //-----------value----------------

    for(i++; stringToSplit.charAt(i)!='-' && i<strlen ;i++)
    {
      valueArray[j] += String(stringToSplit.charAt(i));
    }

  }
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

//callback for the management of the confirmation (access the field message->opzioni) and verification of ack
static void appDataConf(NWK_DataReq_t *req)
{
  //Serial1.print("ACK: "); //debug
  switch(req->status)
  {
    case NWK_SUCCESS_STATUS:
      //Serial1.print(1,DEC);
      break;
    case NWK_ERROR_STATUS:
      //Serial1.print(2,DEC);
      break;
    case NWK_OUT_OF_MEMORY_STATUS:
      //Serial1.print(3,DEC);
      break;
    case NWK_NO_ACK_STATUS:
      //Serial1.print(4,DEC);
      break;
    case NWK_NO_ROUTE_STATUS:
      //Serial1.print(5,DEC);
      break;
    case NWK_PHY_CHANNEL_ACCESS_FAILURE_STATUS:
      //Serial1.print(6,DEC);
      break;
    case NWK_PHY_NO_ACK_STATUS:
      //Serial1.print(7,DEC);
      break;
//    default:
//      Serial1.print("nessuna corrispondenza nell ack");
//      break;


  }
  nwkDataReqBusy = false;

  Serial1.println("");

}

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
      propertyArray[k]="";
      valueArray[k]="";
    }
    numberkey=0;
    j=0;
    flag=0;

  }
  if(numberkey!=0)
  {
    property=propertyArray[x];
    value=valueArray[x];
    x++;
    flag=1;
    //Serial1.println(property+":"+value);
  }
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

void apioLoop()
{
    SYS_TaskHandler();
    select();
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//to receive a packet with LWM
static bool apioReceive(NWK_DataInd_t *ind)
{
  int message_size=ind->size;
  int i;
  char Buffer[110];
  String receivedL="";
  for(i=0; i<message_size; i++)
  {
    Buffer[i] = ind->data[i];
    //delay(10);
    //Serial1.write(ind->data[i]);

  }

  divide_string(String(Buffer));

  for(int i=0; i<100; i++)
  {
    Buffer[i]=NULL;

  }
//  Serial1.print("Received message - ");
//  Serial1.print("lqi: ");
//  Serial1.print(ind->lqi, DEC);
//
//  Serial1.print("  ");
//
//  Serial1.print("rssi: ");
//  Serial1.print(ind->rssi, DEC);
//  Serial1.println("  ");
  //NWK_SetAckControl(NWK_IND_OPT_ACK_REQUESTED);

  return true;
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//is used by objects to communicate with the coordinator
void apioSend(String toSend)

{
  int len = toSend.length(); //if i use toSend.toCharArray() the packet does not arrive well
  for(int g=0; g<len ;g++)
  {
      sendThis[g]=toSend.charAt(g);
  }
  int16_t address = COORDINATOR_ADDRESS_LWM;

  nwkDataReqBusy = true;

  NWK_DataReq_t *message = (NWK_DataReq_t*)malloc(sizeof(NWK_DataReq_t));
  message->dstAddr = address; //object address
  message->dstEndpoint = 1;
  message->srcEndpoint = 1;
  message->options = NWK_OPT_ACK_REQUEST; //I require an ack
  message->size = len;
  message->data = (uint8_t*)(sendThis);

  message->confirm = appDataConf; //callback for the management of the confirmation (option field)
                                  //and verification of ack required above
  NWK_DataReq(message); //send message
}
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void apioSetup(uint16_t objectAddress)
{
  SYS_Init();
  NWK_SetAddr(objectAddress);
  NWK_SetPanId(0x01);
  PHY_SetChannel(0x1a);
  PHY_SetRxState(true);
  NWK_OpenEndpoint(1, apioReceive);

}

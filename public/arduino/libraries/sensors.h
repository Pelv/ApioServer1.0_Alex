#include <stdio.h>
#include <stdlib.h>
#include <Arduino.h>

int actual = -1;
typedef struct ApioListNode {
 String key, value;
 int flag;
 struct ApioListNode* next; 
} ApioListNode;

typedef ApioListNode* ApioList;


void insert(ApioList *lista, String key, String value) {
		ApioListNode *temp;
		temp =new ApioListNode;
		temp->key = key;
		temp->value = value;
                temp->flag=0;
		temp->next = *lista;
		*lista = temp;
}



void printList(ApioList lista) {
	ApioListNode *cursor;
	cursor = lista;
	while (cursor != NULL && cursor->next != 0) {
                Serial.println(cursor->key+":"+cursor->value);

		cursor = cursor->next;
	}

}
/*
deleteByKeyValue
hasKeyValue
*/

int exists(ApioList lista, String key, String value, int mode) {
    ApioList cursor;
    cursor = lista;
    while (cursor != 0 && cursor->next != 0) {
        if (cursor->key == key && cursor->value == value){
            return 1;
               }
        cursor = cursor->next;
    }
    return 0;
}


void deleteItem(ApioList *lista, String key, String value) {
	ApioListNode *cursor, *prev, *next;
	cursor = *lista;
	prev = NULL;

	while (cursor != NULL) {
		
		if (cursor->key == key && cursor->value == value){
			if (prev != NULL) {
				prev->next = cursor->next;
			} else {
				*lista = cursor->next;
			}
			free(cursor);
			return;
		} else {
			prev = cursor;
			cursor = cursor->next;
		}
		
	}
}

import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from "lightning/navigation";

import getMetadata from "@salesforce/apex/DataCompletionCardController.getMetadata";
import getRecords from "@salesforce/apex/DataCompletionCardController.getRecords";


export default class DataCompletionCard extends NavigationMixin(
    LightningElement
  ) {

    @api recordId;
    @api cardTitle;
    @api reqFieldMDTName;
    @api relationshipFieldAPIName;
    @api fromObject;
    @api recordData;
    @api fieldAPINames;
    completionFieldApiName;
    completionFieldValue;
    recordUIAttributes = [];
    defaultOpenSection;

    cmdtObjConfigId;
    cmdtObjStageFieldApiName;
    idField;
    wireResponse;
    nameAPIName;

    reqDataCheck = false;
    hasStdName = false;
    hasCaseNumber = false;

    // This occurs before the getRecord wire is called, allowing to use the Lightning Data Service dynamically
    connectedCallback() {
        this.idField = this.fromObject + '.Id';
    }
    
    // This wire is what enables the reactivity (i.e. if the record changes status, this listens to that update and pings the non-cached methods to get the newly appropriate data).
    // Note that this actually doesn't return any data by itself, it just knows to hit the async methods instead
    @wire(getRecord,{recordId: '$recordId',fields: '$idField'})
    wireRefresh(response) {
        this.wireResponse = response;

        // Imperatively hit the Apex controller when the wire triggers - i.e. when data is updated on this record, circle back and re-query everything. This could likely be optimised.
        this.invokeAsyncMethods();
    }

    async invokeAsyncMethods() {
        if (this.reqFieldMDTName) {
            try {
                // The await ensures that getMetadata occurs before the record data query fires, the order of operations is very important to ensure it doesn't fall over itself
                let metadata = await getMetadata({devName: this.reqFieldMDTName, recordId: this.recordId});
                
                // This could probably be refactored into a single object
                this.fromObject = metadata[0].cmdtObjConfig.ObjectAPIName__c;
                this.relationshipFieldAPIName = metadata[0].cmdtObjConfig.RelationshipFieldAPIName__c;
                this.completionFieldApiName = metadata[0].cmdtConfig.StageCompletionAPIName__c;
                this.fieldAPINames = metadata[0].displayFields;
                this.cmdtObjConfigId = metadata[0].cmdtObjConfig.Id;
                this.cmdtObjStageFieldApiName = metadata[0].cmdtObjConfig.StageFieldAPIName__c;
                
                // This supports the dodgy Service Cloud workaround - change/update these to AppointmentNumber etc. as needed, or hey, hopefully there's a better solution
                switch(this.fromObject) {
                    case 'Case':
                    this.hasCaseNumber = true;
                    this.hasStdName = false;
                    break;
        
                    default:
                    this.hasStdName = true;
                    this.hasCaseNumber = false;
                }
            } catch(e) {
                console.error(e);
            }
        }

        // Again, the await ensures the order of operations.
        if (this.fromObject) {
            try {
                this.recordUIAttributes = [];
                let recordData = await getRecords({fromObject: this.fromObject, relationshipFieldAPIName: this.relationshipFieldAPIName,
                    recordId: this.recordId, completionPctAPIName: this.completionFieldApiName});
                this.recordData = recordData;
                this.recordData.forEach(record => {
                    let uiAttributes = {};

                    // This probably should validate the data type, but it's worked for what I've thrown at it so far..
                    if (record[this.completionFieldApiName] >= 0 && record[this.completionFieldApiName] <= 100 ) {
                        uiAttributes.CompletionValue = record[this.completionFieldApiName];
                    } else {
                        uiAttributes.CompletionValue = -1;
                    }
                    this.recordUIAttributes.push(uiAttributes);
                });
                // I'm being super lazy here but this needs to be changed to the Service Cloud name as above - otherwise it won't automatically open the record
                this.defaultOpenSection = this.recordData[0].Name;
            } catch(e) {
                console.error(e);
            }
        }
    }

    // There is probably a better way of structuring this code given it's very similar to the block immediately above, but my attempts to improve modularity didn't work
    impGetRecords() {
        this.recordUIAttributes = [];
        getRecords({fromObject: this.fromObject,
            relationshipFieldAPIName: this.relationshipFieldAPIName,
            recordId: this.recordId,
            completionPctAPIName: this.completionFieldApiName})
        .then(result => {
            this.recordData = result;
            this.recordData.forEach(record => {
                let uiAttributes = {};
                if (record[this.completionFieldApiName] >= 0 && record[this.completionFieldApiName] <= 100 ) {
                    uiAttributes.CompletionValue = record[this.completionFieldApiName];
                } else {
                    uiAttributes.CompletionValue = -1;
                }
                this.recordUIAttributes.push(uiAttributes);
            });
            this.defaultOpenSection = this.recordData[0].Name;
        })
        .catch(error => {
            console.log(error);
        })
        .finally(() => {
        });
    }

    handleClick(event) {
        // Generate a URL to the record page, only works if the button (/event originator) has 'data-id={the value}' in it, due to how the iteration works
        // See https://salesforcediaries.com/2020/11/16/get-selected-record-id-from-custom-iteration-in-lightning-web-component/
        this[NavigationMixin.GenerateUrl]({
            type: "standard__recordPage",
            attributes: {
                recordId: event.target.dataset.id,
                actionName: "view"
            }
        }).then(url => {
            window.open(url);
        });
    }

    // When the form is submitted & e.g. the record's name has changed, this updates the values shown on the component.
    handleManualRefresh(event) {
        this.impGetRecords(); // When user makes an update to child record, pass event & manually trigger refresh of record data

        let toast = new ShowToastEvent({
            title: this.fromObject + ' was saved.',
            message: '',
            variant: 'success'
        });
        this.dispatchEvent(toast);
    }
    
}

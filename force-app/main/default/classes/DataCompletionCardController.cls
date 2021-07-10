public with sharing class DataCompletionCardController {
    
    /**
     * @description     return key data required for LWC to render its interface correctly. NO EXCEPTION HANDLING WHATSOEVER, I KNOW!
     * @param  devName  set by admin in Lightning App Builder, passed in via LWC
     * @param  recordId passed in via LWC
     * @return cd       list of a wrapper object - will only ever have 1 record returned in it
     */
    @AuraEnabled
    public static List<DataCompletionCardController.CompletionData> getMetadata(string devName, String recordId) {
        List<CompletionData> cd = new List<CompletionData>();

        // Start by finding the CMDT parent which has the same name as what the admin entered in Lightning App Builder
        RequiredFieldsObjectConfiguration__mdt cmdtObjConfig = getParentCMDTConfig(devName);

        // Use the defined StageFieldAPIName to query for the currently viewed record, specifically getting the value of the 'stage' fields
        sObject parentObjDetails = getParent(recordId, cmdtObjConfig.StageFieldAPIName__c);

        // Using the above query, find the value of the 'stage' field.
        // This section is a little lazy - it should directly find the value of the defined 'stage' field, but what it actually does is get the value of the
        // field which isn't the id in the query.
        Map<String, Object> fieldsToValue = parentObjDetails.getPopulatedFieldsAsMap();
        String stageFieldValue;
        for (String fieldName : fieldsToValue.keySet()){
            if (fieldsToValue.get(fieldName) != 'Id') {
                stageFieldValue = (String)fieldsToValue.get(fieldName);
            }
        }

        // Get the CMDT child which a) looks up to the already-defined parent and b) includes config specifically for this stage field value
        RequiredFieldsConfiguration__mdt cmdtFieldConfig = getCMDTConfig(cmdtObjConfig.Id, stageFieldValue);

        // Grab the name field of the object we've queried - Service Cloud objects e.g. Case don't have a 'Name' field
        String nameField = setNameField(cmdtObjConfig.ObjectAPIName__c);

        // Finally, take the comma delimited list defined in the child CMDT record above and store it as an actual list variable
        List<String> lstReqFields = cmdtFieldConfig.FieldAPINames__c.split(',');
        
        // Bundle up each of these to return one single object. This absolutely does not need to be a list, but.. it is - out of habit more than anything.
        cd.add(new CompletionData(cmdtObjConfig,parentObjDetails,cmdtFieldConfig,lstReqFields,stageFieldValue,nameField));

        return cd;
    }

    /**
     * @description 
     * @param  fromObject               The object queried in the dynamic SOQL. Ultimately comes from the above method but is passed in via LWC call
     * @param  relationshipFieldAPIName The API name of the lookup field relating parent to child. Ultimately comes from the above method but is passed in via LWC call
     * @param  recordId                 The record id of the parent record. Ultimately comes from the above method but is passed in via LWC call
     * @param  completionPctAPIName     Optional - the API name of a field which has a value of 0-100 that determines how complete the child record is at this stage
     * @return                          Return output of SOQL - Id, Name & optional completion % field values
     */
    @AuraEnabled
    public static List<SObject> getRecords(String fromObject, String relationshipFieldAPIName, String recordId, String completionPctAPIName) {
        String nameField = setNameField(fromObject);
        String soqlQuery = 'SELECT Id';
        soqlQuery += ', ' + nameField;
        soqlQuery += String.isBlank(completionPctAPIName) ? '' : ', ' + completionPctAPIName;
        soqlQuery += ' FROM ' + fromObject;
        soqlQuery += ' WHERE ' + relationshipFieldAPIName + ' = :recordId';

        String safeQuery = String.escapeSingleQuotes(soqlQuery);
        List<sObject> results = Database.query(safeQuery);

        return results;
    }

    @AuraEnabled(cacheable=true)
    public static RequiredFieldsObjectConfiguration__mdt getParentCMDTConfig(string devName) {       
        List<RequiredFieldsObjectConfiguration__mdt> lstParentCMDT = [
            SELECT ObjectAPIName__c, RelationshipFieldAPIName__c, StageFieldAPIName__c
            FROM RequiredFieldsObjectConfiguration__mdt
            WHERE DeveloperName = :devName
            LIMIT 1
        ];

        return lstParentCMDT[0];
    }

    @AuraEnabled(cacheable=true)
    public static SObject getParent(Id recordId, String stageFieldAPIName) {
        String sObjName = recordId.getSObjectType().getDescribe().getName();
        
        String soqlQuery = 'SELECT Id';
        soqlQuery += String.isBlank(stageFieldAPIName) ? '' : ', ' + stageFieldAPIName;
        soqlQuery += ' FROM ' + sObjName;
        soqlQuery += ' WHERE Id = :recordId LIMIT 1';   

        String safeQuery = String.escapeSingleQuotes(soqlQuery);
        List<sObject> results = Database.query(safeQuery);

        return results[0];
    }

    @AuraEnabled(cacheable=true)
    public static RequiredFieldsConfiguration__mdt getCMDTConfig(Id parentId, string stageFieldValue) {
        List<RequiredFieldsConfiguration__mdt> lstReqFields = [
            SELECT FieldAPINames__c, StageCompletionAPIName__c, StageValue__c
            FROM RequiredFieldsConfiguration__mdt
            WHERE RequiredFieldObjectConfiguration__c = :parentId
            AND StageValue__c = :stageFieldValue
            LIMIT 1
        ];

        return lstReqFields[0];
    }

    public static String setNameField(String objectName) {
        String nameField;

        switch on objectName {
            when 'Case' {
                nameField = 'CaseNumber';
            }
            when 'WorkOrder' {
                nameField = 'WorkOrderNumber';
            }
            when 'WorkOrderLineItem' {
                nameField = 'LineItemNumber';
            }
            when 'ServiceAppointment' {
                nameField = 'AppointmentNumber';
            }
            when 'KnowledgeArticle' {
                nameField = 'ArticleNumber';
            }
            when else {
                nameField = 'Name';
            }
        }
        return nameField;
    }

    public class CompletionData {
        @AuraEnabled
        public RequiredFieldsObjectConfiguration__mdt cmdtObjConfig { get; set;}
        
        @AuraEnabled
        public SObject parentRecord { get; set;}

        @AuraEnabled
        public RequiredFieldsConfiguration__mdt cmdtConfig { get; set;}

        @AuraEnabled
        public List<String> displayFields { get; set;}

        @AuraEnabled
        public String stageValue { get; set;}

        @AuraEnabled
        public String nameAPIName { get; set;}

        public CompletionData(RequiredFieldsObjectConfiguration__mdt cmdtObjConfig,
                                SObject parentRecord,
                                RequiredFieldsConfiguration__mdt cmdtConfig,
                                List<String> displayFields,
                                String stageValue,
                                String nameAPIName) {
            this.cmdtObjConfig = cmdtObjConfig;
            this.parentRecord = parentRecord;
            this.cmdtConfig = cmdtConfig;
            this.displayFields = displayFields;
            this.stageValue = stageValue;
            this.nameAPIName = nameAPIName;
        }
    }

}
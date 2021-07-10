# Data Completion Card
Gain visibility into the data that needs to be updated, at a certain stage, for your child records. Use this in conjunction with your standard Path component to ensure your users are keeping all levels of data updated across different stages of your business processes.

## Installation
1. Clone/download files in repo
2. Use your favourite metadata management tool to add the files to your local project's metadata and push to your org.
3. Go to Setup > Custom Metadata and create a Required Field Object Configuration record:

| Field  | Description  |
| ------------ | ------------ |
| Required Field Object Configuration Name  | This is the field that you will use in the Lightning App Builder to associate this configuration to the component itself.   |
| Stage Field API Name  | The field on the parent object which defines what fields are required (could be any kind of field with defined values, e.g. Lead Status, Opportunity Stage etc.).   |
| Object API Name | The object whose records are queried - e.g. Contact if viewing child Contact records on an Account.  | 
| Relationship Field API Name  | The lookup field connecting the child (whose records are being viewed) to the parent (the object whose page the component is on) - e.g. AccountId if viewing Contact records on an Account. |

4. In Custom Metadata, create at least one Required Field Configuration (but ideally one record for each value in your process. If e.g. your Stage field has stages 'New', 'In Progress', and 'Closed', then you should create 3x Required Field Configurations.

| Field  | Description  |
| ------------ | ------------ |
| Field API Names  | Each field that should be displayed to the user for editing. Use a comma delimited list e.g. Name,CustomField1__c,CustomField2__c.  |
| Required Field Object Configuration | The object-level configuration defining the component's basic structure.  | 
| Stage Value  | The value that the parent object's 'stage' field should have in order to display these fields for editing. e.g. set this to 'In Progress' to have the fields listed above appear for editing. |
| Stage Completion % API Name  | Optional - if there is a field that indicates how 'complete' the child record is, it can be included here to display a completion bar on the component. You could represent this via a formula field that checks if for fields that have been populated, and if so, adds a % to its value. |

5. In the Lightning App Builder, drag the 'Data Completion Card' component onto your page. Set the Required Field Configuration Name as the value you saved above for the Required Field Object Configuration Name. Add the title you'd like to give the card.

## Limitations/Defects
- Due to Service Cloud objects not having a 'Name' field, a dirty workaround has been used in dataCompletionCard.js and dataCompletionCard.html to support the Case object as an example. Change the Case.CaseNumber reference to something else (e.g. ServiceAppointment.AppointmentNumber) if this affects you. Sorry!
- There are definitely areas where the underlying code can be optimised, but it should be generally performant.
- There is no pagination or query limiting, so it's possible if you have a significant number of child records, the component will break/increase page load times significantly/stretch the page unexpectedly.
- If one of the fields you've edited is the record's name, when you save the record, it will not automatically expand.

## Examples
The finished product:

![image1](/images/image.PNG)


## Use cases

If one or more child records needs to have a certain level of data populated in order for a (parent) record to progress to the next stage/value etc., this can highlight precisely what fields are required at what time.
e.g.
- Ensure all Opportunity Line Items have the correct discount applied before sending the Opportunity for pricing approval
- Ensure all Case Contacts have a Role before the Case is set to Working, and all verifications completed before the Case is set to Closed

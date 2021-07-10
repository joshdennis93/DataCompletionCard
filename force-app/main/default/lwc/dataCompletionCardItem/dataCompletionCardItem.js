import { LightningElement, api } from 'lwc';
export default class DataCompletionCardItem extends LightningElement {
    @api record;
    @api object;
    @api fields;

    @api uiAttributes;
    @api index;

    showProgress = false;
    progressValue;

    connectedCallback() {
        const uiAttributes = this.uiAttributes[this.index];

        // Only show the completion bar IF the component has received a number 0-100. If an error was received when preparing the data, CompletionValue will be -1
        if (uiAttributes.CompletionValue >= 0 && uiAttributes.CompletionValue <= 100) { // this could be dangerous because i'm not evaluating if it is a string or not, but js is lenient
            this.showProgress = true;
            this.progressValue = uiAttributes.CompletionValue;
        }
    }

    // When the record has been successfully updated, fire a custom event up to the parent including the record's id.
    // Adding it to the detail object seemed to be a lot less error-prone than simply putting id: this.record.Id
    handleSuccess(event) {     
        const refreshEvent = new CustomEvent('refresh', {
            detail: {
                id: this.record.Id
            }
        });
        this.dispatchEvent(refreshEvent);
    }

}
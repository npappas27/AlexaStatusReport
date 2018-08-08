'use strict';
const Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});
AWS.config.update({region: 'us-east-1'});


const APP_ID = 'amzn1.ask.skill.1c1ad1ee-de7c-45ea-8bc0-696f011003c3';
const HELP_MESSAGE = 'You can say things like \"Read Progressive Status Report\", \"Read status report for Q1\"';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';
const ERROR_MESSAGE = ['I\'m sorry, it looks like I couldn\'t handle that request just yet.', 
                        'Uh Oh. It seems there was a problem handling your request.',
                        'It seems the monkeys have made a mistake. No bananas for a week.'];

var months =["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var getMonth = function(value) {
    return months[value];
};
var continuedText;

    function GetData(quarter, year, department, callback) {
    var params = {
        TableName: "LogEntries",
        IndexName: "quarter-index",
        KeyConditionExpression:  "#quarter = :qi",
        FilterExpression: "#year = :yi and department =:di",
        ExpressionAttributeNames: {
            "#quarter" : "quarter",
            "#year" : "year"
        },
        ExpressionAttributeValues:  {
        ":qi"   : quarter,
        ":yi" : year,
        ":di"   : department
        },
        ProjectionExpression: 'info'
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log(err);
            return 'error';
        } 
        else {
            //console.log(data.Items[0].info);
            callback(data.Items[0].info);
            
        }
    });
}





// https://stackoverflow.com/questions/48638353/how-to-handle-synonyms-in-intents-in-alexa 
function slotValue(slot, useId){
    let value = slot.value;
    let resolution = (slot.resolutions && slot.resolutions.resolutionsPerAuthority && slot.resolutions.resolutionsPerAuthority.length > 0) ? slot.resolutions.resolutionsPerAuthority[0] : null;
    if(resolution && resolution.status.code == 'ER_SUCCESS_MATCH'){
        let resolutionValue = resolution.values[0].value;
        value = resolutionValue.id && useId ? resolutionValue.id : resolutionValue.name;
        value = value.toLowerCase();
    }
    return value;
}



function ParseInfo(infoText, callback) {
    var textLength = 25;
    if(infoText.length >= textLength) {
        var regex = /[a-z0-9]{1}\. [A-Z0-9]/;
        var findPos = regex.exec(infoText.substring(25, infoText.length));
        if(findPos != null) {           
            var endPos = findPos.index + 25;
            continuedText = infoText.substring(endPos+2, infoText.length);
            callback(infoText.substring(0, endPos+2), true);
        }
    } else {
        callback(infoText, false); 
    }
}
    
const handlers = {
    

    'LaunchRequest': function () {
        var examples = ['read Progressive status report.',
                        'read Q1 status report.',
                        'read Progressive status report for Q1.']
        var index = Math.floor(Math.random() * examples.length);
        var myExample = examples[index];
        this.emit(':ask', 'I need more info first. Say things like: ' + myExample);
    },

    'Update': function () {

        var year = this.event.request.intent.slots.Year.value;
        var department = this.event.request.intent.slots.Department.value;
        var quarterName = slotValue(this.event.request.intent.slots.Quarter);
        
        var confirm = this.event.request.intent.slots.Yes.value;
        if(!confirm){
            console.log(year + ' ' + quarterName + ' ' + ' ' + department);
            if((year === undefined || year === "?") || quarterName === undefined || department === undefined){
                this.emit(':delegate');
            }
            else{
            
                var self = this;
                GetData(quarterName, parseInt(year), department, function(info){
                    ParseInfo(info, function(info, isMore){
                        if(isMore) {
                            self.emit(':ask', 'The status report for ' + department + ' in ' + quarterName + ' ' + year + ' is: ' + info + ', would you like to hear more?');
    
                        } else {
                            self.emit(':tell', 'The status report for ' + department + ' in ' + quarterName + ' ' + year + ' is: ' + info);
                        }
                    });
                });
            }
        } else {
            this.emit(':tell', continuedText);
            continuedText = '';  
        }
        
    },
    'Continue' : function(){
        var confirm = this.event.request.intent.slots.Yes.value;
        if (confirm) {
            this.emit(':tell', continuedText);
            continuedText = '';
        }else {
           this.emit(':tell', 'Ok.'); 
        }
    },
    'Help' : function(){
        this.emit(':tell', 'Say things like \"read progressive status report\" or \"read progressive status report for q1\"');
    },
    
    
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.FallbackIntent': function () {
        var index = Math.floor(Math.random() * ERROR_MESSAGE.length);
        this.response.speak(ERROR_MESSAGE[index]);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};



exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.application.applicationId !== "amzn1.ask.skill.[APPLICATION_ID]") {
             context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
            });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent;
    var intentName = intentRequest.intent.name;

    if (intentName === "AddFraction") {
        addFractions(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

function getWelcomeResponse(callback) {
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Apprentice Skill. I am here to be your apprentice by answering questions for you like what the sum of fractions are.";
    var repromptText = "Try me by asking a question like what is the sum of a over b, plus c over d.";
    var shouldEndSession = false;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "";
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function addFractions(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var shouldEndSession = true;
    var speechOutput = "";

    var firstNumberNumerator = parseInt(intent.slots.FirstNumberNumerator.value);
    var firstNumberDenominator = parseInt(intent.slots.FirstNumberDenominator.value);
    var secondNumberNumerator = parseInt(intent.slots.SecondNumberNumerator.value);
    var secondNumberDenominator = parseInt(intent.slots.SecondNumberDenominator.value);

    if (firstNumberDenominator <= 0 || secondNumberDenominator <= 0)
    {
        speechOutput = "I'm sorry, I can't divide by zero";

        console.log(speechOutput);

        callback({}, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }

    var multiplier = firstNumberDenominator * secondNumberDenominator

    var newFirstNumberNumerator;
    var newSecondNumberNumerator;

    if (firstNumberDenominator < secondNumberDenominator) {
        newFirstNumberNumerator = firstNumberNumerator * secondNumberDenominator;
        newSecondNumberNumerator = secondNumberNumerator * firstNumberDenominator;     
    } else {
        newFirstNumberNumerator = secondNumberNumerator * firstNumberDenominator;
        newSecondNumberNumerator = firstNumberNumerator * secondNumberDenominator;  
    }

    var reduced = reduce(newFirstNumberNumerator + newSecondNumberNumerator, multiplier);

    var repeatOfInputText = "The sum of " + firstNumberNumerator + " over " + firstNumberDenominator + " plus " + secondNumberNumerator + " over " + secondNumberDenominator + " is ";

    if (reduced[0] % reduced[1] === 0) {
        // example input: 4 / 2 = 2
        var wholeNumber = reduced[0] / reduced[1];
        speechOutput = repeatOfInputText + wholeNumber;
    }
    else if (reduced[0] > reduced[1]) {
        // example input: 5 / 2 = 2 1/2
        var decimal = reduced[0] / reduced[1]; // 5 / 2 = 2.5
        var wholeNumber = Math.floor(decimal); // 2
        var amountToSubtractFromNumerator =  wholeNumber * reduced[1]; // 2 * 2 = 4
        var newNumerator = reduced[0] - amountToSubtractFromNumerator; // 5 - 4 = 1
        speechOutput = repeatOfInputText + wholeNumber + " and " + newNumerator + " over " + reduced[1];
    } else {
        // example input: 1 / 2 = 1 / 2
        speechOutput = repeatOfInputText + reduced[0] + " over " + reduced[1];
    }
    
    console.log(speechOutput);

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

//Borrowed from http://stackoverflow.com/a/4652513/1595510
function reduce(numerator, denominator) {
    var gcd = function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
    };

    gcd = gcd(numerator, denominator);

    return [numerator / gcd, denominator / gcd];
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    var readableIntentName = "Welcome";

    if (title === "AddFraction") {
        readableIntentName = "Add Fraction";
    }

    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: readableIntentName,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
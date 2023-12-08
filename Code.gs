const sheet = SpreadsheetApp.openById('GOOGLE_SHEETS_ID').getSheetByName('Form Responses 1');
const bard_ai_api_url = 'https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=GOOGLE_CLOUD_PALM_API_KEY';
const folder = DriveApp.getFolderById('GOOGLE_DRIVE_FOLDER_ID');
const text2speechapiurl = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=GOOGLE_CLOUD_TEXT_2_SPEECH_API_KEY';

function onFormSubmit(e) {
    var demo = 'Here is some Q/A, convert them into a paragraph like a human describing casually. Also please recheck all the answers if the new paragraph matches all the answers as given:- ';
    var formResponse = e.response;
    var formQuestions = formResponse.getItemResponses();
    var m1, m2, m3;
    const t1 = sheet.getRange(1, 2).getDisplayValue(),
        t2 = sheet.getRange(1, 3).getDisplayValue(),
        t3 = sheet.getRange(1, 4).getDisplayValue();

    for (var i = 0; i < formQuestions.length; i++) {
        var q = formQuestions[i].getItem().getTitle(),
            a = formQuestions[i].getResponse();

        if (q.includes(t1)) m1 = a;
        else if (q.includes(t2)) m2 = a;
        else if (q.includes(t3)) m3 = a;

        demo += "Question: " + q + ", Answer: " + a + ' ;';
    }

    const header = { 'Content-Type': 'application/json' }
    const p = {
        'prompt': {
            'text': demo
        }
    };
    const op = {
        "method": 'POST',
        "headers": header,
        "payload": JSON.stringify(p)
    };
    var response = UrlFetchApp.fetch(bard_ai_api_url, op);
    var data = JSON.parse(response.getContentText()).candidates[0].output; // fetching Bard Ai with api key
    var output_data = JSON.stringify(data);

    let all_data = sheet.getDataRange().getValues();
    for (var i = 1; i <= sheet.getLastRow() - 1; i++) {
        if (all_data[i].includes(m1, m2, m3)) {
            sheet.getRange(i + 1, 18).setValue(String(output_data)); // record the bard ai paragraph to end of that data's row (for mine it was 19th column)
            let filename = sheet.getRange(i + 1, 2).getDisplayValue().replace(/[\/:]/g, (match) => {
                return match === '/' ? '_' : '-';
            });
            textToSpeech(output_data, filename); // call text2speech funtion
            break
        }
    }
}

function textToSpeech(text, filename) {
    const data = {
        "input": {
            'text': text,
        },
        "voice": {
            'languageCode': 'en-US',
            'name': 'en-US-Neural2-F',
        },
        "audioConfig": {
            "audioEncoding": "MP3"
        }
    }

    const params = {
        'method': 'post',
        'headers': {
            "Content-Type": "application/json",
        },
        'payload': JSON.stringify(data),
    };

    const res = UrlFetchApp.fetch(text2speechapiurl, params); // fetch Text to speech api

    var blob = Utilities.base64Decode(JSON.parse(res.getContentText()).audioContent);
    folder.createFile(Utilities.newBlob(blob, 'audio/mp3', `${filename}.mp3`)); // saves file to google drive folder
}

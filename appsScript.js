// App Script read each sheet and combine them into one file
// map [English, Portugese, French, Spanish, Indonesian]
// to [ en, pt, fr, es, id ]
// https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html
const languageCodes = {
    English: 'en',
    Portugese: 'pt',
    French: 'fr',
    Spanish: 'es',
    Indonesian: 'id',
    Vietnamese: 'vi',
    Italian: 'it',
    Russian: 'ru'
} 

// get first row of first sheet
const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
const allSheets = SpreadSheet.getSheets();
const sheet1 = allSheets[0];
const languageNamesRow = sheet1.getDataRange().getValues()[0];
const languageCodesRow = languageNamesRow.map(languageName => {
    return languageCodes[languageName];
});

function combineSheets(sheets) {
    const data = [];
    sheets.forEach(sheet => {
        const sheetData = sheet.getDataRange().getValues();
        // delete the first row
        sheetData.shift();
        // for each cell in the sheet enclose it in quotes
        sheetData.forEach(row => {
            if (row.length < languageCodesRow.length) {
                const emptyCells = languageCodesRow.length - row.length;
                for (let i = 0; i < emptyCells; i++) {
                    row.push(row[0]);
                }
            }
            row.forEach((cell, index) => {
                // row[index] = `"${cell}"`; if cell contains a comma
                if (cell.includes(',')) {
                    row[index] = `"${cell}"`;
                }
                // remove white space or tab from cell and check if it and set to first cell of the row
                if (cell.trim() === '') {
                    row[index] = row[0];
                }
            }
        )});
        data.push(sheetData);
    });
    // flatten data
    const flatData = data.reduce((acc, curr) => {
        return acc.concat(curr);
    }
    , []);
    return flatData;
}

function prepareTerminologyCSV() {
    const data = combineSheets(allSheets);
    // make languageCodesRow the first row
    data.unshift(languageCodesRow);
    // convert [[],[]] data to csv
    const csv = data.join('\n');
    return csv;
  }


// make POST request to https://api.github/com/repos/deriv-pocs/custom-terminology/dispatches
// with the following -H "Authorization: token your-token-here"
// -H "Accept: application/vnd.github+json" \ 
// and the following -d '{"event_type": "translation_updated"}'
function notifyGithub() {
    const terminlogy = prepareTerminologyCSV();
    const url = 'https://api.github.com/repos/binary-com/deriv-custom-terminology/dispatches';
    // get github token from GITHUB_TOKEN script property
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
    };
    const body = {
        event_type: 'terminology_updated',
        client_payload: {
            terminology: terminlogy
        }
    };
    const options = {
        method: 'POST',
        headers: headers,
        payload: JSON.stringify(body)
    };
    UrlFetchApp.fetch(url, options);
}

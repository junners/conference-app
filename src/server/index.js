const jsforce = require('jsforce');
require('dotenv').config();
const { SF_USERNAME, SF_PASSWORD, SF_TOKEN, SF_LOGIN_URL } = process.env;
if (!(SF_USERNAME && SF_PASSWORD && SF_TOKEN && SF_LOGIN_URL)) {
    console.error(
        'Cannot start app: missing mandatory configuration. Check your .env file.'
    );
    process.exit(-1);
}
const conn = new jsforce.Connection({
    loginUrl: SF_LOGIN_URL,
    version: '45.0'
});

conn.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN, err => {
    if (err) {
        console.error(err);
        process.exit(-1);
    }
});

// eslint-disable-next-line no-undef
module.exports = app => {
    // put your express app logic here
    app.get('/api/sessions', (req, res) => {
        // logged in user property
        const soql = `SELECT Id, Name, toLabel(Room__c), Description__c, format(Date_and_Time__c) formattedDateTime, (SELECT Speaker__r.Id, Speaker__r.Name, Speaker__r.Description, Speaker__r.Email, Speaker__r.Picture_URL__c FROM Session_Speakers__r) FROM Session__c ORDER BY Date_and_Time__c LIMIT 100`;
        let records = [];
        conn.query(soql)
        .on("record", function(record) {
            records.push(record);
        })
        .on("end", function() {
            if (records.length === 0) {
                res.status(404).send('Session not found');
            }
            const formattedData = records.map(sessionRecord => {
                let speakers = [];
                if(sessionRecord.Session_Speakers__r){
                    speakers = sessionRecord.Session_Speakers__r.records.map(
                        record => {
                            return {
                                id: record.Speaker__r.Id,
                                name: record.Speaker__r.Name,
                                email: record.Speaker__r.Email,
                                bio: record.Speaker__r.Description,
                                pictureUrl: record.Speaker__r.Picture_URL__c
                            };
                        }
                    );
                }
                return {
                    id: sessionRecord.Id,
                    name: sessionRecord.Name,
                    dateTime: sessionRecord.formattedDateTime,
                    room: sessionRecord.Room__c,
                    description: sessionRecord.Description__c,
                    speakers
                };
            });
            res.send({ data: formattedData });
            
        })
        .on("error", function(err) {
            console.error(err);
            res.sendStatus(500);
        })
        .run({ autoFetch : true, maxFetch : 4000 });
    });
};

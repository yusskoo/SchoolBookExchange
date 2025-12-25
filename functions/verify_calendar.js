const https = require('https');

const calendarUrl = 'https://calendar.google.com/calendar/ical/shsh.ylc.edu.tw_fcpdcjkto9mpulh1gg2eetr4s4%40group.calendar.google.com/public/basic.ics';

https.get(calendarUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Fetched ${data.length} bytes.`);
        const events = parseICS(data);
        console.log(`Parsed ${events.length} events.`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check first 10 events
        console.log("--- Sample Events ---");
        events.slice(0, 10).forEach(e => console.log(e.summary, e.dtstart));

        const keywords = ['段考', '學測', '會考', '模擬考', '評量', '校務考試'];
        const hits = events.filter(e => {
            if (!e.summary) return false;
            return keywords.some(k => e.summary.includes(k));
        });

        console.log(`--- Keyword Matches (${hits.length}) ---`);
        hits.forEach(e => console.log(`Match: ${e.summary} on ${e.dtstart}`));

        const futureHits = hits.filter(e => parseICSDate(e.dtstart) >= today);
        console.log(`--- Future Matches (${futureHits.length}) ---`);
        futureHits.forEach(e => console.log(`Future: ${e.summary} on ${e.dtstart}`));
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});

function parseICS(icsData) {
    const events = [];
    const lines = icsData.split(/\r\n|\n|\r/);
    let currentEvent = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) events.push(currentEvent);
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith('SUMMARY:')) {
                currentEvent.summary = line.substring(8);
            } else if (line.startsWith('DTSTART')) {
                const parts = line.split(':');
                currentEvent.dtstart = parts[1];
            }
        }
    }
    return events;
}

function parseICSDate(icsDateString) {
    if (!icsDateString) return new Date();
    // 20230501 or 20230501T100000Z
    const year = parseInt(icsDateString.substring(0, 4));
    const month = parseInt(icsDateString.substring(4, 6)) - 1;
    const day = parseInt(icsDateString.substring(6, 8));
    return new Date(year, month, day);
}

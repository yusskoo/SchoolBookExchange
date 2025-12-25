const https = require('https');

// Helper to send request to LINE
function sendLineRequest(path, method, body) {
    return new Promise((resolve, reject) => {
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!token) {
            console.error("LINE_CHANNEL_ACCESS_TOKEN is missing");
            return reject(new Error("LINE Token Missing"));
        }

        const options = {
            hostname: 'api.line.me',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // Some endpoints return empty body
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve({});
                    }
                } else {
                    console.error(`LINE API Error (${res.statusCode}):`, data);
                    reject(new Error(`LINE API Error: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error("Request Error:", e);
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

exports.pushMessage = async (userId, text) => {
    // Determine if it's a simple text or custom object
    const messages = typeof text === 'string' ? [{ type: 'text', text: text }] : text;

    // LINE Push API can verify up to 5 messages, but here we usually send 1
    // If messages is not array, wrap it
    const msgArray = Array.isArray(messages) ? messages : [messages];

    return sendLineRequest('/v2/bot/message/push', 'POST', {
        to: userId,
        messages: msgArray
    });
};

exports.replyMessage = async (replyToken, text) => {
    const messages = typeof text === 'string' ? [{ type: 'text', text: text }] : text;
    return sendLineRequest('/v2/bot/message/reply', 'POST', {
        replyToken: replyToken,
        messages: Array.isArray(messages) ? messages : [messages]
    });
};

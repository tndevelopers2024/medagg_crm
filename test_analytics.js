const http = require('http');

const data = JSON.stringify({
  filters: [],
  chartType: "status"
});

const options = {
  hostname: 'localhost',
  port: 5013,
  path: '/api/v1/analytics/leads',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${body}`));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

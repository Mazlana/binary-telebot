const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { table } = require('table');

// Ganti dengan UserAgent Anda
const UserAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Fungsi untuk menyimpan token ke file
function savetoken(token) {
    fs.writeFileSync(`cookie.txt`, token);
}

// Fungsi untuk membaca token dari file
function readtoken(token) {
    try {
        const cookie = fs.readFileSync(`${token}.txt`, 'utf8').trim();
        return cookie;
    } catch (error) {
        console.error('Error reading cookie:', error);
        return null;
    }
}

// Fungsi untuk permintaan GET
async function GET(url, token) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': UserAgent,
                'authorization': `JWT ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        return null;
    }
}

// Fungsi untuk permintaan POST
async function POST(url, data) {
    try {
        const response = await axios.post(url, data, {
            headers: {
                'User-Agent': UserAgent,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error posting to URL ${url}:`, error);
        return null;
    }
}

// Fungsi untuk membaca semua file JSON di dalam folder storage
function readAllJSONFiles(directory) {
    const files = fs.readdirSync(directory);
    const jsonData = [];

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(directory, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            jsonData.push(JSON.parse(fileContent));
        }
    });

    return jsonData;
}

// Fungsi untuk mengekstrak informasi yang diinginkan dan menghapus duplikasi IP
function extractInfo(jsonData) {
    const extractedData = [];
    const seenIPs = new Set();

    jsonData.forEach(data => {
        if (data.events && Array.isArray(data.events)) {
            data.events.forEach(event => {
                if (!seenIPs.has(event.ip)) {
                    seenIPs.add(event.ip);
                    extractedData.push({
                        ip: event.ip,
                        country: event.geoip.country_name,
                        as_name: event.as_name
                    });
                }
            });
        }
    });

    return extractedData;
}

// Fungsi untuk mencetak data dalam bentuk tabel
function printTable(data) {
    const headers = ['IP', 'Country', 'AS Name'];
    const rows = data.map(entry => [entry.ip, entry.country, entry.as_name]);
    const output = table([headers, ...rows]);
    console.log(output);
}

// Fungsi untuk menghapus semua file JSON di dalam folder storage
function deleteAllJSONFiles(directory) {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(directory, file);
            fs.unlinkSync(filePath);
        }
    });
}

(async () => {
    // URL login
    const postUrl = 'https://api.app.binaryedge.io/v2/user/login/';
    const postData = { "email": "botcwt@gmail.com", "password": "Dayanaji@12" };
    const postResponse = await POST(postUrl, postData);

    if (postResponse) {
        console.log('Data successfully posted to the server:', postResponse.token);
        savetoken(postResponse.token);
    } else {
        console.log('Failed to post data to the server');
        return;
    }

    const token = readtoken('cookie');
    if (!token) {
        console.log('Failed to read token.');
        return;
    }

    const maxPages = 10;
    const baseUrl = "https://api.app.binaryedge.io/v2/query/web/search?query=product:cloudflare%20&&%20port:443%20&&%20headers:%22CF-RAY%22%20&&%20headers:%22Content-Length:%20155%22%20&&%20response:%22HTTP/1.1%20400%20Bad%20Request%22&page=";

    // Path to the storage directory
    const storageDir = path.join(__dirname, 'storage');

    // Ensure the storage directory exists
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir);
    }

    for (let page = 1; page <= maxPages; page++) {
        const getUrl = `${baseUrl}${page}`;
        const getResponse = await GET(getUrl, token);

        if (getResponse) {
            const filePath = path.join(storageDir, `page${page}.json`);
            fs.writeFileSync(filePath, JSON.stringify(getResponse, null, 2));
            console.log(`Data for page ${page} saved to ${filePath}`);
        } else {
            console.log(`Failed to get data for page ${page}`);
            break;
        }
    }

    console.log('Data fetching completed.');

    // Read all JSON files in storage directory
    const allData = readAllJSONFiles(storageDir);
    console.log('Read all JSON data.');

    // Extract the desired information
    const extractedData = extractInfo(allData);
    console.log('Extracted Data:', extractedData);

    // Print the data in table format
    printTable(extractedData);

    // Delete all JSON files in storage directory
    deleteAllJSONFiles(storageDir);
    console.log('All JSON files deleted from storage directory.');
})();

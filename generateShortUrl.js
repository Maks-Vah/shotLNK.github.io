const {connection} = require('./Database');
const shortid = require('shortid');
const generateShortUrl = async (originalUrl, expiresInDays = null) => {
let shortUrl = shortid.generate();
while (await new Promise((resolve, reject) => {
connection.query('SELECT 1 FROM urls WHERE shortUrl = ?', [shortUrl], (err, result) => {
if (err) {
reject(err);
} else {
resolve(result.length > 0); // Проверяем, существует ли запись с таким коротким URL
}
});
})) {
shortUrl = shortid.generate();
}
return shortUrl;
};

module.exports = generateShortUrl;
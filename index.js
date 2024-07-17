const express = require('express');

const api = require('./api'); 
const app = express();
const port = 3000;
app.use('/',api)
app.listen(port, () => {
console.log(`Сервер запущен на порту ${port}`);
});

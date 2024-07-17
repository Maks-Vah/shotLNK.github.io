const  Sequelize  = require('sequelize');
const mysql = require('mysql2'); // Используем пакет mysql
// Подключение к MySQL
const connection = mysql.createConnection({
host: 'mysql-2798f8e6-maksim291101-0c15.g.aivencloud.com', // Замените на хост вашей БД
user: 'avnadmin', // Замените на имя пользователя вашей БД
password: 'AVNS_xSXR4_y9ef7QhFTf5fb', // Замените на пароль вашей БД
database: 'shortener', // Замените на имя базы данных
port: '17604',
insecureAuth: true,
});

connection.connect((err) => {
if (err) {
console.error('Ошибка подключения к MySQL:', err);
return;
}
console.log('Подключено к MySQL!');
});


const sequelize = new Sequelize('shortener', 'avnadmin', 'AVNS_xSXR4_y9ef7QhFTf5fb', {
  host: 'mysql-2798f8e6-maksim291101-0c15.g.aivencloud.com',
  port: '17604',
  dialect: 'mysql',
  dialectOptions: {
    insecureAuth: true,
  },
});


// Определение моделей
const User = sequelize.define('users', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: Sequelize.STRING, unique: true },
  password: Sequelize.STRING,
  username: { type: Sequelize.STRING, unique: true },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
});

const Url = sequelize.define('urls', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  originalUrl: Sequelize.TEXT,
  shortUrl: { type: Sequelize.STRING, unique: true },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  clicks: { type: Sequelize.INTEGER, defaultValue: 0 },
  customShortUrl: { type: Sequelize.STRING, unique: true },
  userId: { type: Sequelize.INTEGER, references: { model: User, key: 'id' } },
  expiresInDays: { type: Sequelize.INTEGER, defaultValue: null },
expiresAt: { // Удалите expiresAt
    type: Sequelize.VIRTUAL,
    get() {
      if (this.expiresInDays && this.updatedAt) {
        const expiresAt = new Date(this.updatedAt);
        expiresAt.setDate(expiresAt.getDate() + this.expiresInDays);
        return expiresAt;
      }
      return null;
    },
  },
});

const Click = sequelize.define('clicks', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  urlId: { type: Sequelize.INTEGER, references: { model: Url, key: 'id' } },
  userId: { type: Sequelize.INTEGER, references: { model: User, key: 'id' } },
  ipAddress: Sequelize.STRING,
  userAgent: Sequelize.TEXT,
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }},{
  timestamps: false})


Url.hasMany(Click, { foreignKey: 'urlId', as: 'clicksToUrls' });

Click.belongsTo(Url, { foreignKey: 'urlId' });

module.exports = {connection, Click, Url, User};
const { Click, Url, User, sequelize } = require('./Database');
const  Sequelize  = require('sequelize');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Используйте bcrypt для хэширования паролей
const generateShortUrl = require('./generateShortUrl');
const bodyParser = require('body-parser'); 
const express = require('express')
const app = express();
const secretKey = 'key216135'; // Замените на ваш секретный ключ
var host
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false
}));
app.use(express.static('public'));

//////Блок доп. функции Users
app.post('/register', async (req, res) => {
  try {
      const { email, password, username } = req.body;
      // Проверка валидности данных (email, пароль, username)
      if (!email || !password || !username) {
          return res.status(400).send('Please provide email, password and username.');
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
          return res.status(400).send('Invalid email format.');
      }
      if (password.length < 8) {
          return res.status(400).send('Password must be at least 8 characters long.');
      }
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
          return res.status(400).send('Username can only contain letters and numbers.');
      }
      // Проверка,  существует ли  пользователь  с  таким  email  или  username
      const existingUser = await User.findOne({
          where: {
              [Sequelize.Op.or]: [{ email }, { username }]
          }
      });
      if (existingUser) {
          return res.status(400).send('Email or username already exists.');
      }
      const hashedPassword = await bcrypt.hash(password, 10); // Хэширование пароля
      const user = await User.create({ email, password: hashedPassword, username }); 
      res.json({ success: true, message: 'Registration successful!' });
  } catch (error) {
      console.error(error);
      res.status(500).send('Error registering');
  }
});
// API endpoint для входа
app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      // Проверка валидности данных (email, пароль)
      if (!email || !password) {
          return res.status(400).send('Please provide email and password.');
      }
      const user = await User.findOne({ where: { email } });
      if (!user) {
          return res.status(401).send('Invalid email or password.');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password); // Проверка пароля
      if (isPasswordValid) {
          const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '5h' }); // Создаем JWT-токен
            res.json({ success: true, message: 'Login successful!', token }); // Отправляем токен клиенту
      } else {
          return res.status(401).send('Invalid email or password.');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Error logging in');
  }
});
// API endpoint для выхода
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error('Error logging out:', err);
          res.status(500).send('Error logging out');
      } else {
          res.json({ success: true, message: 'Logout successful!' });
      }
  });
});

app.get('/is-authenticated', (req, res) => {
  if (req.session?.userId) {
      res.json({ authenticated: true, userId: req.session.userId }); 
  } else {
      res.json({ authenticated: false });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']; // Получаем заголовок Authorization
  const token = authHeader && authHeader.split(' ')[1]; // Получаем токен
  if (token == null) return res.status(401).json({ error: 'Authentication required', message: 'Please provide a valid JWT token' }); // Если токен не найден
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send('Invalid token'); // Если токен невалидный
    req.user = user; // Добавляем информацию о пользователе в объект запроса
    next(); // Переходим к следующему обработчику
  });
}


app.get('/user-info', authenticateToken, async (req, res) => {
  try {
       console.log('userId из токена:', req.user.userId);
    const user = await User.findOne({ where: { id: req.user.userId } }); // Получаем информацию о пользователе из объекта запроса
    if (user) {
        console.log('Имя пользователя:', user.username);
      res.json({ username: user.username });
    } else {
      res.status(401).send('Unauthorized');
      }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user data');
  }
});

app.get('/user-links', authenticateToken, async (req, res) => {
  try {

    const userLinks = await Url.findAll({
      where: { userId: req.user.userId }, // Получение ссылок текущего пользователя
      include: [{ model: Click, as: 'clicksToUrls' }],
      // Включаем информацию о кликах
     
    });
    
    res.json(userLinks); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user links');
  }
});
///////конец блока доп. функции Users

// Для генерации коротких идентификаторов
app.post('/shorten', authenticateToken,  async (req, res) => {
try {
  console.log('Получен POST-запрос на /shorten');
  console.log('req.body:', req.body);
  

  const originalUrl = req.body.url;
  console.log('originalUrl:', originalUrl);
  const expiresInDays = req.body.expiresInDays; // Получаем количество дней до "смерти" ссылки
  const isPermanent = req.body.isPermanent; // Получаем флаг "перманентности"
  let shortUrl;
  if (isPermanent) {
    // Ссылка должна быть "перманентной"
    shortUrl = await generateShortUrl(originalUrl); // Сгенерируйте короткий URL
  }else {
    // Ссылка имеет ограниченный срок действия
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays); // Расчет даты "смерти"
    shortUrl = await generateShortUrl(originalUrl, expiresInDays); // Сгенерируйте короткий URL
  }

  const newUrl = await Url.create({
    originalUrl: originalUrl,
    shortUrl: shortUrl,
    userId: req.user.userId, // Используем userId из токена для зарегистрированных пользователей
    expiresInDays: isPermanent ? null : expiresInDays,
  });
  newUrl.clicks = 0; // Установите начальное значение кликов в 0
  await newUrl.save(); // Сохраните обновленные данные
    res.json({ shortUrl, host });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating short URL');
    }
  });



app.post('/shortena',  async (req, res) => {
try {
  console.log('Получен POST-запрос на /shorten');
  console.log('req.body:', req.body);

 
  const originalUrl = req.body.url;
  console.log('originalUrl:', originalUrl);
  const expiresInDays = req.body.expiresInDays; // Получаем количество дней до "смерти" ссылки
   console.log('expiresInDays:', expiresInDays);
  const isPermanent = req.body.isPermanent; // Получаем флаг "перманентности"
  let shortUrl;
  if (isPermanent) {
    // Ссылка должна быть "перманентной"
    shortUrl = await generateShortUrl(originalUrl); // Сгенерируйте короткий URL
  }else {
    // Ссылка имеет ограниченный срок действия
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays); // Расчет даты "смерти"
    shortUrl = await generateShortUrl(originalUrl, expiresInDays); // Сгенерируйте короткий URL
  }

  const newUrl = await Url.create({
    originalUrl: originalUrl,
    shortUrl: shortUrl,
    userId: null, // Используем userId из токена для зарегистрированных пользователей
    expiresInDays: isPermanent ? null : expiresInDays,
  });
  newUrl.clicks = 0; // Установите начальное значение кликов в 0
  await newUrl.save(); // Сохраните обновленные данные
    res.json({ shortUrl, host });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating short URL');
    }
  });


// API endpoint для перенаправления короткой ссылки
app.get('/:shortUrl', async (req, res) => {
    try {
      const shortUrl = req.params.shortUrl;
      const url = await Url.findOne({ where: { shortUrl } });
      if (!url) {
        return res.status(404).send('Short URL not found');
      }
      // Проверка срока действия
      if (url.expiresAt && url.expiresAt < new Date()) {
        // Ссылка истекла
        await url.destroy();
        return res.status(404).send('Short URL expired');
      }
      // Увеличение количества кликов
      url.clicks++;
      await url.save();
      // Получение данных пользователя, если ссылка принадлежит зарегистрированному пользователю
      let user = null;
      if (url.userId) {
        user = await User.findOne({ where: { id: url.userId } });
      }
      // Перенаправление на оригинальный URL
      res.redirect(307, url.originalUrl);
      // Создание записи о клике
      await Click.create({
        urlId: url.id,
        userId: url.userId, // Используем userId из объекта Url
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error redirecting');
    }
  });

// API endpoint для получения информации о ссылках пользователя



app.get('/', (req, res) => {
  
  host = req.headers.host;
  res.sendFile(__dirname + '/index.html');
});

module.exports = app;
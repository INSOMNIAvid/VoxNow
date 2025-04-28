const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const path = require('path');
const socketio = require('socket.io');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const config = require('./config');

const app = express();

// Подключение к MongoDB
mongoose.connect(config.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Настройка сессий
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Для HTTPS установите true
}));

// Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Глобальные переменные для шаблонов
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Маршруты
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/groups');
const userRoutes = require('./routes/users');

app.use('/', authRoutes);
app.use('/chat', chatRoutes);
app.use('/groups', groupRoutes);
app.use('/users', userRoutes);

// Запуск сервера
const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

// Socket.io
const io = socketio(server);
require('./sockets')(io, passport);

// Обработка 404
app.use((req, res) => {
  res.status(404).render('404');
});

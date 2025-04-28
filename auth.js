const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../config');

// Регистрация
router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', [
  check('email').isEmail().withMessage('Invalid email'),
  check('username').matches(/^@?[a-zA-Z0-9_]{3,20}$/).withMessage('Username must be 3-20 characters (letters, numbers, _)'),
  check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/register');
  }

  try {
    let { username, email, password } = req.body;
    
    // Добавляем @ к username если его нет
    if (!username.startsWith('@')) {
      username = '@' + username;
    }

    // Проверка на существующего пользователя
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }

    // Создание пользователя
    const user = new User({ username, email, password });
    await user.save();

    // Отправка подтверждения email
    const token = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = Date.now() + 3600000; // 1 час
    await user.save();

    const transporter = nodemailer.createTransport({
      service: config.EMAIL_SERVICE,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
      }
    });

    const mailOptions = {
      to: user.email,
      from: config.EMAIL_USER,
      subject: 'Verify your email',
      text: `Please verify your email by clicking the following link:\n\n
        ${config.BASE_URL}/verify-email/${token}\n\n
        If you did not request this, please ignore this email.`
    };

    await transporter.sendMail(mailOptions);

    req.flash('success', 'Registration successful! Please check your email to verify your account.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error during registration');
    res.redirect('/register');
  }
});

// Подтверждение email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash('error', 'Email verification token is invalid or has expired');
      return res.redirect('/login');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    req.flash('success', 'Email successfully verified! You can now log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error verifying email');
    res.redirect('/login');
  }
});

// Вход
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/chat',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Выход
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'You have been logged out');
  res.redirect('/login');
});

// Страница профиля
router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render('profile', { user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading profile');
    res.redirect('/chat');
  }
});

// Обновление профиля
router.post('/profile', isLoggedIn, async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findById(req.user._id);
    
    if (req.file) {
      user.avatar = '/uploads/' + req.file.filename;
    }
    
    user.bio = bio;
    await user.save();
    
    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating profile');
    res.redirect('/profile');
  }
});

// Middleware для проверки аутентификации
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in first');
  res.redirect('/login');
}

module.exports = router;

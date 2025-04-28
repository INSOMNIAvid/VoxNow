require('dotenv').config();

module.exports = {
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/messenger',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  PORT: process.env.PORT || 3000,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER || 'your-email@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'your-email-password',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
};

const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  content: {
    type: String,
    required: true
  },
  encryptedContent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

// Шифрование сообщения перед сохранением
messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key';
    this.encryptedContent = CryptoJS.AES.encrypt(this.content, secretKey).toString();
  }
  next();
});

// Метод для расшифровки сообщения
messageSchema.methods.decryptContent = function() {
  const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key';
  const bytes = CryptoJS.AES.decrypt(this.encryptedContent, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

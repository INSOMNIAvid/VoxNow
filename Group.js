const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  avatar: {
    type: String,
    default: '/images/default-group.png'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

groupSchema.pre('save', function(next) {
  // Добавляем создателя в админы и участники
  if (this.isNew) {
    this.admins.push(this.creator);
    this.members.push(this.creator);
  }
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

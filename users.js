const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isLoggedIn } = require('./auth');

// Поиск пользователей
router.get('/search', isLoggedIn, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.render('search', { users: [] });
    }
    
    let username = query;
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    
    const users = await User.find({ 
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('username avatar bio');
    
    res.render('search', { users, query });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error searching users');
    res.redirect('/chat');
  }
});

// Отправка запроса в друзья
router.post('/friend-request/:userId', isLoggedIn, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      req.flash('error', 'User not found');
      return res.redirect('/users/search');
    }
    
    // Проверяем, не отправили ли уже запрос
    if (targetUser.friendRequests.includes(req.user._id)) {
      req.flash('error', 'Friend request already sent');
      return res.redirect(`/users/search?q=${targetUser.username.substring(1)}`);
    }
    
    // Проверяем, не являются ли уже друзьями
    if (targetUser.friends.includes(req.user._id)) {
      req.flash('error', 'You are already friends');
      return res.redirect(`/users/search?q=${targetUser.username.substring(1)}`);
    }
    
    targetUser.friendRequests.push(req.user._id);
    await targetUser.save();
    
    req.flash('success', 'Friend request sent');
    res.redirect(`/users/search?q=${targetUser.username.substring(1)}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error sending friend request');
    res.redirect('/users/search');
  }
});

// Принятие запроса в друзья
router.post('/accept-friend/:userId', isLoggedIn, async (req, res) => {
  try {
    const sender = await User.findById(req.params.userId);
    if (!sender) {
      req.flash('error', 'User not found');
      return res.redirect('/chat');
    }
    
    // Проверяем, есть ли запрос от этого пользователя
    if (!req.user.friendRequests.includes(sender._id)) {
      req.flash('error', 'No friend request from this user');
      return res.redirect('/chat');
    }
    
    // Удаляем запрос
    req.user.friendRequests = req.user.friendRequests.filter(
      id => !id.equals(sender._id)
    );
    
    // Добавляем в друзья
    req.user.friends.push(sender._id);
    sender.friends.push(req.user._id);
    
    await Promise.all([req.user.save(), sender.save()]);
    
    req.flash('success', `You are now friends with ${sender.username}`);
    res.redirect('/chat');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error accepting friend request');
    res.redirect('/chat');
  }
});

// Отклонение запроса в друзья
router.post('/reject-friend/:userId', isLoggedIn, async (req, res) => {
  try {
    const sender = await User.findById(req.params.userId);
    if (!sender) {
      req.flash('error', 'User not found');
      return res.redirect('/chat');
    }
    
    // Проверяем, есть ли запрос от этого пользователя
    if (!req.user.friendRequests.includes(sender._id)) {
      req.flash('error', 'No friend request from this user');
      return res.redirect('/chat');
    }
    
    // Удаляем запрос
    req.user.friendRequests = req.user.friendRequests.filter(
      id => !id.equals(sender._id)
    );
    
    await req.user.save();
    
    req.flash('success', 'Friend request rejected');
    res.redirect('/chat');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error rejecting friend request');
    res.redirect('/chat');
  }
});

// Удаление друга
router.post('/remove-friend/:userId', isLoggedIn, async (req, res) => {
  try {
    const friend = await User.findById(req.params.userId);
    if (!friend) {
      req.flash('error', 'User not found');
      return res.redirect('/chat');
    }
    
    // Проверяем, являются ли друзьями
    if (!req.user.friends.includes(friend._id)) {
      req.flash('error', 'This user is not your friend');
      return res.redirect('/chat');
    }
    
    // Удаляем из друзей
    req.user.friends = req.user.friends.filter(
      id => !id.equals(friend._id)
    );
    friend.friends = friend.friends.filter(
      id => !id.equals(req.user._id)
    );
    
    await Promise.all([req.user.save(), friend.save()]);
    
    req.flash('success', `You are no longer friends with ${friend.username}`);
    res.redirect('/chat');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error removing friend');
    res.redirect('/chat');
  }
});

module.exports = router;

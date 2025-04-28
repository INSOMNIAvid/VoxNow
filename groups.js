const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const { isLoggedIn } = require('./auth');

// Список групп пользователя
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.render('groups', { groups });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading groups');
    res.redirect('/chat');
  }
});

// Создание группы
router.post('/', isLoggedIn, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const group = new Group({
      name,
      description,
      creator: req.user._id
    });
    
    await group.save();
    
    req.flash('success', 'Group created successfully');
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error creating group');
    res.redirect('/groups');
  }
});

// Страница группы
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar');
    
    if (!group) {
      req.flash('error', 'Group not found');
      return res.redirect('/groups');
    }
    
    // Проверяем, является ли пользователь участником группы
    if (!group.members.some(m => m._id.equals(req.user._id))) {
      req.flash('error', 'You are not a member of this group');
      return res.redirect('/groups');
    }
    
    // Получаем сообщения группы
    const messages = await Message.find({ group: group._id })
      .populate('sender', 'username avatar')
      .sort({ timestamp: 1 });
    
    res.render('group', { 
      group,
      messages: messages.map(m => ({
        ...m.toObject(),
        content: m.decryptContent()
      })),
      isAdmin: group.admins.some(a => a._id.equals(req.user._id)),
      isCreator: group.creator._id.equals(req.user._id)
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading group');
    res.redirect('/groups');
  }
});

// Добавление участника в группу
router.post('/:id/add-member', isLoggedIn, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error', 'Group not found');
      return res.redirect('/groups');
    }
    
    // Проверяем права администратора
    if (!group.admins.includes(req.user._id)) {
      req.flash('error', 'Only admins can add members');
      return res.redirect(`/groups/${group._id}`);
    }
    
    let username = req.body.username;
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect(`/groups/${group._id}`);
    }
    
    // Проверяем, не состоит ли уже пользователь в группе
    if (group.members.includes(user._id)) {
      req.flash('error', 'User is already a member');
      return res.redirect(`/groups/${group._id}`);
    }
    
    group.members.push(user._id);
    await group.save();
    
    req.flash('success', 'User added to group');
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error adding member');
    res.redirect(`/groups/${req.params.id}`);
  }
});

// Назначение/снятие администратора
router.post('/:id/toggle-admin', isLoggedIn, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error', 'Group not found');
      return res.redirect('/groups');
    }
    
    // Только создатель может назначать админов
    if (!group.creator.equals(req.user._id)) {
      req.flash('error', 'Only group creator can manage admins');
      return res.redirect(`/groups/${group._id}`);
    }
    
    const userId = req.body.userId;
    
    // Проверяем, что пользователь является участником группы
    if (!group.members.includes(userId)) {
      req.flash('error', 'User is not a group member');
      return res.redirect(`/groups/${group._id}`);
    }
    
    // Проверяем, не является ли пользователь создателем
    if (group.creator.equals(userId)) {
      req.flash('error', 'Group creator cannot be demoted');
      return res.redirect(`/groups/${group._id}`);
    }
    
    const index = group.admins.indexOf(userId);
    if (index === -1) {
      // Назначаем админом
      group.admins.push(userId);
      req.flash('success', 'User promoted to admin');
    } else {
      // Снимаем с админки
      group.admins.splice(index, 1);
      req.flash('success', 'User demoted from admin');
    }
    
    await group.save();
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating admin status');
    res.redirect(`/groups/${req.params.id}`);
  }
});

module.exports = router;

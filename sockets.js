const Message = require('./models/Message');
const User = require('./models/User');

module.exports = function(io, passport) {
  io.use((socket, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) return next(new Error('Unauthorized'));
      
      socket.user = user;
      next();
    })(socket.request, {}, next);
  });
  
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username}`);
    
    // Обновляем статус пользователя как онлайн
    await User.findByIdAndUpdate(socket.user._id, { online: true });
    
    // Присоединяем пользователя к его комнате
    socket.join(`user_${socket.user._id}`);
    
    // Обработка личных сообщений
    socket.on('private message', async ({ recipient, content }) => {
      try {
        // Проверяем, есть ли получатель в друзьях
        const recipientUser = await User.findOne({ 
          username: recipient.startsWith('@') ? recipient : `@${recipient}`
        });
        
        if (!recipientUser) {
          return socket.emit('error', 'Recipient not found');
        }
        
        if (!socket.user.friends.includes(recipientUser._id)) {
          return socket.emit('error', 'You can only message friends');
        }
        
        // Создаем и сохраняем сообщение
        const message = new Message({
          sender: socket.user._id,
          recipient: recipientUser._id,
          content
        });
        
        await message.save();
        
        // Отправляем сообщение отправителю
        socket.emit('private message', {
          sender: socket.user._id,
          recipient: recipientUser._id,
          content,
          timestamp: message.timestamp
        });
        
        // Отправляем сообщение получателю
        io.to(`user_${recipientUser._id}`).emit('private message', {
          sender: socket.user._id,
          recipient: recipientUser._id,
          content,
          timestamp: message.timestamp
        });
      } catch (err) {
        console.error(err);
        socket.emit('error', 'Error sending message');
      }
    });
    
    // Обработка групповых сообщений
    socket.on('group message', async ({ groupId, content }) => {
      try {
        const group = await Group.findById(groupId);
        
        if (!group) {
          return socket.emit('error', 'Group not found');
        }
        
        // Проверяем, является ли пользователь участником группы
        if (!group.members.includes(socket.user._id)) {
          return socket.emit('error', 'You are not a member of this group');
        }
        
        // Создаем и сохраняем сообщение
        const message = new Message({
          sender: socket.user._id,
          group: groupId,
          content
        });
        
        await message.save();
        
        // Отправляем сообщение всем участникам группы
        group.members.forEach(memberId => {
          io.to(`user_${memberId}`).emit('group message', {
            sender: socket.user._id,
            group: groupId,
            content,
            timestamp: message.timestamp
          });
        });
      } catch (err) {
        console.error(err);
        socket.emit('error', 'Error sending group message');
      }
    });
    
    // Обработка отключения
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      // Обновляем статус пользователя как оффлайн
      await User.findByIdAndUpdate(socket.user._id, { 
        online: false,
        lastSeen: Date.now()
      });
    });
  });
};

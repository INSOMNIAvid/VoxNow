document.addEventListener('DOMContentLoaded', () => {
  // Инициализация Socket.io
  const socket = io();
  
  // Обработка отправки сообщений
  const messageForms = document.querySelectorAll('#message-form');
  messageForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = this.querySelector('input');
      const content = input.value.trim();
      
      if (content) {
        // Определяем тип чата (личный или групповой)
        if (this.closest('.chat-content')) {
          // Личный чат
          const recipient = document.querySelector('.chat-header .username').textContent;
          socket.emit('private message', { recipient, content });
        } else if (this.closest('.group-chat')) {
          // Групповой чат
          const groupId = this.closest('.group-container').dataset.groupId;
          socket.emit('group message', { groupId, content });
        }
        
        input.value = '';
      }
    });
  });
  
  // Обработка входящих сообщений
  socket.on('private message', data => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${data.sender === currentUserId ? 'sent' : 'received'}`;
      
      if (data.sender === currentUserId) {
        messageElement.innerHTML = `
          <div class="message-content">
            <p>${data.content}</p>
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        `;
      } else {
        messageElement.innerHTML = `
          <img src="${data.senderAvatar || '/images/default-avatar.png'}" alt="${data.senderUsername}" class="avatar">
          <div class="message-content">
            <span class="sender">${data.senderUsername}</span>
            <p>${data.content}</p>
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        `;
      }
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  socket.on('group message', data => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer && messagesContainer.closest('.group-container').dataset.groupId === data.groupId) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${data.sender === currentUserId ? 'sent' : 'received'}`;
      
      if (data.sender === currentUserId) {
        messageElement.innerHTML = `
          <div class="message-content">
            <p>${data.content}</p>
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        `;
      } else {
        messageElement.innerHTML = `
          <img src="${data.senderAvatar || '/images/default-avatar.png'}" alt="${data.senderUsername}" class="avatar">
          <div class="message-content">
            <span class="sender">${data.senderUsername}</span>
            <p>${data.content}</p>
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        `;
      }
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  // Обновление статуса онлайн
  socket.on('user online', userId => {
    document.querySelectorAll(`.status[data-user="${userId}"]`).forEach(el => {
      el.textContent = 'Online';
      el.classList.add('online');
      el.classList.remove('offline');
    });
  });
  
  socket.on('user offline', userId => {
    document.querySelectorAll(`.status[data-user="${userId}"]`).forEach(el => {
      el.textContent = 'Offline';
      el.classList.add('offline');
      el.classList.remove('online');
    });
  });
  
  // Обработка загрузки аватара
  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const formData = new FormData();
        formData.append('avatar', this.files[0]);
        
        fetch('/profile/avatar', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            document.querySelector('.profile-avatar').src = data.avatarUrl;
            document.querySelector('.user-menu .avatar').src = data.avatarUrl;
          }
        })
        .catch(error => console.error('Error:', error));
      }
    });
  }
  
  // Инициализация dropdown меню
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    userMenu.addEventListener('click', function(e) {
      e.stopPropagation();
      this.querySelector('.dropdown').classList.toggle('show');
    });
    
    // Закрытие dropdown при клике вне его
    document.addEventListener('click', function() {
      const dropdowns = document.querySelectorAll('.dropdown');
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    });
  }
  
  // Форматирование времени
  function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    } else {
      return date.toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'});
    }
  }
  
  // Глобальные функции для EJS
  window.formatTime = formatTime;
  
  window.formatLastSeen = function(timestamp) {
    if (!timestamp) return 'long time ago';
    
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffInSeconds = Math.floor((now - lastSeen) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return lastSeen.toLocaleDateString();
    }
  };
});

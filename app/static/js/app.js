document.addEventListener('DOMContentLoaded', function() {
    // Load friends and groups
    loadContacts();
    
    // Message form submission
    document.getElementById('message-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (message && currentChatId) {
            sendMessage(currentChatId, message, currentChatType);
            input.value = '';
        }
    });
});

let currentChatId = null;
let currentChatType = null; // 'user' or 'group'

function loadContacts() {
    fetch('/api/friends')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('contacts-list');
            container.innerHTML = '<div class="p-2 font-semibold">Contacts</div>';
            
            data.forEach(friend => {
                const element = document.createElement('div');
                element.className = 'p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer';
                element.innerHTML = `
                    <div class="flex items-center" onclick="openChat('user', ${friend.id})">
                        <img src="${friend.avatar}" class="w-8 h-8 rounded-full">
                        <div class="ml-3">
                            <div>${friend.username}</div>
                            <div class="text-xs text-gray-500">${friend.about || ''}</div>
                        </div>
                    </div>
                `;
                container.appendChild(element);
            });
        });
}

function openChat(type, id) {
    currentChatId = id;
    currentChatType = type;
    
    // Update chat header
    fetch(`/api/${type === 'user' ? 'user' : 'group'}/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('chat-name').textContent = data.username || data.name;
            document.getElementById('chat-avatar').src = data.avatar;
            document.getElementById('chat-status').textContent = 
                type === 'user' ? (data.online ? 'Online' : 'Last seen recently') : `${data.member_count} members`;
        });
    
    // Load messages
    loadMessages(type, id);
}

function loadMessages(type, id) {
    const url = type === 'user' ? `/api/messages?user_id=${id}` : `/api/group_messages?group_id=${id}`;
    
    fetch(url)
        .then(response => response.json())
        .then(messages => {
            const container = document.getElementById('messages-container');
            container.innerHTML = '';
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `mb-4 flex ${msg.is_me ? 'justify-end' : 'justify-start'}`;
                
                messageDiv.innerHTML = `
                    <div class="${msg.is_me ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 max-w-xs lg:max-w-md">
                        <div class="font-semibold">${msg.sender}</div>
                        <div>${msg.body}</div>
                        <div class="text-xs ${msg.is_me ? 'text-blue-100' : 'text-gray-500'} mt-1">
                            ${new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                `;
                
                container.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        });
}

function sendMessage(recipientId, message, type) {
    const url = type === 'user' ? '/api/send_message' : '/api/send_group_message';
    const data = type === 'user' ? 
        { recipient_id: recipientId, message } : 
        { group_id: recipientId, message };
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadMessages(type, recipientId);
        }
    });
}

// Search functionality
document.querySelector('input[placeholder="Search..."]').addEventListener('input', function(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
        fetch(`/api/search?q=${query}`)
            .then(response => response.json())
            .then(users => {
                console.log(users); // Display search results
            });
    }
});

from flask import render_template, jsonify, request
from flask_login import current_user, login_required
from app import db
from app.models import User, PrivateMessage, Group, GroupMessage
from app.utils.encryption import encrypt_message, decrypt_message
from datetime import datetime

@login_required
def index():
    return render_template('chat/index.html')

@login_required
def get_friends():
    friends = current_user.friends.filter_by(status='accepted').all()
    return jsonify([{
        'id': friend.friend.id,
        'username': friend.friend.username,
        'avatar': friend.friend.avatar,
        'about': friend.friend.about_me,
        'online': friend.friend.is_online()
    } for friend in friends])

@login_required
def search_users():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    if query.startswith('@'):
        query = query[1:]
    
    users = User.query.filter(
        User.username.ilike(f'%{query}%') | 
        User.email.ilike(f'%{query}%')
    ).limit(10).all()
    
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'avatar': user.avatar
    } for user in users if user.id != current_user.id])

@login_required
def send_message():
    recipient_id = request.json.get('recipient_id')
    message = request.json.get('message')
    
    if not recipient_id or not message:
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400
    
    recipient = User.query.get(recipient_id)
    if not recipient:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404
    
    encrypted_message = encrypt_message(message)
    
    msg = PrivateMessage(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        body=message,
        encrypted_body=encrypted_message
    )
    
    db.session.add(msg)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': {
            'id': msg.id,
            'body': msg.body,
            'timestamp': msg.timestamp.isoformat(),
            'sender': current_user.username
        }
    })

@login_required
def get_messages():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': 'User ID required'}), 400
    
    messages = PrivateMessage.query.filter(
        ((PrivateMessage.sender_id == current_user.id) & 
         (PrivateMessage.recipient_id == user_id)) |
        ((PrivateMessage.sender_id == user_id) & 
         (PrivateMessage.recipient_id == current_user.id))
    ).order_by(PrivateMessage.timestamp.asc()).all()
    
    return jsonify([{
        'id': msg.id,
        'body': msg.body,
        'timestamp': msg.timestamp.isoformat(),
        'sender': msg.sender.username,
        'is_me': msg.sender_id == current_user.id
    } for msg in messages])

from cryptography.fernet import Fernet
from app import app
import base64
import os

def generate_key():
    return Fernet.generate_key()

def get_cipher_suite(key=None):
    if key is None:
        key = app.config['SECRET_KEY'].encode()
    # We need to make sure the key is 32 url-safe base64-encoded bytes
    key = base64.urlsafe_b64encode(key.ljust(32)[:32])
    return Fernet(key)

def encrypt_message(message, key=None):
    cipher_suite = get_cipher_suite(key)
    return cipher_suite.encrypt(message.encode())

def decrypt_message(encrypted_message, key=None):
    cipher_suite = get_cipher_suite(key)
    return cipher_suite.decrypt(encrypted_message).decode()

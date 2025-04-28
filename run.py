from app import create_app, db
from app.models import User, PrivateMessage, Group, GroupMessage

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'PrivateMessage': PrivateMessage,
        'Group': Group,
        'GroupMessage': GroupMessage
    }

if __name__ == '__main__':
    app.run(debug=True)

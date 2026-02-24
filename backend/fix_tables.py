from app import create_app
from app.models import db

app = create_app()

with app.app_context():
    print("Dropping old auth tables...")
    try:
        db.engine.execute('DROP TABLE IF EXISTS user_roles;')
        db.engine.execute('DROP TABLE IF EXISTS role_permissions;')
        db.engine.execute('DROP TABLE IF EXISTS permissions;')
        db.engine.execute('DROP TABLE IF EXISTS roles;')
        db.engine.execute('DROP TABLE IF EXISTS users;')
    except Exception as e:
        print(f"Error executing raw drop (SQLAlchemy 2.0 uses text()): {e}")
        from sqlalchemy import text
        try:
            db.session.execute(text('DROP TABLE IF EXISTS user_roles;'))
            db.session.execute(text('DROP TABLE IF EXISTS role_permissions;'))
            db.session.execute(text('DROP TABLE IF EXISTS permissions;'))
            db.session.execute(text('DROP TABLE IF EXISTS roles;'))
            db.session.execute(text('DROP TABLE IF EXISTS users;'))
            db.session.commit()
            print("Dropped securely.")
        except Exception as inner_e:
            print(f"Failed again: {inner_e}")

    print("Re-creating tables...")
    db.create_all()
    print("Tables re-created successfully!")

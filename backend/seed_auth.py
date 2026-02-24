from app import create_app
from app.models import db, User, Role, Permission
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    print("Iniciando seed de Auth...")

    # Cria tabelas se não existirem
    db.create_all()

    # Cria papéis (Roles)
    super_admin_role = Role.query.filter_by(name='Super Admin').first()
    if not super_admin_role:
        super_admin_role = Role(name='Super Admin', description='Acesso irrestrito a todo o sistema')
        db.session.add(super_admin_role)

    operador_role = Role.query.filter_by(name='Operador').first()
    if not operador_role:
        operador_role = Role(name='Operador', description='Acesso operacional padrão')
        db.session.add(operador_role)

    gerente_role = Role.query.filter_by(name='Gerente').first()
    if not gerente_role:
        gerente_role = Role(name='Gerente', description='Visão gerencial e de controle')
        db.session.add(gerente_role)

    db.session.commit()
    print("Roles criadas.")

    # Cria permissões básicas (exemplos)
    perms = [
        {"name": "view_dashboard", "desc": "Pode visualizar o dashboard principal", "mod": "DASHBOARD"},
        {"name": "manage_users", "desc": "Pode criar e gerir usuários", "mod": "ADMIN"},
        {"name": "manage_roles", "desc": "Pode alterar permissões", "mod": "ADMIN"},
        {"name": "view_integrations", "desc": "Pode ver a tela de integração", "mod": "INTEGRACAO"},
    ]

    for p in perms:
        existing = Permission.query.filter_by(name=p['name']).first()
        if not existing:
            new_perm = Permission(name=p['name'], description=p['desc'], module=p['mod'])
            db.session.add(new_perm)

    db.session.commit()
    print("Permissions criadas.")

    # Aloca as permissões de operador
    op_role = Role.query.filter_by(name='Operador').first()
    view_dash = Permission.query.filter_by(name='view_dashboard').first()
    view_int = Permission.query.filter_by(name='view_integrations').first()
    if op_role and view_dash and view_dash not in op_role.permissions:
        op_role.permissions.append(view_dash)
    if op_role and view_int and view_int not in op_role.permissions:
        op_role.permissions.append(view_int)

    db.session.commit()
    
    # Cria o usuário admin se não existir
    admin_user = User.query.filter_by(email='admin@clickup.com').first()
    if not admin_user:
        hashed_pw = generate_password_hash('admin123')
        admin_user = User(
            name='Administrador Master',
            email='admin@clickup.com',
            password_hash=hashed_pw,
            is_active=True,
            totp_enabled=False 
        )
        db.session.add(admin_user)
        db.session.commit()
        
        # Adiciona a role de Super Admin para ele
        admin_user.roles.append(super_admin_role)
        db.session.commit()
        print("Usuário 'admin@clickup.com' (senha: admin123) criado com sucesso!")
    else:
        print("Usuário Admin já existe.")

    print("Seed finalizado com sucesso!")

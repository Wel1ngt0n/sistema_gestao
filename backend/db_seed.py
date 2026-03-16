import os
import sys

# Adicionar o diretório pai ao path para importar a app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Role, Permission
from app.services.security_service import hash_password

def seed():
    app = create_app()
    with app.app_context():
        print("🌱 Iniciando o Seeding do banco de dados...")

        # 1. Definir Permissões
        permissions_data = [
            # Sistema & Config
            {"name": "manage_system", "description": "Alterar configurações globais do sistema", "module": "CONFIG"},
            {"name": "view_logs", "description": "Visualizar logs de auditoria e sincronização", "module": "CONFIG"},
            
            # Usuários & RBAC
            {"name": "manage_users", "description": "Criar, editar e desativar usuários", "module": "ADMIN"},
            {"name": "manage_roles", "description": "Gerenciar papéis e permissões", "module": "ADMIN"},
            
            # Operacional / Lojas
            {"name": "edit_store", "description": "Editar dados manuais de uma loja", "module": "OPERACIONAL"},
            {"name": "delete_store", "description": "Remover uma loja do sistema", "module": "OPERACIONAL"},
            {"name": "sync_clickup", "description": "Disparar sincronização manual com ClickUp", "module": "OPERACIONAL"},
            
            # Performance
            {"name": "view_performance", "description": "Ver dashboards de performance", "module": "PERFORMANCE"},
            {"name": "manage_performance", "description": "Lançar avaliações comportamentais", "module": "PERFORMANCE"},
            
            # I.A.
            {"name": "use_ai_chat", "description": "Usar chat operacional com I.A.", "module": "IA"},
        ]

        perms = {}
        for p_data in permissions_data:
            existing = Permission.query.filter_by(name=p_data["name"]).first()
            if not existing:
                perm = Permission(**p_data)
                db.session.add(perm)
                perms[p_data["name"]] = perm
                print(f"  [+] Permissão criada: {p_data['name']}")
            else:
                perms[p_data["name"]] = existing

        db.session.commit()

        # 2. Definir Roles
        roles_data = [
            {
                "name": "Super Admin", 
                "description": "Acesso total a todas as funções do sistema",
                "permissions": list(perms.values()) # Todas
            },
            {
                "name": "Gestor", 
                "description": "Visualiza dashboards e gerencia performance",
                "permissions": [
                    perms["view_performance"], perms["manage_performance"], 
                    perms["use_ai_chat"], perms["edit_store"]
                ]
            },
            {
                "name": "Integrador", 
                "description": "Usuário padrão operacional",
                "permissions": [
                    perms["use_ai_chat"], perms["edit_store"], perms["sync_clickup"]
                ]
            }
        ]

        for r_data in roles_data:
            existing_role = Role.query.filter_by(name=r_data["name"]).first()
            if not existing_role:
                role = Role(name=r_data["name"], description=r_data["description"])
                role.permissions = r_data["permissions"]
                db.session.add(role)
                print(f"  [+] Role criada: {r_data['name']}")
            else:
                # Atualiza permissões da role existente
                existing_role.permissions = r_data["permissions"]
                print(f"  [*] Role atualizada: {r_data['name']}")

        db.session.commit()

        # 3. Criar Usuários Administradores Iniciais
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@clickupcrm.com")
        admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin@2026!#")

        admin_user = User.query.filter_by(email=admin_email).first()
        if not admin_user:
            admin_user = User(
                name="Administrador do Sistema",
                email=admin_email,
                password_hash=hash_password(admin_pass),
                is_active=True
            )
            # Atribuir Role Super Admin
            super_role = Role.query.filter_by(name="Super Admin").first()
            if super_role:
                admin_user.roles.append(super_role)
            
            db.session.add(admin_user)
            print(f"  [+] Usuário ADMIN criado: {admin_email}")
            print(f"      SENHA TEMPORÁRIA: {admin_pass} (Altere após o primeiro login)")
        else:
            print(f"  [*] Usuário ADMIN já existe: {admin_email}")

        db.session.commit()
        print("\n✅ Seeding concluído com sucesso!")

if __name__ == "__main__":
    seed()

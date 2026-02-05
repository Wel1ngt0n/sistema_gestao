import os
import subprocess
import sys
import time
from datetime import datetime

# Configurações de Caminho
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Configurações Docker V3.0
DOCKER_DB_SERVICE = "db_v3"
DOCKER_BACKEND_SERVICE = "backend_v3"
DB_USER = "user"
DB_NAME = "sistema_gestao3"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print("="*50)
    print("   GERENCIADOR SISTEMA GESTÃO 3.0 (GREENFIELD)   ")
    print("="*50)
    print("")

def menu_principal():
    print_header()
    print("1. [INICIAR] Rodar Localmente (Backend + Frontend)")
    print("2. [INICIAR] Rodar via Docker (Docker Compose)")
    print("3. [BANCO]   Opções de Banco de Dados")
    print("4. [UTILS]   Limpar Cache / Instalar Dependências")
    print("5. [DOCKER]  Reiniciar e Reconstruir (Deep Restart) 🔄")
    print("0. [SAIR]    Sair")
    print("")
    return input("Escolha uma opção: ")

def restart_docker():
    print("\n🔄 Iniciando RESTART COMPLETO do Docker (V3.0)...")
    print("1. Parando containers...")
    os.system('docker-compose down')
    
    print("\n2. Subindo com REBUILD...")
    try:
        os.system('docker-compose up -d --build')
        print("\n✅ Sistema V3.0 reiniciado com sucesso!")
    except KeyboardInterrupt:
        print("\n🛑 Operação interrompida.")
    
    input("\nPressione ENTER para voltar...")

def menu_banco():
    print_header()
    print("--- OPÇÕES DE BANCO DE DADOS (V3.0) ---")
    print("1. Abrir Shell SQL (psql)")
    print("2. Gerenciar Migrações (Flask Migrate)")
    print("0. Voltar")
    print("")
    return input("Escolha uma opção: ")

def run_local():
    print("\n🚀 Iniciando Backend e Frontend (V3.0) em janelas separadas...")
    
    if os.name == 'nt':
        # Backend V3
        subprocess.Popen(f'start cmd /k "cd backend && python run.py"', shell=True)
        # Frontend V3
        subprocess.Popen(f'start cmd /k "cd frontend && npm run dev"', shell=True)
    else:
        print("Este script está otimizado para Windows.")
        
    print("\n✅ Comandos enviados! Verifique as novas janelas.")
    input("\nPressione ENTER para voltar...")

def run_docker():
    print("\n🐳 Iniciando Docker Compose (V3.0)...")
    try:
        # Roda em detached mode e segue os logs
        os.system('docker-compose up -d --build')
        print("Containers iniciados em background. Mostrando logs (Ctrl+C para sair dos logs, containers continuam rodando)...")
        time.sleep(2)
        os.system('docker-compose logs -f')
    except KeyboardInterrupt:
        print("\n🛑 Logs interrompidos.")
    
    input("\nPressione ENTER para voltar...")

def db_shell():
    print(f"\n🐚 Abrindo Shell SQL no Docker ({DOCKER_DB_SERVICE})...")
    os.system(f'docker-compose exec {DOCKER_DB_SERVICE} psql -U {DB_USER} -d {DB_NAME}')

def menu_migracoes():
    print_header()
    print("--- MIGRAÇÕES (FLASK MIGRATE) ---")
    print("1. Inicializar DB (flask db init) - Apenas 1ª vez")
    print("2. Criar Nova Migração (flask db migrate)")
    print("3. Aplicar Migrações (flask db upgrade)")
    print("0. Voltar")
    return input("Escolha: ")

def db_init():
    os.system(f'docker-compose exec -T {DOCKER_BACKEND_SERVICE} flask db init')
    input("Enter...")

def db_migrate():
    msg = input("Nome da migração: ")
    os.system(f'docker-compose exec -T {DOCKER_BACKEND_SERVICE} flask db migrate -m "{msg}"')
    input("Enter...")

def db_upgrade():
    os.system(f'docker-compose exec -T {DOCKER_BACKEND_SERVICE} flask db upgrade')
    input("Enter...")

def install_deps():
    print("\n📦 Instalando Dependências...")
    print("1. Backend (pip)...")
    os.system('cd backend && pip install -r requirements.txt')
    print("\n2. Frontend (npm)...")
    os.system('cd frontend && npm install')
    input("\n✅ Concluído. Enter para voltar...")

# --- Loop Principal ---
if __name__ == "__main__":
    while True:
        choice = menu_principal()
        
        if choice == '1':
            run_local()
        elif choice == '2':
            run_docker()
        elif choice == '3':
            while True:
                db_choice = menu_banco()
                if db_choice == '1':
                    db_shell()
                elif db_choice == '2':
                    while True:
                        m = menu_migracoes()
                        if m == '1': db_init()
                        elif m == '2': db_migrate()
                        elif m == '3': db_upgrade()
                        elif m == '0': break
                elif db_choice == '0':
                    break
        elif choice == '4':
            install_deps()
        elif choice == '5':
            restart_docker()
        elif choice == '0':
            print("Saindo... 👋")
            break
        else:
            print("Opção inválida!")
            time.sleep(1)

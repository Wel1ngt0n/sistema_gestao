import os
import subprocess
import sys
import time
from datetime import datetime

# Configurações de Caminho
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print("="*50)
    print("   GERENCIADOR DO SISTEMA DE GESTÃO (CLICKUP)   ")
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

# ... (existing functions)

def restart_docker():
    print("\n🔄 Iniciando RESTART COMPLETO do Docker...")
    print("Isso vai garantir que todas as dependências novas sejam instaladas.")
    print("1. Parando containers...")
    os.system('docker-compose down')
    
    print("\n2. Subindo com REBUILD (pode demorar um pouco)...")
    try:
        os.system('docker-compose up -d --build')
        print("\n✅ Sistema reiniciado com sucesso!")
        print("Aguarde alguns segundos para os serviços ficarem saudáveis.")
    except KeyboardInterrupt:
        print("\n🛑 Operação interrompida.")
    
    input("\nPressione ENTER para voltar...")

# ... (existing functions)



def menu_banco():
    print_header()
    print("--- OPÇÕES DE BANCO DE DADOS ---")
    print("1. Fazer Backup (Dump) do Banco Docker")
    print("2. Abrir Shell SQL (psql) no Docker")
    print("3. Resetar Banco de Dados (reset_db_v2.py) [⚠️ APAGA TUDO]")
    print("4. Atualizar Schema (patch_db.py) [✅ SEGURO - SEM PERDA DE DADOS]")
    print("5. Gerenciar Migrações (Avançado)")
    print("0. Voltar")
    print("")
    return input("Escolha uma opção: ")



def db_patch():
    print("\n🛡️ Iniciando Atualização Segura do Schema...")
    print("Isso vai adicionar as colunas novas sem apagar seus dados.")
    
    # Executa dentro do container backend
    ret = os.system('docker-compose exec -T backend python patch_db.py')
    
    if ret == 0:
        print("\n✅ Atualização concluída!")
    else:
        print("\n❌ Falha na atualização. Verifique se o Docker está rodando.")
    input("\nPressione ENTER para voltar...")



def run_local():
    print("\n🚀 Iniciando Backend e Frontend em janelas separadas...")
    
    # Comando para Windows (abre em novas janelas)
    if os.name == 'nt':
        # Backend
        subprocess.Popen(f'start cmd /k "cd backend && python run.py"', shell=True)
        # Frontend
        subprocess.Popen(f'start cmd /k "cd frontend && npm run dev"', shell=True)
    else:
        print("Este script está otimizado para Windows. Em Linux/Mac, use tmux ou abas manuais.")
        
    print("\n✅ Comandos enviados! Verifique as novas janelas.")
    input("\nPressione ENTER para voltar...")

def run_docker():
    print("\n🐳 Iniciando Docker Compose...")
    print("Use Ctrl+C para parar quando quiser.")
    time.sleep(1)
    try:
        os.system('docker-compose up --build')
    except KeyboardInterrupt:
        print("\n🛑 Parando Docker...")
    
    input("\nPressione ENTER para voltar...")

def db_backup():
    print("\n💾 Iniciando Backup do Banco de Dados (Docker)...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"backup_metrics_db_{timestamp}.sql"
    
    # Executa pg_dump dentro do container 'db' (nome definido no docker-compose)
    # Requer que o container esteja rodando
    cmd = f'docker-compose exec -T db pg_dump -U user -d metrics_db > {filename}'
    
    try:
        ret = os.system(cmd)
        if ret == 0:
            print(f"✅ Backup criado com sucesso: {filename}")
        else:
            print("❌ Erro ao criar backup. Verifique se o Docker está rodando.")
    except Exception as e:
        print(f"Erro: {e}")
        
    input("\nPressione ENTER para voltar...")

def db_shell():
    print("\n🐚 Abrindo Shell SQL no Docker...")
    os.system('docker-compose exec db psql -U user -d metrics_db')

def db_reset():
    print("\n⚠️  ATENÇÃO: ISSO VAI APAGAR E RECRIAR AS TABELAS! ⚠️")
    confirm = input("Tem certeza? Digite 'SIM' para confirmar: ")
    if confirm == 'SIM':
        print("Resetando banco (dentro do container backend)...")
        # Executa o script DENTRO do container para garantir acesso e dependências
        # O flag -T desabilita TTY para evitar erros em scripts não interativos
        ret = os.system('docker-compose exec -T backend python reset_db_v2.py')
        
        if ret == 0:
            print("\n✅ Reset concluído com sucesso!")
        else:
            print("\n❌ Falha no reset. Verifique se o Docker está rodando (Opção 2).")
    else:
        print("Operação cancelada.")
    input("\nPressione ENTER para voltar...")

def db_patch():
    print("\n🛡️ Iniciando Atualização Segura do Schema...")
    print("Isso vai adicionar as colunas novas sem apagar seus dados.")
    
    # Executa dentro do container backend
    ret = os.system('docker-compose exec -T backend python patch_db.py')
    
    if ret == 0:
        print("\n✅ Atualização concluída!")
    else:
        print("\n❌ Falha na atualização. Verifique se o Docker está rodando.")
    input("\nPressione ENTER para voltar...")

def menu_migracoes():
    print_header()
    print("--- OPÇÕES DE MIGRAÇÃO (AVANÇADO) ---")
    print("Use isso para alterações complexas (renomear, mudar tipos).")
    print("1. Criar Nova Migração (flask db migrate)")
    print("2. Aplicar Migrações Pendentes (flask db upgrade)")
    print("0. Voltar")
    print("")
    return input("Escolha uma opção: ")

def db_migrate():
    print("\n📝 Criando script de migração...")
    msg = input("Digite uma mensagem para a migração (ex: adiciona_coluna_vendas): ")
    # Executa dentro do container backend
    os.system(f'docker-compose exec -T backend flask db migrate -m "{msg}"')
    input("\nPressione ENTER para voltar...")

def db_upgrade():
    print("\n🚀 Aplicando migrações...")
    os.system('docker-compose exec -T backend flask db upgrade')
    input("\nPressione ENTER para voltar...")

def install_deps():
    print("\n📦 Instalando Dependências...")
    print("1. Backend (pip)")
    os.system('cd backend && pip install -r requirements.txt')
    print("\n2. Frontend (npm)")
    os.system('cd frontend && npm install')
    print("\n✅ Dependências atualizadas.")
    input("\nPressione ENTER para voltar...")

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
                    db_backup()
                elif db_choice == '2':
                    db_shell()
                elif db_choice == '3':
                    db_reset()
                elif db_choice == '4':
                    db_patch()
                elif db_choice == '5':
                    while True:
                        mig_choice = menu_migracoes()
                        if mig_choice == '1':
                            db_migrate()
                        elif mig_choice == '2':
                            db_upgrade()
                        elif mig_choice == '0':
                            break
                elif db_choice == '0':
                    break
        elif choice == '4':
            install_deps()
        elif choice == '5':
            restart_docker()
        elif choice == '0':
            print("Saindo... Até mais! 👋")
            break
        else:
            print("Opção inválida!")
            time.sleep(1)

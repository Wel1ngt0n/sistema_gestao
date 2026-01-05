
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    CLICKUP_API_KEY = os.getenv("CLICKUP_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # List IDs extracted from URLs
    LIST_ID_PRINCIPAL = "211186088"
    
    # Step Lists (Logical Subtasks)
    LIST_IDS_STEPS = {
        "SUBIR_APPS": "216936208",
        "INTEGRACAO": "211110999",
        "CADASTRO_OMIE": "216933916",
        "ONBOARDING": "216936196",
        "CRIAR_LOJAS": "216936198",
        "ATIVAR_RECORRENCIA": "216935323",
        "TREINAMENTO": "216936221",
        "CADASTRO_PRODUTOS": "216936188",
        "QUALIDADE": "216936200",
        "POS_IMPLANTACAO": "901306837383"
    }

    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///metrics.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

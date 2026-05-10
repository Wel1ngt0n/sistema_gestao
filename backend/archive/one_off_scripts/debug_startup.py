import sys
import os
sys.path.append(os.getcwd())
try:
    from app import create_app
    app = create_app()
    with app.app_context():
        print("Backend inicializado com sucesso")
        from app.services.forecast_service import ForecastService
        print("ForecastService importado")
except Exception as e:
    print(f"Erro ao inicializar backend: {e}")
    import traceback
    traceback.print_exc()

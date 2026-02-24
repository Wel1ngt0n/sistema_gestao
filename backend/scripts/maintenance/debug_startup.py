import sys
import os
sys.path.append(os.getcwd())
try:
    from app import create_app
    app = create_app()
    with app.app_context():
        print("Backend initialized successfully")
        from app.services.forecast_service import ForecastService
        print("ForecastService imported")
except Exception as e:
    print(f"Backend Startup Error: {e}")
    import traceback
    traceback.print_exc()

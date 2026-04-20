import subprocess

try:
    result = subprocess.run(['docker', 'logs', 'sistema_gesto25-backend-1'], capture_output=True, text=True)
    logs = result.stderr + result.stdout
    lines = logs.split('\n')
    
    # procure "Exception on"
    for i, line in enumerate(lines):
        if "Exception on /api/reports/monthly-implantation/export-excel" in line or "Traceback" in line:
            print("\n".join(lines[i-2:i+30]))
            break
except Exception as e:
    print(e)

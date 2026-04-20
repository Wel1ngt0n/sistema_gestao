with open('logs.txt', 'r', encoding='utf-16le') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "Traceback" in line or "Exception on" in line:
            print("".join(lines[i-2:i+30]))
            break

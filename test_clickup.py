import requests
import json

CLICKUP_API_KEY = "pk_61029153_OZYMFRVK07NEKLIBQRINT2ZA5BLG3HBF"
CLICKUP_LIST_ID = "211110999"

HEADERS = {
    "Authorization": CLICKUP_API_KEY,
    "Content-Type": "application/json"
}

def test_user():
    print("--- Testing /user Endpoint ---")
    url = "https://api.clickup.com/api/v2/user"
    res = requests.get(url, headers=HEADERS)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    return res.status_code == 200

def test_list():
    print("\n--- Testing /list Endpoint ---")
    url = f"https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}"
    res = requests.get(url, headers=HEADERS)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")

def test_list_tasks():
    print("\n--- Testing /list/tasks Endpoint ---")
    url = f"https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task"
    res = requests.get(url, headers=HEADERS)
    print(f"Status: {res.status_code}")
    if res.status_code != 200:
        print(f"Response: {res.text}")
    else:
        print(f"Tasks found: {len(res.json().get('tasks', []))}")

if __name__ == "__main__":
    if test_user():
        test_list()
        test_list_tasks()
    else:
        print("Skipping list tests because User Auth failed.")

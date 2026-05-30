import sys
import json
from pathlib import Path
IMG = Path(__file__).parent / 'storage' / 'uploads' / '20260530123334_e5da2cae98.png'
if not IMG.exists():
    print('Image not found:', IMG)
    sys.exit(1)

try:
    import requests
except Exception as exc:
    print('requests not available:', exc)
    sys.exit(1)

URL = 'http://127.0.0.1:5000'

with open(IMG, 'rb') as f:
    files = {'image': ('room.png', f, 'image/png')}
    print('POST /api/segment')
    r = requests.post(URL + '/api/segment', files=files, timeout=60)
    print('status', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2)[:2000])
    except Exception:
        print(r.text[:2000])

with open(IMG, 'rb') as f:
    files = {'image': ('room.png', f, 'image/png')}
    data = {'styleTheme': 'japandi'}
    print('\nPOST /api/redesign')
    r = requests.post(URL + '/api/redesign', files=files, data=data, timeout=120)
    print('status', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2)[:2000])
    except Exception:
        print(r.text[:2000])


with open(IMG, 'rb') as f:
    files = {'image': ('room.png', f, 'image/png')}
    data = {'region': 'wall', 'targetColor': '#b58900'}
    print('\nPOST /api/recolor')
    r = requests.post(URL + '/api/recolor', files=files, data=data, timeout=120)
    print('status', r.status_code)
    try:
        out = r.json()
        print({k: (v[:80] + '...') if isinstance(v, str) and len(v) > 80 else v for k, v in out.items()})
    except Exception:
        print(r.text[:2000])

print('\nPOST /api/recommend')
r = requests.post(URL + '/api/recommend', json={'baseColor': '#7b6d62'}, timeout=20)
print('status', r.status_code)
try:
    print(json.dumps(r.json(), indent=2))
except Exception:
    print(r.text)

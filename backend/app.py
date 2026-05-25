from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload():
    f = request.files.get('image')
    if not f:
        return jsonify({'error':'no file'}), 400
    fname = datetime.utcnow().strftime('%Y%m%d%H%M%S_') + f.filename
    path = os.path.join(UPLOAD_FOLDER, fname)
    f.save(path)
    # in a real app, run segmentation and palette extraction here
    palette = ['#f2e9e4', '#c3d2d8', '#6b8e8f']
    url = f'http://localhost:5000/uploads/{fname}'
    return jsonify({'url':url, 'palette':palette})

@app.route('/uploads/<path:fname>')
def uploaded_file(fname):
    return send_from_directory(UPLOAD_FOLDER, fname)

@app.route('/palette', methods=['POST'])
def palette():
    # Accept image and return suggested palette (stub)
    return jsonify({'palette':['#ffffff','#e6e6e6','#333333']})

@app.route('/save', methods=['POST'])
def save():
    data = request.json or {}
    # Store the design metadata; here we just echo with an id
    design_id = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    return jsonify({'id':design_id, 'share_url': f'http://example.com/designs/{design_id}'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

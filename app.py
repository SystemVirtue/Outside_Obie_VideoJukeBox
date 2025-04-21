from flask import Flask, send_from_directory, request, jsonify
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# Serve index.html at root
@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

# Serve player.html
@app.route('/player.html')
def player():
    return send_from_directory('.', 'player.html')

# Serve admin.html
@app.route('/admin.html')
def admin():
    return send_from_directory('.', 'admin.html')

# Serve static files (css, js, xml, etc.)
@app.route('/<path:filename>')
def static_files(filename):
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    else:
        return 'File not found', 404

# Placeholder for admin API endpoints (expand as needed)
@app.route('/api/admin/settings', methods=['POST'])
def admin_settings():
    data = request.json
    # TODO: Save settings, restrict access, etc.
    return jsonify({'status': 'success', 'message': 'Settings updated (demo only)', 'data': data})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)

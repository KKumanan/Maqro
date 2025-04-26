from flask import Flask, request, jsonify
import os
from datetime import datetime
import json

app = Flask(__name__)

# Directory to store received archives
ARCHIVE_DIR = "archives"

# Create archives directory if it doesn't exist
if not os.path.exists(ARCHIVE_DIR):
    os.makedirs(ARCHIVE_DIR)

@app.route('/receive_archive', methods=['POST'])
def receive_archive():
    try:
        # Get the raw data from the request
        data = request.get_data(as_text=True)
        
        if not data:
            return jsonify({"error": "No data received"}), 400
            
        # Try to parse the data as JSON
        try:
            # Since the data is already in JSONL format, we'll just save it as is
            parsed_data = data
        except json.JSONDecodeError as e:
            return jsonify({"error": f"Invalid JSON data: {str(e)}"}), 400
            
        # Generate a unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"archive_{timestamp}.jsonl"
        filepath = os.path.join(ARCHIVE_DIR, filename)
        
        # Save the data to a file
        with open(filepath, 'w') as f:
            f.write(data)
            
        return jsonify({
            "status": "success",
            "message": f"Archive received and saved as {filename}",
            "size": len(data)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import predict_complaint
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ML API is running'})

@app.route('/predict', methods=['POST'])
def predict():
    """Predict category and priority for a complaint"""
    try:
        data = request.json
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        complaint_text = data['text']
        
        # Get predictions
        result = predict_complaint(complaint_text)
        
        return jsonify({
            'text': complaint_text,
            'category': result['category'],
            'priority': result['priority']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({'message': 'Smart City ML API Server'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"\n🤖 ML API Server starting on http://localhost:{port}")
    print(f"📊 Prediction endpoint: POST http://localhost:{port}/predict\n")
    app.run(debug=False, port=port, host='0.0.0.0')

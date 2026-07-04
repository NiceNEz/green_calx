from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://localhost:5432/esp32_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    stake_id = db.Column(db.String, nullable=False)
    moisture = db.Column(db.Float, nullable=False)
    lux = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)
    temperature = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'stake_id': self.stake_id,
            'moisture': self.moisture,
            'lux': self.lux,
            'humidity': self.humidity,
            'temperature': self.temperature,
        }
    
with app.app_context():
    db.create_all()

@app.route('/api/data', methods=['POST'])
def upload_data():
    content_type = request.headers.get('Content-Type')
    if content_type != 'application/json':
        return jsonify({"error": "Content-Type must be application/json"}), 415
    
    data = request.json
    new_data = SensorData(
        stake_id=data['stake_id'],
        moisture=data['moisture'],
        lux=data['lux'],
        humidity=data['humidity'],
        temperature=data['temperature']
    )
    db.session.add(new_data)
    db.session.commit()
    return jsonify({"status": "success", "data_saved": new_data.to_dict()}), 201

@app.route('/api/readings<stake_id><limit>', methods=['GET'])
def get_readings(stake_id, limit):
    data = SensorData.query.filter_by(stake_id=stake_id).order_by(SensorData.timestamp.desc()).limit(limit).all()
    return jsonify([item.to_dict() for item in data])

@app.route('api/stakes', methods=['GET'])
def get_stakes():
    stakes = SensorData.query.distinct(SensorData.stake_id).order_by(SensorData.stake_id).all()
    return jsonify([item.to_dict() for item in stakes])

@app.route('api/health', methods=['GET'])
def get_health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    # Listen on all network interfaces, allowing the ESP32 to connect to your PC's IP
    app.run(host='0.0.0.0', port=8080, debug=True)
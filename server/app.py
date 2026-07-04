from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://localhost:5432/esp32_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Stake(db.Model):
    stake_id = db.Column(db.String, primary_key=True)
    species = db.Column(db.String, nullable=False)

    def to_dict(self):
        return {
            'stake_id': self.stake_id,
            'species': self.species,
        }

class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    stake_id = db.Column(db.String, db.ForeignKey('stake.stake_id'), nullable=False)
    moisture = db.Column(db.Float, nullable=False)
    lux = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)
    temperature = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() + 'Z' if self.timestamp else None,
            'stake_id': self.stake_id,
            'moisture': self.moisture,
            'lux': self.lux,
            'humidity': self.humidity,
            'temperature': self.temperature,
        }

with app.app_context():
    db.create_all()
    orphan_ids = (
        db.session.query(SensorData.stake_id)
        .outerjoin(Stake, SensorData.stake_id == Stake.stake_id)
        .filter(Stake.stake_id.is_(None))
        .distinct()
        .all()
    )
    for (stake_id,) in orphan_ids:
        db.session.add(Stake(stake_id=stake_id, species='Unknown'))
    if orphan_ids:
        db.session.commit()

def ensure_stake(stake_id, species=None):
    stake = Stake.query.get(stake_id)
    if stake is None:
        stake = Stake(stake_id=stake_id, species=species or 'Unknown')
        db.session.add(stake)
    elif species and stake.species == 'Unknown':
        stake.species = species
    return stake

@app.route('/api/data', methods=['POST'])
def upload_data():
    content_type = request.headers.get('Content-Type')
    if content_type != 'application/json':
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.json
    ensure_stake(data['stake_id'], data.get('species'))
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

@app.route('/api/readings', methods=['GET'])
def get_readings():
    stake_id = request.args.get('stake_id')
    if not stake_id:
        return jsonify({"status": "error", "error": "stake_id is required"}), 400

    limit = min(request.args.get('limit', 100, type=int), 1000)
    data = (
        SensorData.query
        .filter_by(stake_id=stake_id)
        .order_by(SensorData.timestamp.desc())
        .limit(limit)
        .all()
    )
    return jsonify({"status": "success", "readings": [item.to_dict() for item in data]})

@app.route('/api/stakes', methods=['GET'])
def get_stakes():
    stakes = Stake.query.order_by(Stake.stake_id).all()
    return jsonify({"status": "success", "stakes": [stake.to_dict() for stake in stakes]})

@app.route('/api/stakes', methods=['POST'])
def create_stake():
    content_type = request.headers.get('Content-Type')
    if content_type != 'application/json':
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.json
    stake_id = data.get('stake_id')
    species = data.get('species')
    if not stake_id or not species:
        return jsonify({"status": "error", "error": "stake_id and species are required"}), 400

    existing = Stake.query.get(stake_id)
    if existing:
        existing.species = species
        db.session.commit()
        return jsonify({"status": "success", "stake": existing.to_dict()}), 200

    stake = Stake(stake_id=stake_id, species=species)
    db.session.add(stake)
    db.session.commit()
    return jsonify({"status": "success", "stake": stake.to_dict()}), 201

@app.route('/api/health', methods=['GET'])
def get_health():
    return jsonify({"status": "success", "message": "API is running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)

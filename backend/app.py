# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import LeituraSensor
from datetime import datetime

app = Flask(__name__)
CORS(app) # Habilita CORS para todas as rotas por padrao.

# Lista em memoria para armazenar as leituras (simples, nao persistente)
leituras_sensores = []

# Endpoint para o ESP32 registrar uma nova leitura
# POST /api/sensores/registrar
@app.route('/api/sensores/registrar', methods=['POST'])
def registrar_leitura():
    data = request.get_json()

    # Validacao basica dos dados recebidos
    required_fields = ["espMec", "timestamp", "temperatura", "umidadeAr", "umidadeSolo1", "umidadeSolo2", "umidadeSolo3"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Dados incompletos"}), 400

    try:
        leitura = LeituraSensor(
            espMec=data['espMec'],
            timestamp_str=data['timestamp'],
            temperatura=float(data['temperatura']),
            umidadeAr=float(data['umidadeAr']),
            umidadeSolo1=float(data['umidadeSolo1']),
            umidadeSolo2=float(data['umidadeSolo2']),
            umidadeSolo3=float(data['umidadeSolo3'])
        )
        leituras_sensores.append(leitura)
        print(f"Leitura registrada: {leitura.to_dict()}")
        return jsonify({"message": "Leitura registrada com sucesso!"}), 201
    except ValueError:
        return jsonify({"error": "Dados invalidos (tipos incorretos)"}), 400
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

# Endpoint para o frontend buscar todas as leituras ou filtrar por espMec
# GET /api/sensores
# GET /api/sensores?espMec=AA:BB:CC:DD:EE:FF
@app.route('/api/sensores', methods=['GET'])
def get_leituras():
    esp_mec_param = request.args.get('espMec')

    filtered_leituras = leituras_sensores
    if esp_mec_param:
        filtered_leituras = [l for l in leituras_sensores if l.espMec == esp_mec_param]

    # Opcional: Ordenar por timestamp para o frontend
    filtered_leituras.sort(key=lambda x: x.timestamp)

    return jsonify([l.to_dict() for l in filtered_leituras]), 200

# Endpoint para buscar a ultima leitura de um ESP especifico
# GET /api/sensores/ultima?espMec=AA:BB:CC:DD:EE:FF
@app.route('/api/sensores/ultima', methods=['GET'])
def get_ultima_leitura():
    esp_mec_param = request.args.get('espMec')
    if not esp_mec_param:
        return jsonify({"error": "Parametro 'espMec' e obrigatorio"}), 400

    filtered_leituras = [l for l in leituras_sensores if l.espMec == esp_mec_param]

    if not filtered_leituras:
        return jsonify({"message": "Nenhuma leitura encontrada para este ESP"}), 404

    # Pega a ultima leitura (considerando que a lista esta ordenada por timestamp)
    ultima_leitura = max(filtered_leituras, key=lambda x: x.timestamp)
    return jsonify(ultima_leitura.to_dict()), 200

# Endpoint simples para testar a conectividade e retornar a hora do servidor
# GET /api-status
@app.route('/api-status', methods=['GET'])
def api_status():
    return jsonify({
        "status": "online",
        "server_time": datetime.now().isoformat(timespec='seconds') + 'Z'
    }), 200

# Endpoint para limpar todas as leituras (apenas para testes)
@app.route('/api/sensores/limpar', methods=['DELETE'])
def limpar_leituras():
    global leituras_sensores
    leituras_sensores = []
    return jsonify({"message": "Todas as leituras foram limpas."}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000, host="0.0.0.0") # Roda o Flask em modo debug na porta 5000
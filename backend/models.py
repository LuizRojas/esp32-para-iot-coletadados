# models.py
from datetime import datetime

class LeituraSensor:
    def __init__(self, espMec, timestamp_str, temperatura, umidadeAr, umidadeSolo1, umidadeSolo2, umidadeSolo3):
        self.espMec = espMec
        # Converte a string de timestamp para um objeto datetime
        # O ESP32 pode enviar no formato "YYYY-MM-DDTHH:MM:SSZ"
        self.timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) # Para lidar com 'Z' (UTC)
        self.temperatura = temperatura
        self.umidadeAr = umidadeAr
        self.umidadeSolo1 = umidadeSolo1
        self.umidadeSolo2 = umidadeSolo2
        self.umidadeSolo3 = umidadeSolo3

    def to_dict(self):
        # Converte o objeto para um dicionário (JSON)
        return {
            "espMec": self.espMec,
            "timestamp": self.timestamp.isoformat().replace('+00:00', 'Z'), # Volta para formato ISO com 'Z'
            "temperatura": self.temperatura,
            "umidadeAr": self.umidadeAr,
            "umidadeSolo1": self.umidadeSolo1,
            "umidadeSolo2": self.umidadeSolo2,
            "umidadeSolo3": self.umidadeSolo3
        }
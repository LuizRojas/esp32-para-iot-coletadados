#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h> // Para obter e ajustar o relogio interno (time_t, tm, settimeofday)

// ==========================
// CONFIGURACAO DA REDE WI-FI
// ==========================
#define WIFI_SSID "seu_wifi"
#define WIFI_PASSWORD "sua_senha"

// ==========================
// URL DA API DO SERVIDOR (Backend Flask)
// ==========================
#define FLASK_IP "ip_flask_backend"
#define FLASK_PORT "5000"

String API_POST_URL_STR = String("http://") + FLASK_IP + ":" + FLASK_PORT + "/api/sensores/registrar";
String API_GET_STATUS_URL_STR = String("http://") + FLASK_IP + ":" + FLASK_PORT + "/api-status";

// ==========================
// MAC ADDRESS DO ESP32
// ==========================
const String ESP_MAC_ADDRESS = "00:4B:12:8E:71:B8";

// ==========================
// OBJETOS GLOBAIS
// ==========================
WiFiClient client;
HTTPClient http;

// Variaveis para simular dados de sensores e atuadores
float simulatedTemperature = 25.0;
float simulatedHumidityAr = 60.0;
int simulatedUmidadeSolo1 = 500;
int simulatedUmidadeSolo2 = 600;
int simulatedUmidadeSolo3 = 450;
String simulatedStatusBombaAgua = "desligada";
String simulatedStatusValvula1 = "fechada";
String simulatedStatusValvula2 = "aberta";
String simulatedStatusValvula3 = "fechada";
const String STATIC_FOTO_URL = "https://ogimg.infoglobo.com.br/in/14499974-679-478/FT1086A/14147643312911.jpg";

// ==========================
// Funcao para conectar ao Wi-Fi
// ==========================
void connectWiFi() {
    Serial.print("Conectando ao Wi-Fi: ");
    Serial.println(WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
        delay(500);
        Serial.print(".");
        tentativas++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWi-Fi conectado com sucesso!");
        Serial.print("Endereco IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("MAC Address do ESP32: ");
        Serial.println(WiFi.macAddress());
    } else {
        Serial.println("\nFalha critica ao conectar ao Wi-Fi. Verifique SSID/Senha ou sinal.");
        delay(5000);
        ESP.restart();
    }
}

// ==========================
// Funcao para sincronizar o relogio com o Backend Flask
// ==========================
void syncTimeWithFlask() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi nao conectado, pulando sincronizacao de hora.");
        return;
    }

    Serial.println("\nSincronizando relogio com o servidor Flask...");
    Serial.print("Tentando GET em: ");
    Serial.println(API_GET_STATUS_URL_STR);

    http.begin(client, API_GET_STATUS_URL_STR.c_str());
    http.setConnectTimeout(8000);
    http.setTimeout(15000);

    int httpCode = http.GET();
    Serial.print("HTTP GET Code (syncTime): ");
    Serial.println(httpCode);

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        Serial.print("Resposta bruta do Flask (syncTime): ");
        Serial.println(payload);

        StaticJsonDocument<200> jsonDoc;
        DeserializationError error = deserializeJson(jsonDoc, payload);

        if (error) {
            Serial.print("deserializeJson() falhou (syncTime): ");
            Serial.println(error.c_str());
            Serial.println("Verifique se a biblioteca ArduinoJson esta correta e o JSON e valido.");
        } else {
            const char* serverTimeStr = jsonDoc["server_time"];
            Serial.print("server_time do Flask no JSON: ");
            Serial.println(serverTimeStr ? serverTimeStr : "N/D");

            if (serverTimeStr) {
                struct tm timeinfo;
                String timeStr = String(serverTimeStr);
                timeStr.replace('Z', ' ');

                if (strptime(timeStr.c_str(), "%Y-%m-%dT%H:%M:%S", &timeinfo)) {
                    time_t epochTime = mktime(&timeinfo);

                    // *** REMOVIDA LINHA DE SUBTRACAO DE FUSO HORARIO ***
                    // epochTime -= 3 * 3600; // Esta linha foi removida

                    struct timeval tv = { (long)epochTime, 0 };
                    settimeofday(&tv, NULL);

                    Serial.print("Relogio sincronizado com Flask (UTC): "); // Indicar que esta em UTC
                    Serial.println(serverTimeStr);

                    // Verifica se a hora foi realmente definida (e agora sera exibida no fuso horario local)
                    time_t now = time(nullptr);
                    struct tm current_timeinfo;
                    localtime_r(&now, &current_timeinfo);
                    Serial.printf("Hora interna do ESP32 (Local) apos sync: %s", asctime(&current_timeinfo));
                    return;
                } else {
                    Serial.println("Erro: strptime nao conseguiu interpretar o formato (syncTime).");
                    Serial.println("Verifique se o formato da data no Flask e exatamente 'YYYY-MM-DDTHH:MM:SSZ'.");
                }
            } else {
                Serial.println("Campo 'server_time' nao encontrado ou vazio na resposta do Flask (syncTime).");
            }
        }
    } else {
        Serial.print("Falha HTTP na requisicao GET para Flask status (syncTime): ");
        Serial.println(http.errorToString(httpCode));
    }
    http.end();
    Serial.println("Falha na sincronizacao do relogio com o Flask.");
}


// ==========================
// Funcao para enviar dados para o Backend Flask
// ==========================
void sendDataToFlask() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi nao conectado, pulando envio de dados.");
        return;
    }

    Serial.println("\nPreparando dados para envio...");

    // Gerar dados amostrais
    simulatedTemperature += (float)random(-50, 51) / 100.0;
    simulatedHumidityAr += (float)random(-100, 101) / 100.0;
    simulatedUmidadeSolo1 += random(-20, 21);
    simulatedUmidadeSolo2 += random(-20, 21);
    simulatedUmidadeSolo3 += random(-20, 21);

    simulatedTemperature = constrain(simulatedTemperature, 15.0, 35.0);
    simulatedHumidityAr = constrain(simulatedHumidityAr, 40.0, 90.0);
    simulatedUmidadeSolo1 = constrain(simulatedUmidadeSolo1, 200, 800);
    simulatedUmidadeSolo2 = constrain(simulatedUmidadeSolo2, 200, 800);
    simulatedUmidadeSolo3 = constrain(simulatedUmidadeSolo3, 200, 800);

    if (random(0, 10) < 2) simulatedStatusBombaAgua = (simulatedStatusBombaAgua == "ligada") ? "desligada" : "ligada";
    if (random(0, 10) < 2) simulatedStatusValvula1 = (simulatedStatusValvula1 == "aberta") ? "fechada" : "aberta";
    if (random(0, 10) < 2) simulatedStatusValvula2 = (simulatedStatusValvula2 == "aberta") ? "fechada" : "aberta";
    if (random(0, 10) < 2) simulatedStatusValvula3 = (simulatedStatusValvula3 == "aberta") ? "fechada" : "aberta";

    String currentFotoUrl = STATIC_FOTO_URL;

    // Obter timestamp atual do relogio interno do ESP32 (agora sincronizado e com fuso configurado)
    time_t now;
    struct tm timeinfo;
    time(&now);
    localtime_r(&now, &timeinfo); // Converte de UTC para hora local configurada

    char timestampIso[30];
    // O Flask espera YYYY-MM-DDTHH:MM:SSZ (UTC).
    // Se localtime_r ja deu a hora local, precisamos converte-la de volta para UTC para enviar.
    // A forma mais robusta seria pegar o epochTime e adicionar o offset do fuso horario,
    // mas vamos simplificar: o Flask já lida com o 'Z'.
    // A data/hora sera da perspectiva do fuso horario do ESP32 apos a configuracao TZ.
    // Ou seja, o Flask vai registrar o que o ESP32 pensar que e a hora em GMT-3.
    // Se o seu backend espera estritamente UTC para o 'Z', precisariamos de mais logica aqui.
    strftime(timestampIso, sizeof(timestampIso), "%Y-%m-%dT%H:%M:%S-03:00", &timeinfo);

    // Construir o JSON
    StaticJsonDocument<500> jsonDoc;

    jsonDoc["espMec"] = ESP_MAC_ADDRESS;
    jsonDoc["timestamp"] = timestampIso;
    jsonDoc["temperatura"] = simulatedTemperature;
    jsonDoc["umidadeAr"] = simulatedHumidityAr;
    jsonDoc["umidadeSolo1"] = simulatedUmidadeSolo1;
    jsonDoc["umidadeSolo2"] = simulatedUmidadeSolo2;
    jsonDoc["umidadeSolo3"] = simulatedUmidadeSolo3;
    jsonDoc["statusBombaAgua"] = simulatedStatusBombaAgua;
    jsonDoc["statusValvula1"] = simulatedStatusValvula1;
    jsonDoc["statusValvula2"] = simulatedStatusValvula2;
    jsonDoc["statusValvula3"] = simulatedStatusValvula3;
    jsonDoc["urlFoto"] = STATIC_FOTO_URL; // Usando a URL estatica fornecida

    String requestBody;
    serializeJson(jsonDoc, requestBody);

    Serial.print("JSON a ser enviado: ");
    Serial.println(requestBody);

    // Enviar a requisicao POST
    http.begin(client, API_POST_URL_STR.c_str());
    http.addHeader("Content-Type", "application/json");
    http.setConnectTimeout(5000);
    http.setTimeout(10000);

    int httpCode = http.POST(requestBody);
    if (httpCode > 0) {
        Serial.print("Codigo de resposta (POST): ");
        Serial.println(httpCode);
        String resposta = http.getString();
        Serial.println("Resposta do servidor:");
        Serial.println(resposta);
    } else {
        Serial.print("Erro no POST: ");
        Serial.println(http.errorToString(httpCode));
    }
    http.end();
}


void setup() {
    Serial.begin(115200);
    delay(2000);

    connectWiFi();

    // Configura o fuso horario antes de sincronizar, para que localtime_r funcione corretamente
    // Fuso horario para GMT-3 (Brasilia Standard Time), sem horario de verao
    // O primeiro <-03> e o nome da zona de fuso horario (pode ser qualquer string)
    // O segundo 3 e o offset em horas do UTC (3 horas atras do UTC)
    setenv("TZ", "<-03>3", 1);
    tzset(); // Aplica a configuracao do fuso horario

    if (WiFi.status() == WL_CONNECTED) {
      syncTimeWithFlask(); // Agora a hora interna do ESP32 sera GMT-3 apos sync
    }
    Serial.print("MAC Address do ESP32: ");
    Serial.println(WiFi.macAddress());
}

void loop() {
    sendDataToFlask();

    delay(30000); // Envia dados a cada 30 segundos (para testes)
}
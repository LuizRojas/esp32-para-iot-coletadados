// script.js
const API_BASE_URL = 'http://127.0.0.1:5000/api'; // <--- MUDE PARA A URL E PORTA DO SEU BACKEND FLASK!
                                              // Se for rodar em outra maquina: http://<IP_DO_PC>:5000/api
const API_STATUS_URL = 'http://127.0.0.1:5000/api-status'; // URL do status/sincronizacao do relogio

// MAC Address do ESP32 para filtrar dados (substitua pelo MAC real)
const ESP_MAC_ADDRESS = "00:4B:12:8E:71:B8"; // <--- SUBSTITUA PELO MAC REAL DO SEU ESP32

// Arrays para armazenar o histórico dos gráficos
let historicoTemperatura = [];
let historicoUmidadeAr = [];
let historicoUmidadeSolo1 = [];
let historicoUmidadeSolo2 = [];
let historicoUmidadeSolo3 = [];

// Instancias dos graficos
let chartTemperaturaInstance;
let chartUmidadeArInstance;
let chartUmidadeSolo1Instance;
let chartUmidadeSolo2Instance;
let chartUmidadeSolo3Instance;

// Funcao para mudar as abas
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`).classList.add('active');

    // Atualiza os graficos ao mudar para a aba de estatisticas
    if (tabId === 'estatisticas') {
        buscarHistoricoEstufa();
    }
    // Atualiza logs ao mudar para a aba de logs
    if (tabId === 'logs') {
         // Garante que um dispositivo esta selecionado e carrega seus logs
        const selectEsp32 = document.getElementById('select-esp32');
        if (selectEsp32.value) {
            loadLogs(selectEsp32.value);
        }
    }
}

// Função para exibir mensagens (simples, tipo um "toast")
let notificationTimeout;
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');

    // Limpa qualquer timeout existente para a notificação anterior
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Remove a notificação anterior se existir para evitar empilhamento descontrolado
    notificationArea.innerHTML = ''; 

    const notificationItem = document.createElement('div');
    notificationItem.classList.add('notification-item', type);
    notificationItem.textContent = message;
    notificationArea.appendChild(notificationItem);

    // Define um timeout para a notificação sumir
    notificationTimeout = setTimeout(() => {
        notificationItem.classList.add('hidden'); // Adiciona classe para iniciar a transicao
        notificationItem.addEventListener('transitionend', () => notificationItem.remove()); // Remove do DOM apos a transicao
    }, 3000); // 3 segundos
}

// ======================================
// Funcoes para a Aba 'Dispositivos'
// ======================================

async function buscarDadosEstufaAtuais() {
    try {
        const response = await axios.get(`${API_BASE_URL}/sensores/ultima?espMec=${ESP_MAC_ADDRESS}`);
        const dados = response.data; // A API de "ultima" retorna o objeto direto

        document.getElementById('temp-timestamp').textContent = new Date(dados.timestamp).toLocaleString('pt-BR');
        document.getElementById('temp-ar').textContent = dados.temperatura;
        document.getElementById('umid-ar').textContent = dados.umidadeAr;
        document.getElementById('device-esp').textContent = dados.espMec;
        document.getElementById('umid-solo1').textContent = dados.umidadeSolo1;
        document.getElementById('umid-solo2').textContent = dados.umidadeSolo2;
        document.getElementById('umid-solo3').textContent = dados.umidadeSolo3;

        // Atuadores e Camera: Se existirem nos dados retornados (seu backend pode estender isso)
        document.getElementById('status-bomba').textContent = dados.statusBombaAgua || 'N/D';
        document.getElementById('status-valvula1').textContent = dados.statusValvula1 || 'N/D';
        document.getElementById('status-valvula2').textContent = dados.statusValvula2 || 'N/D';
        document.getElementById('status-valvula3').textContent = dados.statusValvula3 || 'N/D';

        if (dados.urlFoto) {
            document.getElementById('camera-image').src = dados.urlFoto;
        } else {
            document.getElementById('camera-image').src = './assets/camera.jpg';
        }

        showNotification('Dados da estufa atualizados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao buscar dados atuais da estufa:', error);
        showNotification('Erro ao carregar dados da estufa. Verifique o backend e CORS.', 'error');
        // Zera os campos se houver erro
        document.getElementById('temp-timestamp').textContent = 'N/D';
        document.getElementById('temp-ar').textContent = 'N/D';
        document.getElementById('umid-ar').textContent = 'N/D';
        document.getElementById('device-esp').textContent = 'N/D';
        document.getElementById('umid-solo1').textContent = 'N/D';
        document.getElementById('umid-solo2').textContent = 'N/D';
        document.getElementById('umid-solo3').textContent = 'N/D';
        document.getElementById('status-bomba').textContent = 'N/D';
        document.getElementById('status-valvula1').textContent = 'N/D';
        document.getElementById('status-valvula2').textContent = 'N/D';
        document.getElementById('status-valvula3').textContent = 'N/D';
        document.getElementById('camera-image').src = './assets/camera.jpg';
    }
}

document.getElementById('btn-atualizar-foto').addEventListener('click', async () => {
    // Apenas buscar os dados novamente para atualizar a imagem, se o URL for diferente
    showNotification('Solicitando atualização da foto...', 'info');
    await buscarDadosEstufaAtuais(); // Rebuscando todos os dados
});

// ======================================
// Funcoes para a Aba 'Estatisticas'
// ======================================

function createOrUpdateChart(chartId, label, data, borderColor, backgroundColor, instance) {
    const ctx = document.getElementById(chartId).getContext('2d');
    if (instance) {
        instance.destroy(); // Destroi a instancia antiga antes de criar uma nova
    }
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.timestamp),
            datasets: [{
                label: label,
                data: data.map(item => item.valor),
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Hora' } },
                y: { beginAtZero: false, title: { display: true, text: 'Valor' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let tooltipLabel = context.dataset.label || '';
                            if (tooltipLabel) { tooltipLabel += ': '; }
                            if (context.parsed.y !== null) {
                                tooltipLabel += new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(context.parsed.y);
                                if (label.includes('Temperatura')) tooltipLabel += ' °C';
                                else if (label.includes('Umidade do Ar')) tooltipLabel += ' %';
                            }
                            return tooltipLabel;
                        }
                    }
                }
            }
        }
    });
}

async function buscarHistoricoEstufa() {
    try {
        const response = await axios.get(`${API_BASE_URL}/sensores?espMec=${ESP_MAC_ADDRESS}`);
        const leituras = response.data;

        // Limpa os dados atuais do historico
        historicoTemperatura = [];
        historicoUmidadeAr = [];
        historicoUmidadeSolo1 = [];
        historicoUmidadeSolo2 = [];
        historicoUmidadeSolo3 = [];

        leituras.forEach(leitura => {
            const timestampFormatado = new Date(leitura.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

            historicoTemperatura.push({ timestamp: timestampFormatado, valor: leitura.temperatura });
            historicoUmidadeAr.push({ timestamp: timestampFormatado, valor: leitura.umidadeAr });
            historicoUmidadeSolo1.push({ timestamp: timestampFormatado, valor: leitura.umidadeSolo1 });
            historicoUmidadeSolo2.push({ timestamp: timestampFormatado, valor: leitura.umidadeSolo2 });
            historicoUmidadeSolo3.push({ timestamp: timestampFormatado, valor: leitura.umidadeSolo3 });
        });

        // Atualiza os graficos
        chartTemperaturaInstance = createOrUpdateChart(
            'chartTemperatura', 'Temperatura do Ar (°C)', historicoTemperatura, 
            'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 0.2)', chartTemperaturaInstance
        );
        chartUmidadeArInstance = createOrUpdateChart(
            'chartUmidadeAr', 'Umidade do Ar (%)', historicoUmidadeAr, 
            'rgba(54, 162, 235, 1)', 'rgba(54, 162, 235, 0.2)', chartUmidadeArInstance
        );
        chartUmidadeSolo1Instance = createOrUpdateChart(
            'chartUmidadeSolo1', 'Umidade do Solo (S1)', historicoUmidadeSolo1, 
            'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', chartUmidadeSolo1Instance
        );
        chartUmidadeSolo2Instance = createOrUpdateChart(
            'chartUmidadeSolo2', 'Umidade do Solo (S2)', historicoUmidadeSolo2, 
            'rgba(255, 159, 64, 1)', 'rgba(255, 159, 64, 0.2)', chartUmidadeSolo2Instance
        );
        chartUmidadeSolo3Instance = createOrUpdateChart(
            'chartUmidadeSolo3', 'Umidade do Solo (S3)', historicoUmidadeSolo3, 
            'rgba(153, 102, 255, 1)', 'rgba(153, 102, 255, 0.2)', chartUmidadeSolo3Instance
        );

        showNotification('Histórico de dados atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao buscar histórico da estufa:', error);
        showNotification('Erro ao carregar histórico da estufa. Verifique o backend e CORS.', 'error');
        // Zera os dados dos graficos em caso de erro
        historicoTemperatura = [];
        historicoUmidadeAr = [];
        historicoUmidadeSolo1 = [];
        historicoUmidadeSolo2 = [];
        historicoUmidadeSolo3 = [];
        if (chartTemperaturaInstance) chartTemperaturaInstance.destroy();
        if (chartUmidadeArInstance) chartUmidadeArInstance.destroy();
        if (chartUmidadeSolo1Instance) chartUmidadeSolo1Instance.destroy();
        if (chartUmidadeSolo2Instance) chartUmidadeSolo2Instance.destroy();
        if (chartUmidadeSolo3Instance) chartUmidadeSolo3Instance.destroy();
    }
}


// ======================================
// Funcoes para a Aba 'Logs'
// ======================================

// Funcao para popular o select de ESP32 (simulada por enquanto)
function popularSelectESP32() {
    const selectEsp32 = document.getElementById('select-esp32');
    // Este array esp32registed deve vir do backend (ex: /api/esp32) em um projeto real
    const esp32registed = [
        { id: "001", name: "ESP32_Alfa", mec: ESP_MAC_ADDRESS }, // Use o MAC real que o seu ESP esta enviando
        { id: "002", name: "ESP32_Beta", mec: "00:11:22:33:44:55" }, // Exemplo
        { id: "003", name: "ESP32_Omega", mec: "FF:EE:DD:CC:BB:AA" } // Exemplo
    ];

    selectEsp32.innerHTML = ''; // Limpa opcoes existentes
    esp32registed.forEach(device => {
        const option = document.createElement('option');
        option.value = device.mec; // O valor sera o MAC Address para a busca
        option.textContent = device.name;
        selectEsp32.appendChild(option);
    });

    // Seleciona o primeiro dispositivo por padrao e carrega seus logs
    if (esp32registed.length > 0) {
        selectEsp32.value = esp32registed[0].mec;
        loadLogs(esp32registed[0].mec); // Carrega logs do primeiro ESP ao iniciar
    }
}

// Funcao para carregar logs do backend
async function loadLogs(espMec) {
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '<p>Carregando logs...</p>'; // Mensagem de carregamento
    document.getElementById('log-device-name').textContent = espMec; // Mostra o MAC do ESP

    try {
        const response = await axios.get(`${API_BASE_URL}/sensores?espMec=${espMec}`);
        const leituras = response.data;

        logsList.innerHTML = ''; // Limpa mensagem de carregamento

        if (leituras.length > 0) {
            // Exibe os logs mais recentes primeiro
            leituras.reverse().forEach(leitura => {
                const logEntry = document.createElement('p');
                const timestamp = new Date(leitura.timestamp).toLocaleString('pt-BR');
                // Mensagem de log com base nos campos que o ESP envia
                let message = `Leitura: Temp ${leitura.temperatura}°C, UmidAr ${leitura.umidadeAr}%`;
                if (leitura.umidadeSolo1 !== undefined) message += `, Solo1 ${leitura.umidadeSolo1}`;
                if (leitura.umidadeSolo2 !== undefined) message += `, Solo2 ${leitura.umidadeSolo2}`;
                if (leitura.umidadeSolo3 !== undefined) message += `, Solo3 ${leitura.umidadeSolo3}`;
                if (leitura.statusBombaAgua) message += `, Bomba: ${leitura.statusBombaAgua}`;
                if (leitura.statusValvula1) message += `, Vlv1: ${leitura.statusValvula1}`;
                if (leitura.statusValvula2) message += `, Vlv2: ${leitura.statusValvula2}`;
                if (leitura.statusValvula3) message += `, Vlv3: ${leitura.statusValvula3}`;
                if (leitura.urlFoto) message += `, Foto: ${leitura.urlFoto.split('/').pop()}`;

                logEntry.textContent = `${timestamp} - ${message}`;
                logsList.appendChild(logEntry);
            });
        } else {
            logsList.innerHTML = '<p>Nenhum log disponível para este dispositivo.</p>';
        }
        showNotification('Logs atualizados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        logsList.innerHTML = '<p style="color: red;">Erro ao carregar logs. Verifique o backend e CORS.</p>';
        showNotification('Erro ao carregar logs.', 'error');
    }
}

// Event Listener para a mudanca no select de ESP32
document.getElementById('select-esp32').addEventListener('change', (event) => {
    loadLogs(event.target.value);
});


// ======================================
// Inicializacao da Pagina
// ======================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a aba de dispositivos
    showTab('dispositivos'); 

    // Carrega os dados atuais da estufa ao carregar a pagina
    buscarDadosEstufaAtuais();

    // Popula o select de ESP32 para a aba de Logs
    popularSelectESP32();

    // Configura atualizacao periodica dos dados da estufa (a cada 10 segundos)
    setInterval(buscarDadosEstufaAtuais, 10000); 
});
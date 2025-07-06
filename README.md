Documentação do Projeto: Sistema de Monitoramento e Automação Remota
1. Proposta do Projeto
O objetivo principal deste projeto é desenvolver um sistema abrangente para o monitoramento de parâmetros ambientais e o controle de dispositivos em um ambiente específico, utilizando tecnologias de baixo custo e acesso remoto. A proposta visa otimizar as condições desse ambiente, garantindo maior eficiência, agilidade na resposta a eventos e possibilitando o acompanhamento em tempo real por parte dos usuários. O projeto se insere no contexto da IoT (Internet das Coisas), buscando aplicar conhecimentos interdisciplinares para uma solução prática e funcional.

2. Problema a ser Solucionado
Atualmente, a gestão de ambientes controlados ou remotos muitas vezes depende de observação manual e intervenções in loco, o que pode levar a:

Ineficiência Operacional: Dificuldade em determinar o momento e a intensidade exata de ações necessárias, resultando em desperdício de recursos ou intervenções inoportunas.

Controle Ambiental Limitado: Falta de dados em tempo real sobre as condições do ambiente, impedindo ações rápidas para ajustar os parâmetros em caso de desvios.

Falta de Monitoramento Remoto: A impossibilidade de acompanhar as condições do ambiente a distância limita a flexibilidade e a agilidade na tomada de decisões, especialmente para locais remotos ou para gestores com múltiplos ambientes.

Ausência de Histórico de Dados: Sem o registro sistemático das leituras dos sensores, é difícil identificar padrões, otimizar processos ou diagnosticar problemas a longo prazo.

Verificação Visual Subjetiva: A dependência da inspeção visual para avaliar o estado do ambiente pode atrasar a identificação de anomalias.

3. Solução Proposta
A solução consiste na implementação de um sistema integrado de hardware e software, que permite o monitoramento de parâmetros críticos do ambiente e a automação de ações de forma remota.

3.1. Componentes da Solução:

Hardware (Dispositivo Embarcado):

ESP32: Atua como o "cérebro" do sistema embarcado, responsável pela coleta de dados e comunicação.


Sensores: Incluem sensores de temperatura e umidade do ar, e para monitorar o nível de umidade em múltiplos pontos (e.g., três sensores de umidade do solo).


Atuadores: Dispositivos como uma bomba e válvulas solenoides para intervenções diretas no ambiente.



Câmera (ESP32-CAM): Para captura periódica de imagens do ambiente, permitindo a verificação visual remota.

Software:

Backend (Python com Flask):

Recebe dados de sensores e status de atuadores do dispositivo embarcado via requisições HTTP POST (

/api/sensores/registrar).

Armazena essas leituras para acesso histórico.

Disponibiliza os dados coletados e o histórico através de uma API RESTful para o frontend (via requisições HTTP GET, e.g., 

/api/sensores, /api/sensores?espMec={mec}).


Fornece um endpoint para sincronização de tempo (

/api-status).

Gerencia o registro de dispositivos ESP32 (

/api/esp32).

Frontend (HTML, CSS, JavaScript Puro):

Interface web acessível via navegador para visualização remota dos dados.

Aba "Dispositivos": Exibe as leituras atuais dos sensores (temperatura do ar, umidade do ar, umidade do solo 1, 2 e 3), e o status dos atuadores (bomba e válvulas). Permite "atualizar foto" para buscar a última imagem disponível no servidor.

Aba "Estatísticas": Apresenta gráficos de linha para o histórico dos sensores de umidade (solo 1, 2 e 3), permitindo a análise de tendências e a otimização das condições ambientais.

Aba "Logs": Exibe um registro cronológico das leituras dos sensores e eventos reportados pelo dispositivo embarcado, com a capacidade de filtrar por dispositivo.

3.2. Funcionamento Básico:

Periodicamente (e.g., a cada 5 minutos), o dispositivo embarcado lê os sensores e envia esses dados para o backend via HTTP POST.


O backend registra e armazena os dados.

O frontend web consulta o backend via HTTP GET para buscar os dados atuais e o histórico, apresentando-os nas respectivas abas.

O backend pode, com base nas regras de automação (e.g., umidade do solo baixa e temperatura segura), acionar os atuadores. 

(Nota: O frontend atual apenas exibe o status reportado pelos atuadores, não os controla diretamente).
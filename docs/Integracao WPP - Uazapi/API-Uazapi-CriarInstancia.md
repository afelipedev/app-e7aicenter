Conectar instância ao WhatsApp
Inicia o processo de conexão de uma instância ao WhatsApp. Este endpoint:

Requer o token de autenticação da instância
Recebe o número de telefone associado à conta WhatsApp
Gera um QR code caso não passe o campo phone
Ou Gera código de pareamento se passar o o campo phone
Atualiza o status da instância para "connecting"
O processo de conexão permanece pendente até que:

O QR code seja escaneado no WhatsApp do celular, ou
O código de pareamento seja usado no WhatsApp
Timeout de 2 minutos para QRCode seja atingido ou 5 minutos para o código de pareamento
Use o endpoint /instance/status para monitorar o progresso da conexão.

Estados possíveis da instância:

disconnected: Desconectado do WhatsApp
connecting: Em processo de conexão
connected: Conectado e autenticado
Sincronização e armazenamento de mensagens:

Todas as mensagens recebidas da Meta durante a sincronização da conexão (leitura do QR code) são enviadas no evento history do webhook.
As mensagens dos últimos 7 dias são armazenadas no banco de dados e ficam acessíveis pelos endpoints: POST /message/find e POST /chat/find.
Depois que a instância conecta, todas as mensagens enviadas ou recebidas são armazenadas no banco de dados.
Mensagens mais antigas do que 7 dias são excluídas durante a madrugada.
Exemplo de requisição:

{
  "phone": "5511999999999"
}
Request
Body
phone
string
Número de telefone no formato internacional (ex: 5511999999999). Se informado, gera código de pareamento. Se omitido, gera QR code.

Example: "5511999999999"

requisicoes:
POST /instance/connect

EXEMPLO DE CURL:
https://free.uazapi.com/instance/connect
curl --request POST \
  --url https://free.uazapi.com/instance/connect \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "phone": "5511999999999"
}'

RESPONSES:
200 - SUCESSO
curl --request POST \
  --url https://free.uazapi.com/instance/connect \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "phone": "5511999999999"
}'

401 - TOKEN INVALIDO/EXPIRADO
No response body for this status code.

404 - INSTANCIA NAO ENCONTRADA
No response body for this status code.

429 - LIMITE DE CONEXOES SIMULTANEAS ATINGIDO
No response body for this status code.

500 - ERRO INTERNO
No response body for this status code.
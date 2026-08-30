GET /instance/status

Verificar status da instância
Retorna o status atual de uma instância, incluindo:

Estado da conexão (disconnected, connecting, connected)
QR code atualizado (se em processo de conexão)
Código de pareamento (se disponível)
Informações da última desconexão
Detalhes completos da instância
Este endpoint é particularmente útil para:

Monitorar o progresso da conexão
Obter QR codes atualizados durante o processo de conexão
Verificar o estado atual da instância
Identificar problemas de conexão
Estados possíveis:

disconnected: Desconectado do WhatsApp
connecting: Em processo de conexão (aguardando QR code ou código de pareamento)
connected: Conectado e autenticado com sucesso


# EXEMPLO DE cURL
GET https://free.uazapi.com/instance/status

curl --request GET \
  --url https://free.uazapi.com/instance/status \
  --header 'Accept: application/json'

# RESPONSES

SUCESSO - 200
{
  "instance": {
    "id": "i91011ijkl",
    "token": "abc123xyz",
    "status": "connected",
    "paircode": "1234-5678",
    "qrcode": "data:image/png;base64,iVBORw0KGg...",
    "name": "Instância Principal",
    "profileName": "Loja ABC",
    "profilePicUrl": "https://example.com/profile.jpg",
    "isBusiness": true,
    "plataform": "Android",
    "systemName": "uazapi",
    "owner": "user@example.com",
    "lastDisconnect": "2025-01-24T14:00:00Z",
    "lastDisconnectReason": "Network error",
    "adminField01": "custom_data",
    "openai_apikey": "sk-...xyz",
    "chatbot_enabled": true,
    "chatbot_ignoreGroups": true,
    "chatbot_stopConversation": "parar",
    "chatbot_stopMinutes": 60,
    "created": "2025-01-24T14:00:00Z",
    "updated": "2025-01-24T14:30:00Z",
    "currentPresence": "available"
  },
  "status": {
    "connected": false,
    "loggedIn": false,
    "jid": null
  }
}

401 - TOKEN INVALIDO/EXPIRADO
{
  "error": "instance info not found"
}

404 - INSTANCIA NAO ENCONTRADA
No response body for this status code.


500 - ERRO INTERNO
No response body for this status code.
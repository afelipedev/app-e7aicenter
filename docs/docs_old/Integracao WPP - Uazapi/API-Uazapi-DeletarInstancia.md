POST /instance/disconnect

Desconectar instância
Desconecta a instância do WhatsApp, encerrando a sessão atual. Esta operação:

Encerra a conexão ativa

Requer novo QR code para reconectar

Diferenças entre desconectar e hibernar:

Desconectar: Encerra completamente a sessão, exigindo novo login

Hibernar: Mantém a sessão ativa, apenas pausa a conexão

Use este endpoint para:

Encerrar completamente uma sessão

Forçar uma nova autenticação

Limpar credenciais de uma instância

Reiniciar o processo de conexão

Estados possíveis após desconectar:

disconnected: Desconectado do WhatsApp

connecting: Em processo de reconexão (após usar /instance/connect)

# Exemplo de cURL

POST https://free.uazapi.com/instance/disconnect

curl --request POST \
  --url https://free.uazapi.com/instance/disconnect \
  --header 'Accept: application/json'


# RESPONSES

200 - SUCESSO
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
  "response": "Disconnected",
  "info": "The device has been successfully disconnected from WhatsApp. A new QR code will be required for the next connection."
}

401 - TOKEN INVALIDO/EXPIRADO
No response body for this status code.

404 - INSTANCIA NAO ENCONTRADA
No response body for this status code.


500 - ERRO INTERNO
No response body for this status code.

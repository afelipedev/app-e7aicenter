POST
/instance/updateInstanceName
Atualizar nome da instância
Atualiza o nome de uma instância WhatsApp existente. O nome não precisa ser único.

Request
Body
name
string
required
Novo nome para a instância

Example: "Minha Nova Instância 2024!@#"

# EXEMPLO DE cURL
POST https://free.uazapi.com/instance/updateInstanceName

curl --request POST \
  --url https://free.uazapi.com/instance/updateInstanceName \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "name": "Minha Nova Instância 2024!@#"
}'

# RESPONSES

200 - SUCESSO
{
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
}

401 - TOKEN INVALIDO/EXPIRADO
No response body for this status code.

404 - INSTANCIA NAO ENCONTRADA
No response body for this status code.


500 - ERRO INTERNO
No response body for this status code.
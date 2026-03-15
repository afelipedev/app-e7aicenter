Autenticação
A Judit API usa autenticação baseada em API Key para garantir acesso seguro aos recursos. Este guia explica como obter, configurar e usar sua chave de API corretamente.

Configuração da API Key
​
Método de Autenticação
A API Key deve ser enviada no header api-key de todas as requisições:

GET /requests
Host: requests.prod.judit.io
api-key: sua-api-key-aqui
Content-Type: application/json

Exemplos de Configuração
cURL:
# Definir variável de ambiente
export JUDIT_API_KEY="sua-api-key-aqui"

# Usar em requisições
curl -X GET "https://requests.prod.judit.io/requests" \
  -H "api-key: $JUDIT_API_KEY" \
  -H "Content-Type: application/json"

Javascript:
// Configurar API Key
const apiKey = process.env.JUDIT_API_KEY;

// Headers padrão
const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json'
};

// Fazer requisição
const response = await fetch('https://requests.prod.judit.io/requests', {
    method: 'GET',
    headers: headers
});

Boas Práticas de Segurança
​
1. Use Variáveis de Ambiente
Nunca hardcode sua API Key no código:

# ❌ ERRADO - Nunca faça isso
api_key = "sk_live_1234567890abcdef"

# ✅ CORRETO - Use variáveis de ambiente
api_key = os.getenv('JUDIT_API_KEY')

2. Arquivo .env (Desenvolvimento)
# .env
JUDIT_API_KEY=sua-api-key-aqui
JUDIT_BASE_URL=https://requests.prod.judit.io

4. Rotação de Chaves
Monitore o uso de sua API Key regularmente
Solicite nova chave se suspeitar de comprometimento
Implemente rotação implementação em ambientes críticos
​
Tratamento de Erros de Autenticação
​
Erro 401 - Unauthorized
{
  "error": {
        "name": "HttpUnauthorizedError",
        "message": "UNAUTHORIZED",
        "data": "USER_NOT_FOUND"
    }
}

Possíveis causas:
API Key não fornecida
API Key inválida ou expirada
Header api-key mal formatado
​
Erro 403 - Forbidden
{
  "error": "Forbidden",
  "message": "Acesso negado para este recurso",
  "code": "INSUFFICIENT_PERMISSIONS"
}

Possíveis causas:
API Key válida mas sem permissão para o recurso
Limite de uso excedido
Recurso não disponível no seu plano
​
Validação da API Key
​
Teste de Conectividade
import requests

def test_api_key(api_key):
    """Testa se a API Key está válida"""
    headers = {'api-key': api_key}
    
    try:
        response = requests.get(
            'https://requests.prod.judit.io/requests',
            headers=headers,
            params={'page': 1, 'page_size': 1}
        )
        
        if response.status_code == 200:
            print("✅ API Key válida")
            return True
        elif response.status_code == 401:
            print("❌ API Key inválida")
            return False
        else:
            print(f"⚠️ Erro inesperado: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Erro de conexão: {e}")
        return False

# Usar a função
api_key = os.getenv('JUDIT_API_KEY')
test_api_key(api_key)

Monitoramento de Uso
def check_api_usage(response):
    """Monitora uso da API através dos headers"""
    
    # Rate limit info
    limit = response.headers.get('X-RateLimit-Limit')
    remaining = response.headers.get('X-RateLimit-Remaining')
    reset = response.headers.get('X-RateLimit-Reset')
    
    if limit and remaining:
        usage_percent = ((int(limit) - int(remaining)) / int(limit)) * 100
        
        print(f"Uso da API: {usage_percent:.1f}%")
        print(f"Requisições restantes: {remaining}")
        
        if usage_percent > 80:
            print("⚠️ Próximo do limite de rate limit!")

Configuração por Ambiente
# config/production.py
import os

API_KEY = os.getenv('JUDIT_API_KEY')
BASE_URL = 'https://requests.prod.judit.io'
TIMEOUT = 10
RETRY_ATTEMPTS = 3


Classe de Configuração
class JuditConfig:
    def __init__(self, environment='production'):
        self.environment = environment
        self.api_key = self._get_api_key()
        self.base_url = 'https://requests.prod.judit.io'
        
    def _get_api_key(self):
        key_name = f'JUDIT_API_KEY_{self.environment.upper()}'
        api_key = os.getenv(key_name)
        
        if not api_key:
            raise ValueError(f"API Key não encontrada: {key_name}")
            
        return api_key
    
    @property
    def headers(self):
        return {
            'api-key': self.api_key,
            'Content-Type': 'application/json'
        }

# Uso
config = JuditConfig('production')
response = requests.get(f"{config.base_url}/requests", 
    headers=config.headers)
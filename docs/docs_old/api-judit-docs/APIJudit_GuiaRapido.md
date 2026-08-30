Guia Rápido
Tutorial completo para fazer sua primeira consulta na Judit API

​
Fluxo Básico
A Judit API funciona com um padrão síncrono e assíncrono:
​
Requisições com padrão assíncrono:
Criar requisição (POST /requests) - Inicia a consulta
Aguardar processamento (GET /requests) - A API busca os dados nos tribunais(Acompanhar status)
Consultar resultado (GET /responses) - Obtém os dados processados
​
Requisições com padrão síncrono:
Criar requisição (POST /lawsuits) - Inicia a consulta e já entrega a resposta
​
Pré-requisitos
API Key válida
Ferramenta para fazer requisições HTTP (cURL, Postman, ou código)

Exemplo Completo
​
1. Configurar Variáveis de Ambiente
export JUDIT_API_KEY="sua-api-key-aqui"
export JUDIT_BASE_URL="https://requests.prod.judit.io"

2. Criar uma Requisição

cURL:
curl -X POST "$JUDIT_BASE_URL/requests" \
  -H "api-key: $JUDIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "search": {
      "search_type": "cpf",
      "search_key": "999.999.999-99",
      "cache_ttl_in_days": 7
    }
  }'

Javascript:

const apiKey = process.env.JUDIT_API_KEY;
const baseUrl = process.env.JUDIT_BASE_URL;

const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json'
};

// Criar requisição
const payload = {
    search: {
        search_type: 'cpf',
        search_key: '999.999.999-99',
        cache_ttl_in_days: 7
    }
};

const response = await fetch(`${baseUrl}/requests`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
});

const requestData = await response.json();
const requestId = requestData.request_id;

console.log(`Requisição criada: ${requestId}`);

3. Verificar Status da Requisição

cURL:
curl -X GET "$JUDIT_BASE_URL/requests/$REQUEST_ID" \
  -H "api-key: $JUDIT_API_KEY"

Javascript:
  // Verificar status
let statusResponse = await fetch(`${baseUrl}/requests/${requestId}`, {
    headers: headers
});

let statusData = await statusResponse.json();
console.log(`Status: ${statusData.status}`);

// Aguardar conclusão
while (['pending', 'processing'].includes(statusData.status)) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
    
    statusResponse = await fetch(`${baseUrl}/requests/${requestId}`, {
        headers: headers
    });
    statusData = await statusResponse.json();
    console.log(`Status: ${statusData.status}`);
}

4. Obter Resultados
Quando o status for completed, consulte os resultados:

cURL:
curl -X GET "$JUDIT_BASE_URL/responses?page=1" \
  -H "api-key: $JUDIT_API_KEY"

Javascript:
// Obter resultados
if (statusData.status === 'completed') {
    const resultsResponse = await fetch(`${baseUrl}/responses?page=1`, {
        headers: headers
    });
    const results = await resultsResponse.json();
    
    console.log('Processos encontrados:');
    results.page_data?.forEach(item => {
        console.log(`- ${JSON.stringify(item)}`);
    });
}

Tipos de Consulta Disponíveis:

Por CPF:
{
  "search": {
    "search_type": "cpf",
    "search_key": "999.999.999-99"
  }
}

Por CNPJ:
{
  "search": {
    "search_type": "cnpj",
    "search_key": "999.999/99999-99"
  }
}

Por OAB:
{
  "search": {
    "search_type": "oab",
    "search_key": "999999-SP
  }
}

Por CNJ:
{
  "search": {
    "search_type": "lawsuit_cnj",
    "search_key": "9999999-99.9999.9.99.9999"
  }
}

Por NOME:
{
  "search": {
    "search_type": "name",
    "search_key": "Nome teste"
  }
}

Tipos de Resposta
parties: Apenas informações das partes
attachments: Lista de anexos disponíveis
step: Movimentações processuais

Filtros Avançados
Para consultas mais específicas por documento, é possivel utilizar filtros:

{
  "search": {
    "search_type": "cpf",
    "search_key": "999.999.999-99",
    "search_params": {
      "filter": {
        "side":"passive",
        "amount_gte": 10000,
        "distribution_date_gte": "2024-10-10T00:00:00.000Z",
        "tribunals": {
          "keys": ["TJSP", "TJRJ"],
          "not_equal": false
        }
      }
    }
  }
}

Boas Práticas
​
1. Use Cache Inteligente
Configure cache_ttl_in_days para evitar consultas desnecessárias: Esse campo define por quantos dias um resultado armazenado em cache será considerado válido antes de uma nova consulta ser feita.
{
  "cache_ttl_in_days": 7  // Usar cache por até 7 dias
}

2. Implemente Retry com Backoff

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  } // Função setTimeout auxiliar de pausa baseada em setTimeout (nativa do JavaScript)

  async function retryWithBackoff(func, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error; // Última tentativa falhou, propaga o erro
        }

        // Backoff exponencial + jitter aleatório
        const waitTime = (2 ** attempt) * 1000 + Math.random() * 1000;
        console.log(
          `Tentativa ${attempt + 1} falhou. Aguardando ${waitTime.toFixed(0)}ms antes de tentar novamente...`
        );
        await sleep(waitTime);
      }
    }
  }

  
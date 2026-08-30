A judit trabalha com custo mensal fixo, sendo o plano minimo R$ 1000.00 por mes, o que foi contratado. 
Esse valor é convertido em saldo para as requisições e conforme o valor unitario das requisições for consumido, vai debitando do saldo. Se o saldo acabar, a  API continua funcional porém eles geram uma cobrança adicional. 
O plano de 1.000,00 se extende o adicional até 5.000,00 ou seja, se consumir extra chegando até 5.000,00, ai sim a API para.

Tabela de preços /mes:
Consulta processual - R$ 0,25 ate 4.000 transações 
Consulta Histórica (Data Lake) - R$ 1,50 ate 667 transações
Consulta histórica (On Demand) - R$ 6,00 ate 167 transações (Cobrança a cada 1.000 processos retornados)
Autos processuais (Anexos) - R$ 3,50 ate 286 transações
Monitoramento processual - R$ 1,50 ate 667 transações
Monitoramento de novas ações - R$ 15,000 ate 67 transações
Monitoramento customizado (Permite encontrar processos utilizando filtros • Retorno via Relatório ou View Customizada) - R$ 100,00 ate 10 transações + R$ 0,25 por processo capturado
Mandado de prisão - R$ 1,00 ate 1.000 transações
Execuçao criminal - R$ 0,50 ate 2.0000 transações
Dados cadastrais (Data Lake) - R$ 0,12 ate 8.333 transações
Dados cadastrais (On Demand) - R$ 0,15 ate 6.667 transações
Consulta histórica sintética - R$ 0,75 ate 1.333 transações
Consulta histórica simples (Contador) - R$ 0,50 ate 2.000 transações
Resumo de processo (IA) - R$ 0,10 ate 10.000 transações
Resumio de entidade (IA) - R$ 0,15 ate 6.667 transações



API KEY: 609d3625-1671-4890-b101-971305fefe55
Inclua a API KEY no arquivo .ENV

Orientaçoes para a integraçao de relatório de consumo da API Judit:

referencia: https://docs.judit.io/resource/consumption#1-como-consultar-o-hist%C3%B3rico-via-postman-usando-curl

Como consultar meu histórico de requisições realizadas pela API JUDIT
Este passo a passo irá te mostrar como consultar o histórico de requisições realizadas por meio da API JUDIT. Com isso, você poderá visualizar detalhes como:
Tipo de busca realizada
Período
Presença de anexos
Origem da requisição (monitoramento ou API)
E inclusive inferir o custo de cada operação.


1. Como consultar o histórico via Postman (usando cURL)
Para realizar a requisição:
Copie o seguinte comando cURL e cole no Postman (modo Raw no Body e tipo POST):

curl --location 'https://requests.prod.judit.io/requests?page_size=100&created_at_gte=<DATA INICIAL>&created_at_lte=<DATA FINAL>' \
--header 'api-key: INSIRA_SUA_API_KEY_AQUI' \
--header 'Content-Type: application/json' \
--data ''

Substitua <DATA INICIAL> e <DATA FINAL> no formato YYYY-MM

-DD, por exemplo:
created_at_gte=2026-03-15&created_at_lte=2026-03-17


2. Como consultar o histórico via JavaScript (fetch)
Exemplo de código:

const url = 'https://requests.prod.judit.io/requests?page_size=1000&created_at_gte=2024-09-12&created_at_lte=2050-09-12';
const options = {
  method: 'GET',
  headers: {
    'api-key': '<INSIRA_SUA_API_KEY_AQUI>'
  }
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}

3. Exemplo de resposta da API
Trecho de exemplo:

{
  "page": 1,
  "page_data": [
    {
      "request_id": "0dcd4c1f-c9bf-4327-899e-0550a627feca",
      "search": {
        "on_demand": false,
        "search_type": "lawsuit_cnj",
        "search_key": "0000999-99.9999.9.99.9999",
        "response_type": "lawsuit",
        "search_params": {
          "public_search": false,
          "filter": {
            "party_names": [],
            "party_documents": []
          },
          "pagination": {}
        }
      },
      "with_attachments": true,
      "origin": "tracking",
      "status": "completed",
      "created_at": "2025-07-25T21:10:03.334Z",
      "updated_at": "2025-07-25T21:10:25.352Z"
    }
  ]
}

4. Explicação dos principais campos
Campo	Significado
origin	Pode ser api (requisição direta) ou tracking (monitoramento automático).
response_type	Tipo de retorno: lawsuit, entity, warrant, lawsuits.
search.search_type	Tipo de busca: cpf, cnpj, oab, name, lawsuit_cnj.
on_demand	Se true, indica consulta em tempo real no tribunal.
with_attachments	Se true, foram incluídos autos processuais (impacta no custo).

 Interpretação dos campos

origin
Esse campo indica a origem da requisição, podendo assumir os seguintes valores:
api: consulta realizada diretamente por meio da API.
tracking: consulta realizada via monitoramento (recorrente).


response_type
Define o tipo de documento que será retornado na busca. As possibilidades incluem:
lawsuit: utilizado em consultas por NUP (Número Único do Processo).
lawsuits: utilizado em buscas por CPF, CNPJ, OAB ou NAME, retornando uma lista de processos.
entity: utilizado em busca cadastral (por CPF, CNPJ, etc).
warrant: utilizado em busca por mandado de prisão.

Exemplo real e análise de precificação
{
  "request_id": "c2af614a-8296-4060-bf9a-3b087679c472",
  "search": {
    "on_demand": true,
    "search_type": "lawsuit_cnj",
    "search_key": "0000999-99.9999.9.99.9999",
    "response_type": "lawsuit",
    "search_params": {
      "public_search": false,
      "filter": {
        "party_names": [],
        "party_documents": []
      },
      "pagination": {}
    }
  },
  "with_attachments": true,
  "callback_url": "https://webhook.site/...",
  "origin": "tracking",
  "status": "completed",
  "created_at": "2025-07-25T21:10:03.334Z"
}

Análise da precificação com base nos campos:
origin: tracking → é uma consulta através de monitoramento, portanto cobrança mensal.
search_type: lawsuit_cnj → o monitoramento é processual por número CNJ.
on_demand: true → como se trata de monitoramento, esse valor sempre será true já que todo monitoramento é on-demand.
with_attachments: true → autos processuais foram coletados, o que implica cobrança adicional.
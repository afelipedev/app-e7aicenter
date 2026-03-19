## DOC DE REFERENCIA DA API JUDIT

# ENDPOINTS

# REQUESTS:

POST - CRIAR UMA REQUISIÇÃO

Criar uma requisição
Esse endpoint cria uma requisição de processos por documento(CPF, CNPJ, OAB) ou Código CNJ
https://requests.prod.judit.io/requests

-- CRIAR UMA REQUISIÇAO: 

curl --request POST \
  --url https://requests.prod.judit.io/requests \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "response_type": "<string>",
    "cache_ttl_in_days": 123,
    "should_search_branches": true,
    "search_params": {
      "lawsuit_instance": 123,
      "masked_response": "<string>",
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        }
      },
      "credential": {
        "customer_key": "<string>"
      }
    }
  }
}
'

-- RESPONSE:
{
    "request_id": "71adfaa6-5485-45ce-a4a1-00d485f8f0f9",
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0010137-92.2023.5.03.0077",
        "search_params": {},
    },
    "origin": "api",
    "origin_id": "fde89d98-b2b1-4c58-b0b7-13f4f96bba3d",
    "status": "pending",
    "tags": {},
    "created_at": "2023-10-18T18:36:58.775Z",
    "updated_at": "2023-10-18T18:36:58.775Z"
}


-- PROPERTIES

search - objetc

search_type
string required
Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;

search_key
string required
Número do processo (Código CNJ), CPF, CNPJ ou OAB;


response_type
string
Define o tipo de retorno dos dados da busca: “lawsuit”, “parties”, “attachments”, “step” ou “lawsuits”;


cache_ttl_in_days
integer
Define até quantos dias o resultado da busca pode considerar um cache válido;


should_search_branches
boolean
Será criada uma requisição para cada filial vinculada ao CNPJ informado. Todas as requisições geradas serão associadas à requisição original por meio do campo origin_id.


search_params
object
    lawsuit_instance
    integer
    Define a instância em que deseja buscar o processo;


    masked_response
    string
    Define se a resposta virá minificada. Este parâmetro é utilizado exclusivamente para consultas simples ou completas por documento.


    filter
    object
        Child attributes:
            side
            string
            Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;


            distribution_date_gte
            date
            Retorna buscas com a data de distribuição maior ou igual a informada;

            amount_gte
            number
            Retorna buscas com o valor da causa maior que o valor passado


            amount_lte
            number
            Retorna buscas com o valor da causa menor que o valor passado

            tribunals
            object
                Child attributes:
                    keys
                    array
                    Filtra processos com estes códigos ou não
                    ​
                    not_equal
                    boolean
                    Determina se o filtro será por processos que contém ou não contém os código passados

            subject_codes
            object        
                Child attributes:
                    keys
                    array
                    Filtra processos com estes códigos ou não
                    ​
                    not_equal
                    boolean
                    Determina se o filtro será por processos que contém ou não contém os código passados

            classification_codes
            object
                Child attributes:
                keys
                array
                Filtra processos com estes códigos ou não
                ​
                not_equal
                boolean
                Determina se o filtro será por processos que contém ou não contém os código passados    
            
            credential
            object
                ​
            customer_key
            string
            Permite passar a chave do cliente para acessar o cofre de credencial correto. Se não for passado a API tentará encontrar uma credencial cadastrada com a customer_key vazia;    

-- AUTORIZATIONS
 
api-key
string header required          

-- BODY - Body
application/json

search
object
    Child attributes:
        search.search_type
        string , required
        Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;


        search.search_key
        string , required
        Número do processo (Código CNJ), CPF, CNPJ ou OAB;


        search.response_type
        string
        Define o tipo de retorno dos dados da busca: “lawsuit”, “parties”, “attachments”, “step” ou “lawsuits”;

        search.cache_ttl_in_days
        integer
        Define até quantos dias o resultado da busca pode considerar um cache válido;

        search.should_search_branches
        boolean
        Será criada uma requisição para cada filial vinculada ao CNPJ informado. Todas as requisições geradas serão associadas à requisição original por meio do campo origin_id .

        search.search_params
        object
            Child Attributes:
                search.search_params.lawsuit_instance
                integer
                Define a instância em que deseja buscar o processo;

                ​
                search.search_params.masked_response
                string
                Define se a resposta virá minificada. Este parâmetro é utilizado exclusivamente para consultas simples ou completas por documento.
                ​
                search.search_params.filter
                object
                    Child Attributes:
                    search.search_params.filter.side
                    string
                    Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;

                    ​
                    search.search_params.filter.distribution_date_gte
                    string
                    Retorna buscas com a data de distribuição maior ou igual a informada;

                    ​
                    search.search_params.filter.amount_gte
                    number
                    Retorna buscas com o valor da causa maior que o valor passado

                    ​
                    search.search_params.filter.amount_lte
                    number
                    Retorna buscas com o valor da causa menor que o valor passado

                    search.search_params.filter.tribunals
                    object
                        Child Attributes: 
                        search.search_params.filter.tribunals.keys
                        object[]
                        Filtra processos com estes códigos ou não
 ​
                        search.search_params.filter.tribunals.not_equal
                        boolean
                        Determina se o filtro será por processos que contém ou não contém os código passados
                    
                    search.search_params.filter.subject_codes
                    object
                        Child Attributes:
                        search.search_params.filter.subject_codes.keys
                        object[]
                        Filtra processos com estes códigos ou não

                        search.search_params.filter.subject_codes.not_equal
                        boolean
                        Determina se o filtro será por processos que contém ou não contém os código passados        
              
                    search.search_params.filter.classification_codes
                    object          
                        Child Attributes:
                        search.search_params.filter.classification_codes.keys
                        object[]
                        Filtra processos com estes códigos ou não

                        ​
                        search.search_params.filter.classification_codes.not_equal
                        boolean
                        Determina se o filtro será por processos que contém ou não contém os código passados

                    search.search_params.credential
                    object
                        Child Attributes:
                        search.search_params.credential.customer_key
                        string
                        Permite passar a chave do cliente para acessar o cofre de credencial correto. Se não for passado a API tentará encontrar uma credencial cadastrada com a customer_key vazia;

GET - CONSULTAR POR REQUEST_ID
Esse endpoint retorna os processos de um documento ou próprio processo. No caso de documento, retornaremos as capas dos processos. No caso dos processos retornaremos ele completo.

https://requests.prod.judit.io/requests/{request_id}

-- Consulta por request_id
curl --request GET \
  --url https://requests.prod.judit.io/requests/{request_id} \
  --header 'api-key: <api-key>'

-- Response
{
    "request_id": "71adfaa6-5485-45ce-a4a1-00d485f8f0f9",
    "search": {
        "search_type": "lawsuit_cnj",
        "search_key": "0010137-92.2023.5.03.0077",
        "search_params": {},
    },
    "origin": "api",
    "origin_id": "fde89d98-b2b1-4c58-b0b7-13f4f96bba3d",
    "user_id": "5ccba00e-1563-4418-91a4-c164b9f02411",
    "status": "pending",
    "tags": {},
    "created_at": "2023-10-18T18:36:58.775Z",
    "updated_at": "2023-10-18T18:36:58.775Z"
}


request_id
string, required
O ID da busca que você deseja consultar.

Authorizations
api-key
string, header, required

Path Parameters
request_id
string, required
O ID da busca que você deseja consultar.


GET - CONSULTAR REQUISIÇÕES CRIADAS
Esse endpoint consulta as requisições realizadas por parâmetros de forma paginada
https://requests.prod.judit.io/requests

-- Consultar requisições criadas
curl --request GET \
  --url https://requests.prod.judit.io/requests \
  --header 'api-key: <api-key>'

Response:  
{
    "page": "1",
    "page_data":[
    {
        "request_id":"3e7f5d47-e7e7-4ae7-a378-21b83a78888c",
        "search":{
            "search_type":"cpf",
            "search_key":"01262577608",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"aa58f5fa-0432-40f3-a551-3fd4743cb881",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"pending",
        "created_at":"2023-10-05T17:59:11.234Z",
        "updated_at":"2023-10-05T17:59:11.234Z"
    },
    {
        "request_id":"1b954b56-aabc-4d8e-af0e-3032de522633",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params":  {}
        },
        "origin":"api",
        "origin_id":"9f8b1d34-2cfe-4a4e-8da2-0cb70c02282c",
        "user_id":"82082593-c664-4d7b-b174-2f0dc4791daf",
        "status":"completed",
        "created_at":"2023-10-05T18:12:36.331Z",
        "updated_at":"2023-10-05T18:14:12.867Z"
    },
    {
        "request_id":"b16ee08e-2169-4594-8bf4-ff528b5b5b72",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params":  {}
        },
        "origin":"api",
        "origin_id":"cefb6df5-bb97-4751-9d34-8f6f3fe6f6b7",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:13:28.266Z",
        "updated_at":"2023-10-05T18:13:39.988Z"
    },
    {
        "request_id":"08444130-44c9-4e09-b11d-2bc35a2e3d8a",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params":  {}
        },
        "origin":"api",
        "origin_id":"8a3a651d-27cc-400a-bd42-8f4f92d49bf9",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:15:07.209Z",
        "updated_at":"2023-10-05T18:15:08.187Z"
    },
    {
        "request_id":"83c50e89-d7dc-44ae-b45d-675268afb636",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params":  {}
        },
        "origin":"api",
        "origin_id":"f35f2dfb-e55c-4844-8537-a7ddd2c3c0f6",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:15:20.042Z",
        "updated_at":"2023-10-05T18:15:20.407Z"
    },
    {
        "request_id":"d5ea333b-dfb5-4026-bba9-cc13e11193a8",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"1ce22c18-c30a-4178-b9f5-ba6dc2028319",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:19:49.285Z",
        "updated_at":"2023-10-05T18:19:50.226Z"
    },
    {
        "request_id":"d9e34f6b-5598-491b-844f-09811f03f9b9",
        "search":{
            "search_type":"lawsuit_cnj",
            "search_key":"0027400-51.2009.5.03.0135",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"4366966b-6486-453f-b37a-fdc547289bae",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:26:59.283Z",
        "updated_at":"2023-10-05T18:27:03.765Z"
    },
    {
        "request_id":"eff4bb00-b7c8-4c78-8196-ff89ffe398e6",
        "search":{
            "search_type":"cpf",
            "search_key":"01262577608",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"23486b66-37ae-40d6-883d-bfdfc2d1de7f",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:28:34.028Z",
        "updated_at":"2023-10-05T18:29:48.945Z"
    },
    {
        "request_id":"317b098b-9ca8-416e-a04e-85260682095a",
        "search":{
            "search_type":"cpf",
            "search_key":"01262577608",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"9deb5092-bd29-46b3-9cfe-3e50828f16c8",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:44:05.048Z",
        "updated_at":"2023-10-05T18:44:19.251Z"
    },
    {
        "request_id":"1272d6a9-53f0-4219-99e9-bca7ca6f5823",
        "search":{
            "search_type":"cpf",
            "search_key":"01262577608",
            "search_params": {}
        },
        "origin":"api",
        "origin_id":"e3e8d647-0198-472d-bc13-9674b9fec02b",
        "user_id":"c0573c15-219b-4a46-acc2-f9225b29c51e",
        "status":"completed",
        "created_at":"2023-10-05T18:56:40.807Z",
        "updated_at":"2023-10-05T18:56:55.340Z"
    }
    ],
    "page_count":10,
    "all_count":47,
    "all_pages_count":5
}

page
integer
Define a página dos resultados que você deseja consultar.
​
page_size
integer
Define o número máximo de resultados que você deseja receber por página;
​
orderField
string
Nome do campo em que se deseja ordenar os buscas;
​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;
​
search_type
string
Retorna buscas do tipo de referência especificado “cpf”, “cnpj”, “oab” ou “lawsuit_cnj”;
​
search_key
string
Retorna buscas relacionadas ao número do CPF, CNPJ, OAB ou processo informado;
​
lawsuit_instance
integer
Retorna buscas onde a instância do processo na busca está de acordo com a informada;
​
origin
string
Retorna buscas cuja origem está de acordo com a informada podendo ser “tracking” ou “api”;
​
origin_id
string
Retorna buscas relacionado ao ID da origem que poder ser um tracking_id(ID de um monitoramento) ou um id gerado pela api;
​
status
string
Retorna buscas cujo status podem ser created, “pending”‘, “started”, “cancelling”, “cancelled” ou “completed”, ou ou mais de um de status [“started”, “completed”];
​
distribution_date_gte
date
Retorna buscas com a data de distribuição maior ou igual a informada;
​
created_at_gte
date
Retorna buscas com a data de criação maior ou igual a informada;
​
created_at_lte
date
Retorna buscas com a data de criação menor ou igual a informada;
​
updated_at_gte
date
Retorna buscas com a data de atualização maior ou igual a informada;
​
updated_at_lte
date
Retorna buscas com a data de atualização menor ou igual a informada;
​
started_at_gte
date
Retorna buscas com a data de execução maior ou igual a informada;
​
started_at_lte
date
Retorna buscas com a data de execução menor ou igual a informada;
​
cancelled_at_gte
date
Retorna buscas com a data de cancelamento maior ou igual a informada;
​
cancelled_at_lte
date
Retorna buscas com a data de cancelamento criação menor ou igual a informada;
​
completed_at_gte
date
Retorna buscas com a data de finalização maior ou igual a informada;
​
completed_at_lte
date
Retorna buscas com a data finalização criação menor ou igual a informada;

Authorizations
api-key
string, header, required

Query Parameters
​
page
integer
Define a página dos resultados que você deseja consultar.

​
page_size
integer
Define o número máximo de resultados que você deseja receber por página;

​
orderField
string
Nome do campo em que se deseja ordenar os buscas;

​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;

​
search_type
string
Retorna buscas do tipo de referência especificado “cpf”, “cnpj”, “oab” ou “lawsuit_cnj”;

​
search_key
string
Retorna buscas relacionadas ao número do CPF, CNPJ, OAB ou processo informado;

​
lawsuit_instance
integer
Retorna buscas onde a instância do processo na busca está de acordo com a informada;

​
origin
string
Retorna buscas cuja origem está de acordo com a informada podendo ser “tracking” ou “api”;

​
origin_id
string
Retorna buscas relacionado ao ID da origem que poder ser um tracking_id(ID de um monitoramento) ou um id gerado pela api;

​
status
string
Retorna buscas cujo status podem ser created, “pending”‘, “started”, “cancelling”, “cancelled” ou “completed”, ou ou mais de um de status [“started”, “completed”];

​
distribution_date_gte
string
Retorna buscas com a data de distribuição maior ou igual a informada;

​
created_at_gte
string
Retorna buscas com a data de criação maior ou igual a informada;

​
created_at_lte
string
Retorna buscas com a data de criação menor ou igual a informada;

​
updated_at_gte
string
Retorna buscas com a data de atualização maior ou igual a informada;

​
updated_at_lte
string
Retorna buscas com a data de atualização menor ou igual a informada;

​
started_at_gte
string
Retorna buscas com a data de execução maior ou igual a informada;

​
started_at_lte
string
Retorna buscas com a data de execução menor ou igual a informada;

​
cancelled_at_gte
string
Retorna buscas com a data de cancelamento maior ou igual a informada;

​
cancelled_at_lte
string
Retorna buscas com a data de cancelamento criação menor ou igual a informada;

​
completed_at_gte
string
Retorna buscas com a data de finalização maior ou igual a informada;

​
completed_at_lte
string
Retorna buscas com a data finalização criação menor ou igual a informada;


# RESPONSES:

GET - CONSULTAR POR RESPONSE_ID
Consultar por response_id
Esse endpoint consulta uma resposta de uma requisição pelo id
https://requests.prod.judit.io/responses/{response_id}

-- Consultar por response_id
curl --request GET \
  --url https://requests.prod.judit.io/responses/{response_id} \
  --header 'api-key: <api-key>'

-- Response:
{
    "request_id": "b16ee08e-2169-4594-8bf4-ff528b5b5b72",
    "response_id": "d56e8c0a-a1de-4e75-8e4f-add06617035b",
    "response_type": "lawsuit",
    "response_data": {
    "code": "0027400-51.2009.5.03.0135",
    "instance": 1,
    "lawsuit_cnj": "eb77148d-b0a4-41cd-bad2-d10e38f68a06",
    "crawler": {
    "parties": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:33.894Z",
        "weight": 10,
    },
    "cover": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:34.616Z",
        "weight": 10,
}   ,
    "amount": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:14.534Z",
        "weight": 0,
    },
    "classification": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:14.948Z",
        "weight": 10,
    },
    "status": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:35.635Z",
        "weight": 0,
    },
    "subjects": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:32.670Z",
        "weight": 10,
    },
    "attachments": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:15.172Z",
        "weight": 10,
    },
    "related_lawsuits": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:12.645Z",
        "weight": 10,
    },
    "steps": {
        "code": "JTrtScrapper",
        "updated_at": "2023-10-05T18:13:13.522Z",
        "weight": 10,
    },
},
    "parties": [
        {
            "name": "ALINE PAULA RAMOS",
            "document": "05196308660",
            "document_type": "0",
            "person_type": "Autor",
            "side": "Active",
            "lawyers": [
        {
            "name": "RONEI MUNIZ BONFIM",
            "document": "03344781626",
            "document_type": "0",
            "license": "MG100560",
        }
    ],
},
{
    "name": "ADRIANA AMELIA DA SILVA MELO",
    "document": "83359079604",
    "document_type": "0",
    "person_type": "Réu",
    "side": "Passive",
    "lawyers": [
{
    "name": "JOSE RIBAMAR MATOS AMARAL",
    "document": "10912797720",
    "document_type": "0",
    "license": "MG94008",
}
    ],
},
{
    "name": "ADRIANA AMELIA DA SILVA MELO - ME",
    "document": "01618283000100",
    "document_type": "1",
    "person_type": "Réu",
    "side": "Passive",
    "lawyers": [
{
    "name": "JOSE RIBAMAR MATOS AMARAL",
    "document": "10912797720",
    "document_type": "0",
    "license": "MG94008",
}
    ],
},
{
    "name": "MARCOS VINICIUS MELO",
    "document": "83642943691",
    "document_type": "0",
    "person_type": "Réu",
    "side": "Passive",
    "lawyers": [
        {
            "document": null,
            "document_type": "0",
            "license": "null",
        }
    ],
},
{
    "name": "MARIA MARTINS MELO",
    "document": "94472866668",
    "document_type": "0",
    "person_type": "Réu",
    "side": "Passive",
    "lawyers": [
        {
            "document": null,
            "document_type": "0",
            "license": "null",
        }
            ],
        },
        {
            "name": "MERCEARIA MARTINS & MELO LTDA - ME",
            "document": "06947237000160",
            "document_type": "1",
            "person_type": "Réu",
            "side": "Passive",
            "lawyers": [
        {
            "name": "JOSE RIBAMAR MATOS AMARAL",
            "document": "10912797720",
            "document_type": "0",
            "license": "MG94008",
        }
    ],
},
{
    "name": "RONEI MUNIZ BONFIM",
    "document": "03344781626",
    "document_type": "0",
    "license": "MG100560",
    "person_type": "Advogado",
    "side": "Active",
    "lawyers": []
},
{
    "name": "JOSE RIBAMAR MATOS AMARAL",
    "document": "10912797720",
    "document_type": "0",
    "license": "MG94008",
    "person_type": "Advogado",
    "side": "Passive",
    "lawyers": []
}
    ],
    "subjects": [],
    "related_lawsuits": [],
    "created_at": "2023-10-05T18:12:40.002Z",
    "updated_at": "2023-10-05T18:13:35.635Z",
    "last_step": {
    "step_id": "d6hR9sg3XTPkxX3G5bvTq+qnb4aBf2b9VLsqQkc9fzg=",
    "step_date": "2018-01-11T14:44:24.000Z",
    "content": "Termo de Abertura de Execução | Termo de Abertura de Execução (RESTRITO)",
    "step_type": "ATOrd",
},
    "classification": {
    "code": "985",
    "name": "Ação Trabalhista - Rito Ordinário",
},
    "name": "ALINE PAULA RAMOS X ADRIANA AMELIA DA SILVA MELO",
    "distribution_date": "2009-03-19T00:00:00.000Z",
    "free_justice": false,
    "judge": null,
    "justice": "5",
    "secrecy_level": 0,
    "tribunal": "03",
    "tribunal_acronym": "TRT3",
    "tribunal_id": "985"
},
    "user_id": "c0573c15-219b-4a46-acc2-f9225b29c51e",
    "created_at": "2023-10-05T18:13:36.074Z",
    "request_status": "pending",
    "request_created_at": "2023-10-05T18:13:36.074Z"
},

response_id
string, required
O ID da resposta que você deseja consultar.

Authorizations
api-key
string, header, required

Path Parameters​
response_id
string, required
O ID da resposta que você deseja consultar.


GET - CONSULTAR RESPOSTAS
Esse endpoint consulta as respostas de requisições realizadas por parâmetros de forma paginada
https://requests.prod.judit.io/responses

-- Consultar respostas
curl --request GET \
  --url https://requests.prod.judit.io/responses \
  --header 'api-key: <api-key>'

-- Response:
{
"request_status": "completed",
"page": 1,
"page_count": 1,
"all_pages_count": 1,
"all_count": 1,
"page_data": [
    {
        "request_id": "54964ee1-fb81-4075-83e8-134dc484f9f7",
        "response_id": "66acd939-a7b1-4b5c-a10c-f0c55f2e57d8",
        "origin": "api",
        "origin_id": "54964ee1-fb81-4075-83e8-134dc484f9f7",
        "response_type": "lawsuit",
        "response_data": {
            "code": "9999999-99.9999.9.99.9999",
            "justice": "8",
            "tribunal": "09",
            "instance": 1,
            "distribution_date": "2025-02-24T15:25:52.000Z",
            "tribunal_acronym": "TJGO",
            "secrecy_level": 0,
            "tags": {
                "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92",
                "dictionary_updated_at": "2025-03-13T14:17:44.114Z"
            },
            "subjects": [
                {
                    "code": "7698",
                    "name": "PERDAS E DANOS"
                }
            ],
            "classifications": [
                {
                    "code": "7",
                    "name": "PROCEDIMENTO COMUM CÍVEL"
                }
            ],
            "courts": [
                {
                    "name": "Guapó - Vara Cível"
                },
                {
                    "code": "81448",
                    "name": "GUAPÓ - 1ª VARA JUDICIAL (FAMÍLIA E SUCESSÕES, INFÂNCIA E JUVENTUDE, CÍVEL E JUIZADO ESPECIAL CÍVEL)"
                }
            ],
            "parties": [
                {
                    "side": "Passive",
                    "name": "Usuáio teste",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "main_document": "99999999999",
                    "documents": [
                        {
                            "document": "99999999999",
                            "document_type": "CNPJ"
                        }
                    ],
                    "person_type": "Desconhecido",
                    "lawyers": []
                },
                {
                    "side": "Active",
                    "name": "Usuário teste 2",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "main_document": "99999999999",
                    "documents": [
                        {
                            "document": "99999999999",
                            "document_type": "CPF"
                        }
                    ],
                    "person_type": "Desconhecido",
                    "lawyers": [
                        {
                            "name": "USUÁRIO TESTE 4",
                            "documents": [
                                {}
                            ]
                        }
                    ]
                },
                {
                    "name": "Usuário teste 1",
                    "side": "Passive",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "main_document": "",
                    "documents": [],
                    "person_type": "Desconhecido",
                    "lawyers": []
                }
            ],
            "steps": [
                {
                    "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                    "lawsuit_instance": 1,
                    "private": false,
                    "step_id": "d029dd09",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "content": "Citação Efetivada Citação aberta pelo Domicilio Eletronico (Polo Passivo) Bv Financeira Sa Credito Financiamento E Investimento -",
                    "step_date": "2025-03-11T15:08:48.000Z",
                    "steps_count": 15
                },
                {
                    "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                    "lawsuit_instance": 1,
                    "private": false,
                    "step_id": "54854442",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "content": "Citação Expedida Via Domicílio Eletrônico para (Polo Passivo)",
                    "step_date": "2025-03-10T16:30:13.000Z"
                },
                {
                    "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                    "lawsuit_instance": 1,
                    "private": false,
                    "step_id": "a0ce7c0f",
                    "tags": {
                        "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                    },
                    "content": "Peticão Enviada ",
                    "step_date": "2025-02-24T15:25:52.000Z"
                }
            ],
            "attachments": [],
            "related_lawsuits": [],
            "crawler": {
                "source_name": "JPjdTjgoNoAuthScrapper - TJ - GO - Lawsuit - No Auth - 1 instance",
                "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92",
                "weight": 10,
                "updated_at": "2025-03-13T14:17:37.165Z"
            },
            "metadata": {},
            "amount": 40000,
            "area": "Cível",
            "county": " GUAPÓ - 2ª VARA JUDICIAL (FAZENDAS PÚBLICAS, CRIMINAL, EXECUÇÃO PENAL E JUIZADO CRIMINAL)",
            "state": "GO",
            "city": "GUAPO",
            "justice_description": "JUSTIÇA ESTADUAL",
            "last_step": {
                "lawsuit_cnj": "9999999-99.9999.9.99.9999",
                "lawsuit_instance": 1,
                "private": false,
                "step_id": "d029dd09",
                "tags": {
                    "crawl_id": "7b909cec-9060-4530-be34-81e364b86b92"
                },
                "content": "Citação Efetivada Citação aberta pelo Domicilio Eletronico (Polo Passivo)",
                "step_date": "2025-03-11T15:08:48.000Z",
                "steps_count": 15
            },
            "phase": "Inicial",
            "status": "Ativo",
            "name": "USUÁRIO TESTE 1 X USUÁRIO TESTE 2",
            "created_at": "2025-02-26T16:09:25.605Z",
            "updated_at": "2025-03-13T14:17:26.921Z",
            "free_justice": true
        },
        "user_id": "7f8065a3-4891-428d-9456-dedfc12ff850",
        "created_at": "2025-03-13T14:17:04.607Z",
        "request_created_at": "2025-03-13T14:17:01.114Z",
        "tags": {
            "debug": true,
            "dashboard_id": null,
            "cached_response": true
        }
    }
]
}

page
integer
Define a página dos resultados que você deseja consultar.
​
page_size
integer
Define o número máximo de resultados que você deseja receber por página;
​
orderField
string
Nome do campo em que se deseja ordenar os buscas;
​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;
​
response_type
string
Retorna respostas tipo especificado “lawsuit”,“parties”, “attachments”, “steps” ou “lawsuits”;
​
request_id
string
Retorna respostas relacionadas a uma busca pelo id;
​
request_status
string
Retorna respostas em que o status da busca podem estar em created, “pending”‘, “started”, “cancelling”, “cancelled” ou “completed”, ou ou mais de um de status [“started”, “completed”];
​
created_at_gte
date
Retorna buscas com a data de criação maior ou igual a informada;
​
created_at_lte
date
Retorna buscas com a data de criação menor ou igual a informada;
​
request_created_at_gte
date
Retorna respostas com a data de criação da busca maior ou igual a informada;
​
request_created_at_lte
date
Retorna respostas com a data de criação da busca menor ou igual a informada

Authorizations
api-key
string, header, required

Query Parameters
page
integer
Define a página dos resultados que você deseja consultar.

page_size
integer
Define o número máximo de resultados que você deseja receber por página;

​
orderField
string
Nome do campo em que se deseja ordenar os buscas;

​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;

​
response_type
string
Retorna respostas tipo especificado “lawsuit” , “parties” , “attachments” , “steps” ou “lawsuits” ;

​
request_id
string
Retorna respostas relacionadas a uma busca pelo id;

​
request_status
string
Retorna respostas em que o status da busca podem estar em created, “pending”‘, “started”, “cancelling”, “cancelled” ou “completed”, ou ou mais de um de status [“started”, “completed”];

​
created_at_gte
string
Retorna buscas com a data de criação maior ou igual a informada;

​
created_at_lte
string
Retorna buscas com a data de criação menor ou igual a informada;

​
request_created_at_gte
string
Retorna respostas com a data de criação da busca maior ou igual a informada;

​
request_created_at_lte
string
Retorna respostas com a data de criação da busca menor ou igual a informada


# FLUXO DE DADOS CADASTRAIS

POST - CRIAR UMA REQUISIÇÃO
Esse endpoint realiza consulta de dados cadastrais por CPF, nome ou RJI
https://lawsuits.production.judit.io/requests/create

-- Criar uma requisição
curl --request POST \
  --url https://lawsuits.production.judit.io/requests/create \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>"
  },
  "reveal_partners_documents": true
}
'

search
object

search_type
stringrequired
Define o tipo de entidade que você quer buscar: “cpf”, “CNPJ”, “nome” ou “RJI”;
​
search_key
stringrequired
Número do CPF, CNPJ, RJI ou nome;

reveal_partners_documents
boolean
Define se os documentos dos sócios devem ser revelados;

Authorizations
api-key
string, header, required

Body
application/json


search
object
 child attributes:
    search.search_type
    string, required
    Define o tipo de entidade que você quer buscar: “cpf”, “CNPJ”, “nome” ou “RJI”;
    ​
    search.search_key
    stringrequired
    Número do CPF, CNPJ, RJI ou nome;

reveal_partners_documents
boolean
Define se os documentos dos sócios devem ser revelados;



# MONITORAMENTO

POST - CRIAR UM MONITORAMENTO
Criar um monitoramento
Esse endpoint cria um monitoramento de processos por documento(CPF, CNPJ, OAB) ou Código CNJ
https://tracking.prod.judit.io/tracking

curl --request POST \
  --url https://tracking.prod.judit.io/tracking \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "recurrence": 123,
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "response_type": "<string>",
    "cache_ttl_in_days": 123,
    "search_params": {
      "lawsuit_instance": 123,
      "masked_response": "<string>",
      "is_public_search": true,
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        }
      },
      "credential": {
        "customer_key": "<string>"
      }
    }
  }
}
'

Response:
{
    "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
    "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
    "status": "created",
    "recurrence": 1,
    "search":{
      "search_type":"lawsuit_cnj",
      "search_key":"0027400-51.2009.5.03.0135",
      "search_params":  {}
    },
    "created_at": "2023-10-17T15:17:05.826Z",
    "updated_at": "2023-10-17T15:17:05.826Z"
}

recurrence
integer, required
Recorrência em dias de atualização dos processos.

search
object
Hide properties

​
search_type
string, required
Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;
​
search_key
string, required
Número do processo (Código CNJ), CPF, CNPJ ou OAB;
​
response_type
string
Define o tipo de retorno dos dados da busca: “lawsuit”, “parties”, “attachments”, “step” ou “lawsuits”;
​
cache_ttl_in_days
integer
Define até quantos dias o resultado da busca pode considerar um cache válido;
​
search_params
object
Hide properties

​
lawsuit_instance
integer
Define a instância em que deseja buscar o processo;
​
masked_response
string
Define se a resposta virá minificada. Este parâmetro é utilizado exclusivamente para consultas simples ou completas por documento.
​
is_public_search
boolean
Monitoramento contínuo de fontes públicas oficiais relacionadas ao CPF ou CNPJ.
​
filter
object
Hide child attributes

​
side
string
Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;
​
distribution_date_gte
date
Retorna buscas com a data de distribuição maior ou igual a informada;
​
amount_gte
number
Retorna buscas com o valor da causa maior que o valor passado
​
amount_lte
number
Retorna buscas com o valor da causa menor que o valor passado
​
tribunals
object
Hide child attributes

​
keys
array
Filtra processos com estes códigos ou não
​
not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados
​
subject_codes
object
Hide child attributes

​
keys
array
Filtra processos com estes códigos ou não
​
not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados
​
classification_codes
object
Hide child attributes

​
keys
array
Filtra processos com estes códigos ou não
​
not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

credential
object
​
customer_key
string
Permite passar a chave do cliente para acessar o cofre de credencial correto. Se não for passado a API tentará encontrar uma credencial cadastrada com a customer_key vazia;

Authorizations
api-key
string, header, required


Body
application/json
​
recurrence
integer, required
Recorrência em dias de atualização dos processos.

search
object
Hide child attributes

​
search.search_type
stringrequired
Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;

​
search.search_key
stringrequired
Número do processo (Código CNJ), CPF, CNPJ ou OAB;

​
search.response_type
string
Define o tipo de retorno dos dados da busca: “lawsuit”, “parties”, “attachments”, “step” ou “lawsuits”;

​
search.cache_ttl_in_days
integer
Define até quantos dias o resultado da busca pode considerar um cache válido;

​
search.search_params
object
Hide child attributes

​
search.search_params.lawsuit_instance
integer
Define a instância em que deseja buscar o processo;

​
search.search_params.masked_response
string
Define se a resposta virá minificada. Este parâmetro é utilizado exclusivamente para consultas simples ou completas por documento.

​
search.search_params.is_public_search
boolean
Monitoramento contínuo de fontes públicas oficiais relacionadas ao CPF ou CNPJ.

​
search.search_params.filter
object
Hide child attributes

​
search.search_params.filter.side
string
Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;

​
search.search_params.filter.distribution_date_gte
string
Retorna buscas com a data de distribuição maior ou igual a informada;

​
search.search_params.filter.amount_gte
number
Retorna buscas com o valor da causa maior que o valor passado

​
search.search_params.filter.amount_lte
number
Retorna buscas com o valor da causa menor que o valor passado

​
search.search_params.filter.tribunals
object
Hide child attributes

​
search.search_params.filter.tribunals.keys
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.tribunals.not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

search.search_params.filter.subject_codes
object
Hide child attributes

​
search.search_params.filter.subject_codes.keys
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.subject_codes.not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

search.search_params.filter.classification_codes
object
Hide child attributes

​
search.search_params.filter.classification_codes.keys
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.classification_codes.not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

search.search_params.credential
object
Hide child attributes

​
search.search_params.credential.customer_key
string
Permite passar a chave do cliente para acessar o cofre de credencial correto. Se não for passado a API tentará encontrar uma credencial cadastrada com a customer_key vazia;


GET - CONSULTAR MONITORAMENTOS
Esse endpoint consulta monitoramentos por parâmetros de forma paginada
https://tracking.prod.judit.io/tracking

curl --request GET \
  --url https://tracking.prod.judit.io/tracking \
  --header 'api-key: <api-key>'

Response:

{
    "page": "1",
    "page_data": [
        {
            "tracking_id": "6adbd1ba-8ef4-47c5-994f-13c017118046",
            "status": "updating",
            "recurrence": 1,
            "search":{
              "search_type": "cpf",
              "search_key":"208.422.640-60",
              "search_params":  {}
            },
            "created_at": "2023-10-14T00:39:28.864Z",
            "updating_at": "2023-10-18T00:39:39.538Z",
            "updated_at": "2023-10-18T00:39:39.596Z"
        },
        {
            "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
            "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
            "status": "updating",
            "recurrence": 1,
            "search":{
              "search_type": "lawsuit_cnj",
              "search_key": "0027400-51.2009.5.03.0135",
              "search_params":  {}
            },
            "created_at": "2023-10-17T15:17:05.826Z",
            "updating_at": "2023-10-18T15:17:09.125Z",
            "updated_at": "2023-10-18T15:17:09.203Z"
        }
    ],
    "page_count": 2,
    "all_count": 2,
    "all_pages_count": 1
}

page
integer
Define a página dos resultados que você deseja consultar.
​
page_size
integer
Define o número máximo de resultados que você deseja receber por página;
​
orderField
string
Nome do campo em que se deseja ordenar os buscas;
​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;
​
search_type
string
Retorna monitoramentos do tipo de referência especificado “cpf”, “cnpj”, “oab” ou “lawsuit_cnj”;
​
search_key
string
Retorna monitoramentos relacionadas ao número do CPF, CNPJ, OAB ou processo informado;
​
lawsuit_instance
integer
Retorna monitoramentos onde a instância do processo está de acordo com a informada;
​
status
string
Retorna monitoramentos cujo status podem ser ‘created’, ‘updating’, ‘updated’, ‘paused’ ou ‘deleted’ ou mais de um de status [‘updating’, ‘paused’];
​
tags
string
Retorna monitoramentos com as tags informadas;
​
recurrence_gte
date
Retorna monitoramentos com a recorrência de atualização maior ou igual a informada;
​
recurrence_lte
date
Retorna monitoramentos com a recorrência de atualização menor ou igual a informada;
​
created_at_gte
date
Retorna buscas com a data de criação maior ou igual a informada;
​
created_at_lte
date
Retorna buscas com a data de criação menor ou igual a informada;
​
updated_at_gte
date
Retorna buscas com a data de atualização maior ou igual a informada;
​
updated_at_lte
date
Retorna buscas com a data de atualização menor ou igual a informada;
​
updating_at_gte
date
Retorna monitoramentos com a data de execução do monitoramento maior ou igual a informada;
​
updating_at_lte
date
Retornam onitoramentos com a data de execução do monitoramento menor ou igual a informada;
​
paused_at_gte
date
Retorna monitoramentos com a data de pause do monitoramento maior ou igual a informada;
​
paused_at_lte
date
Retorna monitoramentos com a data de pause do monitoramento menor ou igual a informada;
​
deleted_at_gte
date
Retorna monitoramentos com a data de deleção maior ou igual a informada;
​
deleted_at_lte
date
Retorna monitoramentos com a data de deleção menor ou igual a informada;

Authorizations
api-key
string, header. required

Query Parameters
​
page
integer
Define a página dos resultados que você deseja consultar.

​
page_size
integer
Define o número máximo de resultados que você deseja receber por página;

​
orderField
string
Nome do campo em que se deseja ordenar os buscas;

​
orderDirection
string
Sentido da ordenação: ‘asc’ ou ‘desc’;

​
search_type
string
Retorna monitoramentos do tipo de referência especificado “cpf”, “cnpj”, “oab” ou “lawsuit_cnj”;

​
search_key
string
Retorna monitoramentos relacionadas ao número do CPF, CNPJ, OAB ou processo informado;

​
lawsuit_instance
integer
Retorna monitoramentos onde a instância do processo está de acordo com a informada;

​
status
string
Retorna monitoramentos cujo status podem ser ‘created’, ‘updating’, ‘updated’, ‘paused’ ou ‘deleted’ ou mais de um de status [‘updating’, ‘paused’];

​
tags
string
Retorna monitoramentos com as tags informadas;

​
recurrence_gte
string
Retorna monitoramentos com a recorrência de atualização maior ou igual a informada;

​
recurrence_lte
string
Retorna monitoramentos com a recorrência de atualização menor ou igual a informada;

​
created_at_gte
string
Retorna buscas com a data de criação maior ou igual a informada;

​
created_at_lte
string
Retorna buscas com a data de criação menor ou igual a informada;

​
updated_at_gte
string
Retorna buscas com a data de atualização maior ou igual a informada;

​
updated_at_lte
string
Retorna buscas com a data de atualização menor ou igual a informada;

​
updating_at_gte
string
Retorna monitoramentos com a data de execução do monitoramento maior ou igual a informada;

​
updating_at_lte
string
Retornam onitoramentos com a data de execução do monitoramento menor ou igual a informada;

​
paused_at_gte
string
Retorna monitoramentos com a data de pause do monitoramento maior ou igual a informada;

​
paused_at_lte
string
Retorna monitoramentos com a data de pause do monitoramento menor ou igual a informada;

​
deleted_at_gte
string
Retorna monitoramentos com a data de deleção maior ou igual a informada;

​
deleted_at_lte
string
Retorna monitoramentos com a data de deleção menor ou igual a informada;


GET - CONSULTAR UM MONITORAMENTO
Consultar um monitoramento
Esse endpoint consulta um monitoramento pelo id
https://tracking.prod.judit.io/tracking/{tracking_id}

curl --request GET \
  --url https://tracking.prod.judit.io/tracking/{tracking_id} \
  --header 'api-key: <api-key>'

{
    "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
    "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
    "status": "created",
    "recurrence": 1,
    "search":{
     "search_type": "lawsuit_cnj",
     "search_key": "0001234-55.2023.8.26.0100",
     "search_params":  {}
    },
    "created_at": "2023-10-17T15:17:05.826Z",
    "updated_at": "2023-10-17T15:17:05.826Z",
}

tracking_id
string, required
O ID do monitoramento que você deseja consultar.

Authorizations​
api-key
string, header, required

Path Parameters​
tracking_id
string, required
O ID do monitoramento que você deseja consultar.


POST - PAUSAR UM MONITORAMENTO
Esse endpoint pausa um monitoramento pelo id
https://tracking.prod.judit.io/tracking/{tracking_id}/pause

curl --request POST \
  --url https://tracking.prod.judit.io/tracking/{tracking_id}/pause \
  --header 'api-key: <api-key>'

Response:
{
    "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
    "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
    "status": "paused",
    "recurrence": 1,
    "search":{
     "search_type": "lawsuit_cnj",
     "search_key": "0001234-55.2023.8.26.0100",
     "search_params":  {}
    },
    "created_at": "2023-10-17T15:17:05.826Z",
    "updated_at": "2023-10-17T15:17:05.826Z",
    "paused_at": "2023-10-17T15:17:05.826Z",
}

tracking_id
string, required
O ID do monitoramento que você deseja pausar.

Authorizations​
api-key
string, header, required
Path Parameters
​
tracking_id
string, required
O ID do monitoramento que você deseja pausar.


POST - REATIVAR UM MONITORAMENTO
Esse endpoint reativar um monitoramento pelo id
https://tracking.prod.judit.io/tracking/{tracking_id}/resume

curl --request POST \
  --url https://tracking.prod.judit.io/tracking/{tracking_id}/resume \
  --header 'api-key: <api-key>'

Response:
{
    "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
    "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
    "status": "created",
    "recurrence": 1,
    "search":{
      "search_type": "lawsuit_cnj",
      "search_key": "0001234-55.2023.8.26.0100",
      "search_params":  {}
    },
    "created_at": "2023-10-17T15:17:05.826Z",
    "updated_at": "2023-10-17T15:17:05.826Z",
}

tracking_id
string, required
O ID do monitoramento que você deseja reativar.

Authorizations​
api-key
string, header, required

Path Parameters​
tracking_id
string, required
O ID do monitoramento que você deseja reativar.


DEL - DELETAR UM MONITORAMENTO
Esse endpoint deleta um monitoramento pelo id
https://tracking.prod.judit.io/tracking/{tracking_id}

curl --request DELETE \
  --url https://tracking.prod.judit.io/tracking/{tracking_id} \
  --header 'api-key: <api-key>'

{
    "tracking_id": "754f02d7-e346-48e2-a23e-4455a11af41e",
    "user_id": "454bbd51-3f8a-4889-b45f-54a78e312257",
    "status": "deleted",
    "recurrence": 1,
    "search":{
     "search_type": "lawsuit_cnj",
     "search_key": "0001234-55.2023.8.26.0100",
     "search_params":  {}
    },
    "created_at": "2023-10-17T15:17:05.826Z",
    "updated_at": "2023-10-17T15:17:05.826Z",
    "deleted_at": "2023-10-18T18:40:34.742Z",
}

tracking_id
string, required
O ID do monitoramento que você deseja reativar.

Authorizations​
api-key
string, header, required

Path Parameters​
tracking_id
string, required
O ID do monitoramento que você deseja reativar.


# CONSULTA CACHE JUDIT

POST - CONSULTA TRUE / FALSE
Consultando a Existência de Processos para o Documento em nosso datalake
https://lawsuits.production.judit.io/requests/create

curl --request POST \
  --url https://lawsuits.production.judit.io/requests/create \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "search_params": {
      "lawsuit_instance": 123,
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "conteins": [
            {}
          ],
          "not_contains": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "last_step_date_gte": "<string>",
        "last_step_date_lte": "<string>",
        "party_names": {},
        "party_documents": {}
      },
      "create_complete_request": true
    }
  }
}
'

Response:
{
	"has_lawsuits": true,
	"request_id": "bd2be78e-2d04-4fad-ad85-b6058e7cc4f4",
	"response_data": []
}

search
object
Hide properties

​
search_type
string, required
Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;
​
search_key
string, required
Número do processo (Código CNJ), CPF, CNPJ ou OAB;
​
search_params
object
Hide properties

​
lawsuit_instance
integer
Define a instância em que deseja buscar o processo;
​
filter
object
Hide child attributes

​
side
string
Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;
​
distribution_date_gte
date
Retorna buscas com a data de distribuição maior ou igual a informada;
​
amount_gte
number
Retorna buscas com o valor da causa maior que o valor passado
​
amount_lte
number
Retorna buscas com o valor da causa menor que o valor passado
​
tribunals
object
Hide child attributes

​
keys
array
Filtra processos com estes códigos ou não
​
not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados
​
subject_codes
object
Hide child attributes

​
conteins
array
Filtra processos com estes códigos ou não
​
not_contains
boolean
Determina se o filtro será por processos que contém ou não contém os código passados
​
classification_codes
object
Hide child attributes

​
keys
array
Filtra processos com estes códigos ou não
​
not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados
​
last_step_date_gte
date
Retorna buscas com a data de distribuição maior ou igual a informada;
​
last_step_date_lte
date
Retorna buscas com a data de distribuição menor ou igual a informada;
​
party_names
object
Lista de nomes (array de strings) que restringe a busca a processos que os contenham em alguma das partes.
​
party_documents
object
Lista de nomes (array de strings) que restringe a busca a processos que os contenham em alguma das partes.
​
create_complete_request
boolean

Authorizations
api-key
string, header, required

Body
application/json
​
search
object
Hide child attributes

​
search.search_type
string, required
Define o tipo de entidade que você quer buscar: “cpf”, “cnpj”, “oab”, “lawsuit_cnj” ou “lawsuit_id”;

​
search.search_key
string, required
Número do processo (Código CNJ), CPF, CNPJ ou OAB;

​
search.search_params
object
Hide child attributes

​
search.search_params.lawsuit_instance
integer
Define a instância em que deseja buscar o processo;

​
search.search_params.filter
object
Hide child attributes

​
search.search_params.filter.side
string
Define os tipos de participantes do processo: ‘Passive’ ou ‘Active’;

​
search.search_params.filter.distribution_date_gte
string
Retorna buscas com a data de distribuição maior ou igual a informada;

​
search.search_params.filter.amount_gte
number
Retorna buscas com o valor da causa maior que o valor passado

​
search.search_params.filter.amount_lte
number
Retorna buscas com o valor da causa menor que o valor passado

​
search.search_params.filter.tribunals
object
Hide child attributes

​
search.search_params.filter.tribunals.keys
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.tribunals.not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

​
search.search_params.filter.subject_codes
object
Hide child attributes

​
search.search_params.filter.subject_codes.conteins
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.subject_codes.not_contains
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

​
search.search_params.filter.classification_codes
object
Hide child attributes

​
search.search_params.filter.classification_codes.keys
object[]
Filtra processos com estes códigos ou não

​
search.search_params.filter.classification_codes.not_equal
boolean
Determina se o filtro será por processos que contém ou não contém os código passados

​
search.search_params.filter.last_step_date_gte
string
Retorna buscas com a data de distribuição maior ou igual a informada;

​
search.search_params.filter.last_step_date_lte
string
Retorna buscas com a data de distribuição menor ou igual a informada;

​
search.search_params.filter.party_names
object
Lista de nomes (array de strings) que restringe a busca a processos que os contenham em alguma das partes.

​
search.search_params.filter.party_documents
object
Lista de nomes (array de strings) que restringe a busca a processos que os contenham em alguma das partes.

​
search.search_params.create_complete_request
boolean


POST - CONSULTANDO A QUANTIDADE DE PROCESSOS
Consulta a quantidade de processos em nosso datalake
https://lawsuits.production.judit.io/requests/count

curl --request POST \
  --url https://lawsuits.production.judit.io/requests/count \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "response_type": "<string>",
    "search_params": {
      "lawsuit_instance": 123,
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "conteins": [
            {}
          ],
          "not_contains": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "last_step_date_gte": "<string>",
        "last_step_date_lte": "<string>",
        "party_names": {},
        "party_documents": {}
      },
      "credential": {
        "customer_key": "<string>"
      }
    }
  }
}
'

Response:
        {
        "total": 2
         }



POST - CONSULTA DATALAKE HOT STORAGE
Retorna processos atrelados a consulta histórica
https://lawsuits.production.judit.io/lawsuits

curl --request POST \
  --url https://lawsuits.production.judit.io/lawsuits \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "response_type": "<string>",
    "search_params": {
      "lawsuit_instance": 123,
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "conteins": [
            {}
          ],
          "not_contains": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "last_step_date_gte": "<string>",
        "last_step_date_lte": "<string>",
        "party_names": {},
        "party_documents": {}
      },
      "credential": {
        "customer_key": "<string>"
      }
    }
  }
}
'

Response:
{
    "has_lawsuits": true,
    "request_id": "c37cacba-41b5-4694-919f-4a937f2ea5df",
    "response_data": [
      {
        "code": "9999999-99.9999.9.99.9999",
        "justice": "5",
        "tribunal": "01",
        "instance": 2,
        "distribution_date": "2023-05-18T11:12:59.000Z",
        "tribunal_acronym": "TRT1",
        "secrecy_level": 0,
        "tags": {
          "is_fallback_source": true,
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
        },
        "subjects": [
          {
            "code": "13656",
            "name": "DOMÉSTICOS"
          }
        ],
        "classifications": [
          {
            "code": "1009",
            "name": "RECURSO ORDINÁRIO TRABALHISTA"
          }
        ],
        "courts": [
          {
            "code": "75580",
            "name": "GAB DES. GLAUCIA ZUCCARI FERNANDES BRAGA"
          }
        ],
        "parties": [
          {
            "name": "Usuário teste",
            "side": "Active",
            "person_type": "Autor",
            "document": "99999999999",
            "document_type": "CPF",
            "lawyers": [
              {
                "name": "Advogada do Autor",
                "side": "Active",
                "person_type": "Advogado"
              }
            ],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          },
          {
            "name": "Usuário teste",
            "side": "Passive",
            "person_type": "Réu",
            "document": "99999999999",
            "document_type": "CPF",
            "lawyers": [
              {
                "name": "Nome da advogada do réu",
                "side": "Passive",
                "person_type": "Advogado"
              }
            ]
        ],
        "steps": [],
        "attachments": [],
        "related_lawsuits": [],
        "crawler": {
          "source_name": "JTJ - BR - Document / Lawsuit - Auth",
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee",
          "weight": 0,
          "updated_at": "2024-03-18T19:21:02.466Z"
        },
        "amount": 7685.82,
        "last_step": {
          "lawsuit_cnj": "9999999-99.9999.9.99.9999",
          "lawsuit_instance": 1,
          "step_id": "JZzfEPTs10aeE+vpu+p+bkrz5K7enJhAM5kWattktHk=",
          "step_date": "2024-03-18T19:21:02.466Z",
          "private": false,
          "steps_count": 1
        },
        "phase": "Inicial",
        "status": "Ativo",
        "name": "Nome do Autor X Nome do Réu"
      },
      {
        "code": "9999999-99.9999.9.99.9999",
        "justice": "5",
        "tribunal": "01",
        "instance": 1,
        "distribution_date": "2022-03-30T16:41:24.000Z",
        "tribunal_acronym": "TRT1",
        "secrecy_level": 0,
        "tags": {
          "is_fallback_source": true,
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
        },
        "subjects": [
          {
            "code": "13656",
            "name": "DOMÉSTICOS"
          }
        ],
        "classifications": [
          {
            "code": "985",
            "name": "AÇÃO TRABALHISTA - RITO ORDINÁRIO"
          }
        ],
        "courts": [
          {
            "code": "33782",
            "name": "RIO DE JANEIRO - 37ª VARA DO TRABALHO"
          }
        ],
        "parties": [
          {
            "name": "Berenice",
            "side": "Active",
            "person_type": "Autor",
            "document": "99999999999",
            "document_type": "CPF",
            "lawyers": [
              {
                "name": "Nome do advogado do Autor",
                "side": "Active",
                "person_type": "Advogado"
              }
            ],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          },
          {
            "name": "Jhon Doe",
            "side": "Passive",
            "person_type": "Réu",
            "document": "99999999999",
            "document_type": "CPF",
            "lawyers": [
              {
                "name": "Nome da Advogada do réu",
                "side": "Passive",
                "person_type": "Advogado"
              }
            ],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          },
          {
            "person_type": "Advogado",
            "side": "Active",
            "name": "Nome do Advogado",
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          },
          {
            "person_type": "Advogado",
            "side": "Passive",
            "name": "Nome do Advogado",
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          }
        ],
        "steps": [],
        "attachments": [],
        "related_lawsuits": [],
        "crawler": {
          "source_name": "JTJ - BR - Document / Lawsuit - Auth",
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee",
          "weight": 0,
          "updated_at": "2024-03-18T19:21:02.465Z"
        },
        "amount": 7685.82,
        "last_step": {
          "lawsuit_cnj": "0100248-39.2022.5.01.0037",
          "lawsuit_instance": 1,
          "step_id": "u2r/3iZieAWrkFjxBZC/r4bMlFAvRO1IWvaOD8xdGl8=",
          "step_date": "2024-03-18T19:21:02.465Z",
          "private": false,
          "steps_count": 1
        },
        "phase": "Inicial",
        "status": "Ativo",
        "name": "Autor X Réu"
      },
      {
        "code": "8888888-88.8888.8.88.8888",
        "justice": "8",
        "tribunal": "19",
        "instance": 1,
        "distribution_date": "2023-06-06T17:35:50.000Z",
        "tribunal_acronym": "TJRJ",
        "secrecy_level": 0,
        "tags": {
          "is_fallback_source": true,
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
        },
        "subjects": [
          {
            "code": "7769",
            "name": "ABATIMENTO PROPORCIONAL DO PREÇO "
          },
          {
            "code": "7748",
            "name": "ACIDENTE AÉREO"
          },
          {
            "code": "10435",
            "name": "ACIDENTE DE TRÂNSITO"
          }
        ],
        "classifications": [
          {
            "code": "436",
            "name": "PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL"
          }
        ],
        "courts": [
          {
            "code": "13805",
            "name": "BARRA DA TIJUCA REGIONAL II JUI ESP CIV"
          }
        ],
        "parties": [
          {
            "name": "USUÁRIO TESTE",
            "side": "Active",
            "person_type": "Autor",
            "document": "88888888888",
            "document_type": "CPF",
            "lawyers": [],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          },
          {
            "name": "GABRIELLA",
            "side": "Active",
            "person_type": "Autor",
            "document": "88888888888",
            "document_type": "CPF",
            "lawyers": [],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          }
          {
            "name": "LEONARDO",
            "side": "Active",
            "person_type": "Autor",
            "document": "88888888888",
            "document_type": "CPF",
            "lawyers": [],
            "tags": {
              "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee"
            }
          }
        ],
        "steps": [],
        "attachments": [],
        "related_lawsuits": [],
        "crawler": {
          "source_name": "JTJ - BR - Document / Lawsuit - Auth",
          "crawl_id": "28e00227-e41b-4c94-956e-7a0f105eabee",
          "weight": 0,
          "updated_at": "2024-03-18T19:21:02.466Z"
        },
        "amount": 28790,
        "last_step": {
          "lawsuit_cnj": "0817064-37.2023.8.19.0209",
          "lawsuit_instance": 1,
          "step_id": "nU9IcVb9NLoHrJeUXt+Hay139dqHAVbfxk7f0D77aRQ=",
          "step_date": "2024-03-18T19:21:02.466Z",
          "private": false,
          "steps_count": 1
        },
        "phase": "Inicial",
        "status": "Ativo",
        "name": "DAVI LUIZ X GRUPO TURISMO LTDA"
      }
    ]
  }


POST - CONSULTA HISTÓRICA AGRUPADA
Retorna o total de processos relacionados a uma parte, agrupando esse número pelas informações da capa processual.
https://lawsuits.production.judit.io/requests/create/grouped

curl --request POST \
  --url https://lawsuits.production.judit.io/requests/create/grouped \
  --header 'Content-Type: application/json' \
  --header 'api-key: <api-key>' \
  --data '
{
  "search": {
    "search_type": "<string>",
    "search_key": "<string>",
    "response_type": "<string>",
    "search_params": {
      "lawsuit_instance": 123,
      "filter": {
        "side": "<string>",
        "distribution_date_gte": "<string>",
        "amount_gte": 123,
        "amount_lte": 123,
        "tribunals": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "subject_codes": {
          "conteins": [
            {}
          ],
          "not_contains": true
        },
        "classification_codes": {
          "keys": [
            {}
          ],
          "not_equal": true
        },
        "last_step_date_gte": "<string>",
        "last_step_date_lte": "<string>",
        "party_names": {},
        "party_documents": {}
      },
      "credential": {
        "customer_key": "<string>"
      }
    }
  }
}
'

response:
{
    "classifications": [
        {
            "count": 1,
            "value": "PROCEDIMENTO COMUM CÍVEL"
        },
        {
            "count": 1,
            "value": "HOMOLOGAçãO DE TRANSAçãO EXTRAJUDICIAL"
        },
        {
            "count": 1,
            "value": "PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL"
        }
    ],
    "subjects": [
        {
            "count": 1,
            "value": "ÔNUS DA PROVA"
        },
        {
            "count": 1,
            "value": "ACIDENTE DE TRâNSITO"
        },
        {
            "count": 1,
            "value": "COISAS"
        }
    ],
    "areas": [
        {
            "count": 4,
            "value": "DIREITO CIVIL"
        },
        {
            "count": 2,
            "value": "DIREITO ADMINISTRATIVO E OUTRAS MATÉRIAS DE DIREITO PÚBLICO"
        }
    ],
    "tribunals": [
        {
            "count": 1,
            "value": "TRF2"
        },
        {
            "count": 8,
            "value": "TRT1"
        },
        {
            "count": 1,
            "value": "TRF1"
        }
    ],
    "justices": [
        {
            "count": 7,
            "value": "NÃO INFORMADO"
        },
        {
            "count": 8,
            "value": "JUSTIÇA ESTADUAL"
        },
        {
            "count": 5,
            "value": "JUSTIÇA FEDERAL"
        }
    ],
    "phases": [
        {
            "count": 11,
            "value": "INICIAL"
        },
        {
            "count": 3,
            "value": "TRâNSITO EM JULGADO OU ACORDO"
        },
        {
            "count": 9,
            "value": "ARQUIVADO"
        }
    ],
    "states": [
        {
            "count": 11,
            "value": "RJ"
        },
        {
            "count": 1,
            "value": "MG"
        },
        {
            "count": 10,
            "value": "SP"
        }
    ],
    "instances": [
        {
            "count": 24,
            "value": 1
        },
        {
            "count": 3,
            "value": 2
        }
    ],
    "sides": [
        {
            "count": 8,
            "value": "PASSIVE"
        },
        {
            "count": 6,
            "value": "INTERESTED"
        }
    ],
    "person_types": [
        {
            "count": 1,
            "value": "IMPETRANTE"
        },
        {
            "count": 1,
            "value": "VITIMA"
        },
        {
            "count": 2,
            "value": "REQUERENTE"
        }
    ],
    "lawsuits_count": 27
}



# ACESSO A ANEXOS

GET - BAIXAR ANEXO
Essa página tem como objetivo mostrar o fluxo para baixar um anexo de um processo.
https://lawsuits.production.judit.io/lawsuits/{cnj_code}/{instance}/attachments/{attachment_id}

curl --request GET \
  --url https://lawsuits.production.judit.io/lawsuits/{cnj_code}/{instance}/attachments/{attachment_id} \
  --header 'api-key: <api-key>'

instance
string, required
Parametro instancia do processo
​
cnj_code
string, required
Código do processo.
​
attachment_id
string, required
ID do anexo na lista de anexos (attachments) retornado na consulta processual.

Authorizations​
api-key
string, header, required

Path Parameters​
instance
string, required
Parametro instancia do processo

cnj_code
string, required
Código do processo.
​
attachment_id
string, required
ID do anexo na lista de anexos (attachments) retornado na consulta processual.


GET - BAIXAR ANEXO DE MANDADO
Esta página tem como objetivo mostrar o fluxo para baixar o anexo do mandado de prisão. Um mandado de prisão possui apenas um anexo, que é o mandado expedido, de fato.
https://lawsuits.production.judit.io/warrants/{cnj_code}/attachments/{attachment_id}

curl --request GET \
  --url https://lawsuits.production.judit.io/warrants/{cnj_code}/attachments/{attachment_id} \
  --header 'api-key: <api-key>'

cnj_code
string , required
Código do processo.
​
attachment_id
string, required
ID do anexo é retornado na propriedade tribunal_id

Authorizations​
api-key
string, header, required

Path Parameters​
cnj_code
string, required
Código do processo.

​
attachment_id
string, required
ID do anexo é retornado na propriedade tribunal_id


# COFRE DE CREDENCIAIS

GET - COFRE DE CREDENCIAIS
Permite ao cliente parceiro cadastrar em nosso cofre de senhas as credenciais dos seus advogados por sistema e tribunal. Em nosso cofre de senhas é possível passar uma chave customer_key, para que você possa identificar as credenciais do seu cliente.

https://crawler.prod.judit.io/credentials

curl --request GET \
  --url https://crawler.prod.judit.io/credentials \
  --header 'api-key: <api-key>'

Response:
{
	"systems": [
		{
			"name": "*",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - JFES - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJSC - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJSC - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJTO - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - JFPR - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TNU - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAC - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAC - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJMS - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJSP - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAM - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJCE - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJSP - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJBA - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMG - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJES - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJAP - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJCE - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJDFT - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJDFT - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMA - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - JFRJ - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - JFRS - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMT - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPA - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPB - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPE - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPE - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRJ - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRO - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRO - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRR - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRF1 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRF1 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRF3 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRF3 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT1 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJMG - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - JFSC - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJMG - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJRS - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJRS - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TRF2 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TJTO - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "EPROC - TRF4 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAL - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJCE - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAL - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJMS - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "ESAJ - TJAM - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJAP - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJBA - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJES - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMA - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJCE - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT15 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT15 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT17 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT18 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT18 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT19 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT20 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT21 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT22 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT22 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT23 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT3 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT6 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT7 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRN - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRN - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJRR - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT1 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT10 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT10 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT11 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT11 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT12 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT12 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT13 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT14 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPI - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPI - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT13 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT14 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT16 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT16 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT17 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT19 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT2 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT2 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT20 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT21 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT23 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT24 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT24 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT3 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT4 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT5 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT4 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT5 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT8 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "TJRJ - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJRO - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TST - 3º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJPB - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TST - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJAP - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TST - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJAP - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT8 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT6 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT7 - CE - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT9 - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TRT9 - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJBA - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJES - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJMT - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJRJ - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJEINTER TJPB - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PROJUDI TJBA - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PROJUDI TJBA - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "TJRJ - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMG - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJMT - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPB - 1º grau",
			"customer_key": "",
			"credential_status": "not exists"
		},
		{
			"name": "PJE TJPA - 2º grau",
			"customer_key": "",
			"credential_status": "not exists"
		}
	]
}

Tipos de Status das Credenciais

credential_status pode ser:
not exists: Não cadastrada
active: Cadastrada e ativa
inactive: Cadastrada porém inativa (provável problema com senha ou bloqueio)
Caso seja utilizado um cadastro no sistema * (cadastro genérico), essa credencial será utilizada para todos os tribunais que não contenha um outro cadastro, então cuidado com esse tipo de cadastro.
Caso não seja informada nenhuma customer_key, será criada um customer_key vazia.

Authorizations​
api-key
string, header, required
Realizar o planejamento de integraçao com a API Judit para o módulo de Processos

# O que é a API Judit:

A JUDIT API permite conectar meu sistema a centenas de tribunais e transforma informações jurídicas complexas em dados estruturados, prontos para uso em qualquer aplicação.
Com apenas uma API-Key, permite conectar facilmente e elimina validações complexas:

Consultas por CPF, CNPJ, OAB, NOME ou CNJ: Busque processos usando diferentes tipos de identificadores
Monitoramento automatizado: Acompanhe mudanças em processos específicos
Acesso a anexos: Baixe documentos e anexos processuais
Dados cadastrais: Obtenha informações de registro de pessoas e empresas
Gestão de credenciais: Armazene e gerencie credenciais de tribunais de forma segura

Caso de uso para a plataforma E7 (escritório de advocacia):
Monitoramento automático de processos
Consulta rápida de andamentos processuais
Download automatizado de documentos

API-KEY inicial: 930934e7-b2f9-4870-a0de-d87fb1b7b737

# Caracteristicas principais da API Judit
Vantagens da Judit API
​
⚡ Performance Superior
Cache inteligente com TTL configurável
Respostas otimizadas para diferentes casos de uso
Infraestrutura distribuída para alta disponibilidade
​
🔒 Segurança Avançada
Autenticação via API Key
Cofre seguro para credenciais de tribunais
Criptografia end-to-end para dados sensíveis
​
📊 Dados Estruturados
Respostas padronizadas em JSON
Filtros avançados para consultas específicas
Metadados ricos para cada processo
​
🔄 Monitoramento Inteligente
Notificações automáticas de mudanças
Configuração flexível de recorrência
Controle granular de pausar/reativar
​
Arquitetura da API
A Judit API é composta por diferentes serviços especializados:
Requests Service (requests.prod.judit.io): Criação e consulta de requisições
Lawsuits Service (lawsuits.production.judit.io): Acesso ao datalake de processos
Tracking Service (tracking.prod.judit.io): Monitoramento de processos
​
Rate Limits
Limite padrão: 500 requisições por minuto
Monitoramento: Headers de rate limit em todas as respostas
Upgrade: Limites personalizados disponíveis mediante contrato
​

## Principais funcionalidades/módulos a serem utilizados:
Acompanhar processos em massa, com rapidez e abrangência em diversos tribunais.

# Consulta Processual:
Capa e movimentações do processo judicial, além da possibilidade de encontrar processos relacionados.
Buscar processos diretamente pelo CPF, CNPJ, OAB ou pelo número do processo.

# Consulta Histórica (Data Lake e On Demand):
Ter acesso em segundos a todos os processos já distribuídos em todos os tribunais do brasil

# Monitoramento de novas ações:
Evitar revelia, monitorar novos processos distrubuídos com até 30 dias de antecedencia

# Monitoramento processual:
Monitorar diariamente e manter atualizada todas as movimentações e demais informações

# Acesso completo aos autos processuais anexos privados e públicos
Visualizar e baixar os anexos relacionados às movimentações dos processos, garantindo uma visão detalhada e completa


### Documentaçao e Orientaçao de uso da API

1. Como consultar processos judiciais e documentos em todos os tribunais do Brasil
Objetivo: consultar processos e documentos judiciais em qualquer tribunal do Brasil. Realize buscas eficientes por
CNJ, CNPJ, CPF, OAB ou Nome.

1.1 Consulta processual gerando request_id

Para consultar um processo, seguir os passos:
a. Enviar uma requisiçao POST para a seguinte rota: https://requests.prod.judit.io/requests/
b. Definir o tipo de busca:
	b1. No campo search_type, use lawsuit_cnj para buscas processuais
c. Informe o número do processo:
	c1. No campo search_key, insira o número do processo desejado
d. Recupere o request_id:
	d1. a resposta da requisiçao incluirá um campo chamado request_id.
	d2. esse valor será necessário para obter o resultado da consulta
e. Inclua a API-KEY nos headers : 930934e7-b2f9-4870-a0de-d87fb1b7b737

2. Consultando a Resposta
Objetivo: obter o resultado da consulta, após gerar o request_id, seguir os passos abaixo:

a. faça uma requisiçao GET para a seguinte rota, substituindo o <REQUEST_ID> pelo valor gerado anteriormente: https://requests.prod.judit.io/responses?page_size=100&request_id=<REQUEST_ID>
b. inclusa a API-KEY nos headers
c. repita a chamada até que o campo request_status tenha o valor "completed", garantindo que a resposta esteja completa

3. Consulta com Anexos
Para capturar os anexos do processo, adicione o parametro with_attachments com o valor true na requisiçao

Importante:
As buscas processuais sao realizadas on-demand.
O processo completo nao é retornado em PDF, mas:
- todos os anexos podem ser acessados em PDF ou HTML
- as informaçoes da capa do processo são disponibilizadas em JSON

# Consulta por Documento - gerando request_id
Para realizar uam consulta, siga os passos abaixo:

a. envie uma requisiçao POST para seguinte rota: https://requests.prod.judit.io/requests/
b. defina o tipo de busca: 
	No campo search_type, informe o tipo de entidade desejado
		- cpf
		- cnpj
		- oab
		- name
		
c. informe o numero ou nome a ser consultado:
	No campo search_key, insira o CPF, CNPJ, número da OAB ou nome que deseja buscar
d. recupere o request_id:
	d1. a resposta da requisiçao incluirá um campo chamado request_id
	d2. esse valor será necessário para obter o resultado da consulta
e. inclua a API-KEY nos headers		

4. Busca por documento - consultando a resposta
Após gerar o request_id, siga os passos abaixo para recuperar a resposta:

	a. faça uma requisiçao GET para a seguinte rota, substituindo o <REQUEST_ID> pelo valor gerado anteriormente: https://requests.prod.judit.io/responses?page_size=100&request_id=<REQUEST_ID>
	b. inclua a API-KEY nos headers
	c. repita a requisiçao até que o campo request_status tenha o valor "completed", garantindo que a resposta esteja completa.

# Pontos importantes sobre consulta por documento:
regras e consideraçoes para consultas por documento

Consulta por documento:
 - por padrao nao inclui a fase e o status do processo
 - para obter essa informacao, é necessario realizar uma busca datalake na consulta hot storage adicionando o parametro "process_status" com o valor "true"
Modo On-Demand:
	- nao inclui a fase e o status do processo
	- por padrao, a consulta nao é feita on-demand
	- para ativar essa opcao, adicione ao payload a entidade on_demand com o valor true
Resultados da consulta por documento:
	- retorna a capa de todos os processos associados ao documento
	- inclui a ultima movimentacao processual de cada processo 	
	
	
# Monitorar processos judiciais e novas açoes em todos os tribunais do brasil
usar a API  Judit para monitorar processos e novas ações em qualquer tribunal do Brasil via CNJ, CNPJ, CPF ou OAB, com
atualizações em tempo real.	

5. Criando monitoramento de novas ações:

a. Envie uma requisiçao POST para a seguinte rota: https://tracking.prod.judit.io/tracking
b. Defina o tipo de entidade para monitoramento:
No campo search_type, informe o tipo de entidade:
■ cpf
■ cnpj
■ oab
■ name

c. defina o intervalo de busca:
- no campo recurrence, informe o intervalo em dais entre cada consulta ao tribunal.
d. informe o numero ou nome a ser monitorado:
- no campo search_key, insira o CPF, CNPJ, nome ou numero da OAB que deseja monitorar
e. recupere o tracking_id:
- a resposta incluirá um campo chamado tracking_id
- cada monitoramento tem um único tracking_id
f. inclua a API-KEY nos headers

6. Consultando monitoramento de novas ações

a. envie uma requisiçao GET para a seguinte rota, substituindo <TRACKING_ID> pelo ID do monitoramento gerado:
 https://tracking.prod.judit.io/tracking/<TRACKING_ID>
 
b. verifique o status do monitoramento:
o campo status pode ter os seguintes valores:

- active: Monitoramento criado.
- updating: Monitoramento em processo de geração de resposta.
- updated: Monitoramento completado, com resposta gerada.
- deleted: Monitoramento excluído.

c. após a resposta ser concluída (quando o status for updated), um request_id será gerado, contendo a resposta encontrada

7. Consultando a resposta de um monitoramento

a. realize uma requisiçao GET para a seguinte rota: 
https://requests.prod.judit.io/responses?page_size=100&request_id=<REQUEST_ID> , substituindo <REQUEST_ID> pelo ID da consulta gerado anteriormente.

b. Se forem encontrados processos associados ao monitoramento, com data de distribuição
posterior à data de cadastro, as respostas serão retornadas no campo page_data. Caso contrário, o campo page_data será um array vazio.

c. Inserir API-KEY nos headers

# Pontos de atençao para monitoramento de novas ações:

Regras e Considerações para o Monitoramento de Novas Ações
● Monitoramento de Novas Ações:
○ Não inclui a fase e o status do processo.
○ Para saber em qual fase o processo se encontra, é necessário realizar uma busca processual com o número do processo
encontrado.
● Resultados do Monitoramento:
○ O monitoramento de novas ações retorna somente os processos encontrados após a execução inicial do scraper, que
ocorre dentro de 5 horas a partir da criação do monitoramento.
● Modo On-Demand:
○ Todos os monitoramentos de novas ações são realizados on-demand.

8. Criando um monitoramento processual
Passo a passo para criar monitoramento processual

a. Envie uma requisição POST para a seguinte rota: https://tracking.prod.judit.io/tracking

b. Defina o tipo de entidade a ser monitorada:
No campo search_type, informe lawsuit_cnj para monitoramento processual.

c. Configure a captura de anexos:
No campo with_attachments, defina se os anexos devem ser capturados, atribuindo um valor booleano (true ou false).

d. Defina o intervalo de busca:
No campo recurrence, informe o intervalo em dias entre cada busca no tribunal.

e. Informe o número do CNJ a ser monitorado:
No campo search_key, insira o número do CNJ consultado.

f. Recupere o tracking_id:
- A resposta incluirá um campo chamado tracking_id.
- Cada monitoramento possui um único tracking_id.

9. Consultando um monitoramento processual

a. Envie uma requisição GET para a seguinte rota, substituindo <TRACKING_ID> pelo ID do tracking gerado:
https://tracking.prod.judit.io/tracking/<TRACKING_ID>
b. Verifique o status do monitoramento:
O campo status pode ter os seguintes valores:
- active: O monitoramento foi criado.
- updating: O monitoramento está em processo de geração de resposta.
- updated: O monitoramento gerou uma resposta completa.
- deleted: O monitoramento foi excluído.

c. Após a resposta ser concluída (quando o status for updated), um request_id será gerado, contendo a
resposta encontrada.

10. Consultando a resposta de um monitoramento processual
Consultando resultados do monitoramento:

a. Envie uma requisição GET para a seguinte rota, substituindo <REQUEST_ID> pelo ID de consulta gerado
no passo anterior:
https://requests.prod.judit.io/responses?page_size=100&request_id=<REQUEST_ID>

b. Verifique os processos encontrados:
- monitoramento com data de distribuição posterior à data de cadastro, esses processos serão exibidos no campo page_data.
- Caso contrário, o campo page_data será um array vazio.

c. Inclua a API-KEY nos Headers

# Criar painel para histórico de consumo da API Judit
Consultando histórico de consumo

a. Envie uma requisição GET para a seguinte rota, com os parâmetros de data desejados:
https://requests.prod.judit.io/requests

b. Defina o período de consulta:
- O parâmetro created_at_gte define a data inicial do período.
- O parâmetro created_at_lte define a data final do período.

c. Certifique-se de usar o formato de data correto para garantir que o filtro funcione adequadamente.

d. exemplo de requisiçao:
https://requests.prod.judit.io/requests?page_size=1000&crea ted_at_gte=2024-09-12&created_at_lte=2050-09-12&user_id=e3013f4a-e7c9-44ec-ad7f-bfbb9c8ef6c1

Perguntas frequentes para apoio:
1. A request do PDF só é cobrada no momento que fazemos o chamado with_attachments, não individualmente para cada PDF?
Requests de download de anexos possuem o search_type = lawsuit_attachment, enquanto a consulta processual, tanto com anexo quanto sem,
utiliza search_type = lawsuit_cnj. Apenas as requests com search_type = lawsuit_cnj são cobradas. Portanto, os anexos só geram cobrança no
momento em que a request é realizada com o parâmetro with_attachments = true.

2. Ao realizar uma consulta histórica (por nome, CPF ou CNPJ), a cobrança é única, independentemente da quantidade de processos
retornados?
Para consultas históricas, é cobrado um valor por cada 1.000 processos retornados.

3. Quando passado o parâmetro with_attachments = true, por default são capturados anexos públicos?
Não. Por padrão, são capturados apenas anexos privados, ou seja, aqueles disponíveis apenas na área logada. Para capturar somente anexos
públicos, é necessário utilizar with_attachments = true junto com o parâmetro public_search = true.

4. Processos em segredo de justiça são capturados?
Depende do nível de sigilo do processo. Geralmente, sem as credenciais do advogado da parte envolvida cadastradas em nosso cofre de
credenciais, esses processos não são acessados.

5. Quando atingido o valor mínimo de contrato, meu acesso é bloqueado?
Não. O valor de contrato corresponde ao consumo mínimo exigido, mas pode ser ultrapassado sem restrições. Caso isso ocorra,
será gerada uma cobrança adicional conforme os valores estabelecidos no contrato.

6. Quando um processo possui duas instâncias, como essas informações ficam dispostas na API?
Serão retornados dois objetos, um para cada instância, dentro do mesmo array. O primeiro objeto, na posição zero, representará a instância
mais recente.
# Troubleshooting Deploy Vercel

## Problema: Deploy não é acionado após push para GitHub

### Checklist de Verificação

#### 1. Verificar Configuração do Projeto na Vercel

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Vá em **Settings** → **Git**
3. Verifique se:
   - ✅ O repositório está conectado corretamente
   - ✅ O branch de produção está configurado (geralmente `main` ou `master`)
   - ✅ O branch atual (`fix-infinite-load-knVMj`) está sendo monitorado OU está configurado para Preview Deploys

#### 2. Verificar Webhook do GitHub

1. No GitHub, vá em **Settings** → **Webhooks**
2. Verifique se há um webhook da Vercel configurado
3. Teste o webhook clicando em "Recent Deliveries"
4. Se não houver webhook, você precisa reconectar o projeto na Vercel

#### 3. Verificar Branch Configuration

**Opção A: Deploy Manual**
```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer deploy manual
vercel --prod
```

**Opção B: Configurar Branch na Vercel**
1. Vercel Dashboard → Settings → Git
2. Em "Production Branch", configure para `main` ou o branch que você usa
3. Em "Ignored Build Step", deixe vazio ou configure conforme necessário

#### 4. Verificar se o Build Funciona Localmente

```bash
# Instalar dependências
npm install

# Testar build
npm run build
```

Se o build falhar localmente, o deploy também falhará na Vercel.

#### 5. Verificar Logs de Deploy na Vercel

1. Vercel Dashboard → **Deployments**
2. Verifique se há tentativas de deploy que falharam
3. Clique no deploy para ver os logs de erro

#### 6. Verificar Configurações do vercel.json

O arquivo `vercel.json` atual está correto, mas verifique se:
- ✅ Não há erros de sintaxe JSON
- ✅ As rotas estão configuradas corretamente
- ✅ Os headers estão corretos

### Soluções Rápidas

#### Solução 1: Reconectar o Repositório

1. Vercel Dashboard → Settings → Git
2. Clique em "Disconnect"
3. Clique em "Connect Git Repository"
4. Selecione seu repositório novamente
5. Configure o branch de produção

#### Solução 2: Fazer Deploy Manual

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy de produção
vercel --prod
```

#### Solução 3: Verificar Branch no GitHub

Certifique-se de que você fez push para o branch correto:

```bash
# Ver branch atual
git branch --show-current

# Ver branches remotos
git branch -r

# Push para o branch de produção (se necessário)
git push origin fix-infinite-load-knVMj:main
```

#### Solução 4: Criar Pull Request

Se você está em um branch de feature:
1. Crie um Pull Request no GitHub
2. A Vercel criará automaticamente um Preview Deploy
3. Após merge, o deploy de produção será acionado

### Configuração Recomendada

Para garantir deploys automáticos:

1. **Branch de Produção**: Configure `main` como branch de produção
2. **Preview Deploys**: Ative para todos os branches
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Comandos Úteis

```bash
# Ver status do git
git status

# Ver commits recentes
git log --oneline -10

# Ver branch atual
git branch --show-current

# Push para GitHub
git push origin <branch-name>

# Verificar se há mudanças não commitadas
git diff
```

### Próximos Passos

1. ✅ Verificar configuração do projeto na Vercel
2. ✅ Verificar webhook do GitHub
3. ✅ Tentar deploy manual com `vercel --prod`
4. ✅ Verificar logs de erro na Vercel
5. ✅ Verificar se o build funciona localmente


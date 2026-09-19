# Retomada do projeto — 19/09/2026

## O que já estava salvo

O trabalho anterior havia montado o painel com Catálogo, Estoque, Banners e Pedidos, cores da marca, formulários, upload e favicons. A flag `security_invoker` já estava modificada na migration 002. As alterações locais anteriores foram preservadas.

## Correções nesta retomada

- Salvamento transacional via `save_catalog_product`: produto, variantes e fotos são gravados juntos. Erros não são mais ignorados.
- Variante simples usa `Único` / `Padrão`, estoque informado e SKU gerado com UUID aleatório completo. A constraint UNIQUE continua sendo a garantia definitiva; colisões abortam a operação sem cadastro parcial.
- Variantes removidas são desativadas. Combinações inativas são reutilizadas para preservar referências de pedidos. A variante-base não fica ativa junto das variantes reais.
- Loja lê catálogo e variantes reais, exibe disponibilidade, permite escolher tamanho/cor e não substitui catálogo vazio por produtos fictícios.
- Banners da loja respeitam status e vigência, com rotação e navegação manual. Datas do painel usam horário local.
- Título `Painel Indómita`, checagem de equipe ao entrar e limpeza dos dados ao sair.
- Favicons com redução por média de área e alfa corrigido. SVG da loja adapta o traço para dourado em tema escuro. PNG permanece como fallback.

## Segurança: mudança importante em relação ao plano copiado

A view com `security_invoker` e projeção reduzida não basta quando as políticas permitem SELECT direto em `products` e `product_variants`: RLS filtra linhas, não esconde colunas.

A migration 005 remove as duas políticas públicas dessas tabelas. A equipe continua autorizada por `is_staff()`. A view permanece `security_invoker`, mas chama a função SQL `catalog_public_rows`, que é deliberadamente `security definer`: ela constitui a fronteira de acesso público, com filtro explícito `status = 'publicado'`, projeção fixa, nenhum SQL dinâmico e `search_path` vazio. A função de variantes retorna somente ID, produto, tamanho, cor e disponibilidade. Custo, SKU e estoque numérico ficam fora das duas funções.

Portanto, a função pública não herda o RLS do visitante: sua segurança depende dos filtros e campos explicitamente revisados e cobertos pelos testes. Referência: https://www.postgresql.org/docs/16/sql-createview.html

## Aplicação no Supabase

Atualização de publicação — 19/09/2026: migrations 005 e 006 aplicadas juntas, em transação, no projeto `pdwjfunozmlgznqsqakl` (PostgreSQL 17.6). Commit de implementação `ca34a54` enviado à main e publicado nos dois projetos Vercel. As instruções abaixo permanecem como referência para outras instalações; não é necessário reaplicá-las neste projeto.

Para um banco que já recebeu 001–004, aplicar no SQL Editor, nesta ordem:

1. `supabase/migrations/005_catalog_access.sql`
2. `supabase/migrations/006_atomic_product_save.sql`

Para instalação nova, aplicar 001–006 na ordem. Não executar novamente 001–004 em um banco existente. Alterar somente o arquivo 002 não atualiza um banco que já o executou.

Aplicar 005 e 006 antes do deploy conjunto de loja e painel: o novo painel depende da RPC de salvamento e a loja da RPC de variantes. Revisar o SQL antes de aplicar. O banco deve suportar `security_invoker` (PostgreSQL 15+).

## Validação realizada

- Build TypeScript/Vite e lint dos dois aplicativos.
- Migrations 001–006 executadas em PostgreSQL local via PGlite, com simulação das roles anon/authenticated e da identidade Supabase.
- Testes de acesso privado, rascunhos/arquivados, variantes, estoque zero, rollback, duplicidade, histórico de pedido, proteção contra exclusão e vigência de banners.
- Inspeção de `scripts/favicon-preview.png` em fundos claro/escuro, tamanhos 16/32/64.

Rodar novamente:

```powershell
npm --prefix scripts ci
npm --prefix scripts test
npm --prefix indomita-painel run build
npm --prefix indomita-painel run lint
npm --prefix indomita-loja run build
npm --prefix indomita-loja run lint
```

O teste em PGlite não valida o ambiente remoto, Supabase Auth real, Storage ou PostgREST. A extensão pgcrypto é omitida somente no teste local; o gerador UUID nativo do PostgreSQL permanece disponível.

## Verificação em produção

A automação de navegador foi bloqueada por `helper_sandbox_lock_failed` no ambiente de execução. Não foi possível validar a interface interativamente nem efetuar o cadastro cruzado painel → loja real.

- Teste transacional no banco remoto aprovado: cadastro como equipe, registro de imagem, conversão de variante-base, rollback de erro, acesso anônimo e isolamento de rascunhos. Todos os dados de teste foram revertidos.
- API pública via PostgREST aprovada: catálogo, variantes e bloqueio de linhas privadas.
- Loja publicada: https://indomita-five.vercel.app
- Painel publicado: https://indomita-painel.vercel.app
- Ambos os deploys em estado READY; HTTP 200 para HTML, JavaScript e favicon. Confirmadas as funções novas nos bundles e o endereço correto do Supabase.
- Corrigidos na Vercel: raiz do painel para `indomita-painel` e variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` de produção da loja.
- O banco estava sem produtos no momento da publicação; o catálogo vazio é o estado esperado.

Permanece sem validação interativa: login no navegador, upload real no Storage e contraste do favicon na aba do navegador. A imagem foi revisada em fundos claro e escuro; os testes remotos não substituem essa inspeção de interface.

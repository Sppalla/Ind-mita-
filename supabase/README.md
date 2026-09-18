# Supabase - Indómita

Este diretório reúne a base do banco compartilhado por loja pública e painel administrativo.

## Estrutura

- `001_init_core.sql`: criação do schema principal
- `002_rls_policies.sql`: ativação do RLS e políticas de segurança
- `003_seed_reference_data.sql`: categorias iniciais e documentação da criação do primeiro admin

## Primeiro admin

O primeiro administrador não deve ser criado pela aplicação antes da existência da conta de equipe.

Fluxo recomendado:

1. Criar o usuário na aba `Auth` do Supabase.
2. Copiar o `id` do usuário criado.
3. Inserir manualmente na tabela `public.staff_users` via SQL Editor:

```sql
insert into public.staff_users (user_id, role, is_active)
values ('<auth-user-id>', 'admin', true);
```

4. Depois disso, o painel pode gerir a equipe normalmente.

## LGPD / privacidade

- `customers` guarda consentimento e data de aceite da política
- o cliente só pode ler/editar os próprios dados
- a loja pública nunca acessa preço de custo, margem nem estoque interno

## Storage

O bucket de imagens da loja deve ser configurado no painel do Supabase:

- bucket: `product-images`
- leitura pública
- upload/alteração apenas para equipe (`staff`)

## Observação

Este schema foi desenhado para a Fase 1 do projeto. Fase 2 pode ampliar status de pedidos, pagamentos e frete sem quebrar a base atual.

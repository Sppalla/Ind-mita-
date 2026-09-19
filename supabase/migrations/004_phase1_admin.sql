-- Phase 1 operational admin: banners, secure media, and product deletion protection.
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  link_url text,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'inativo')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists idx_banners_status on public.banners(status);
create index if not exists idx_banners_display_window on public.banners(starts_at, ends_at, sort_order);

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at before update on public.banners
for each row execute procedure public.set_updated_at();

alter table public.banners enable row level security;
drop policy if exists "leitura publica de banners ativos" on public.banners;
create policy "leitura publica de banners ativos" on public.banners
for select to anon, authenticated
using (status = 'ativo' and now() >= starts_at and (ends_at is null or now() <= ends_at));
drop policy if exists "staff le todos os banners" on public.banners;
create policy "staff le todos os banners" on public.banners
for select to authenticated using (public.is_staff());
drop policy if exists "staff gerencia banners" on public.banners;
create policy "staff gerencia banners" on public.banners
for all to authenticated using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true), ('banners', 'banners', true)
on conflict (id) do update set public = true;

drop policy if exists "leitura publica de imagens indomita" on storage.objects;
create policy "leitura publica de imagens indomita" on storage.objects
for select to anon, authenticated using (bucket_id in ('product-images', 'banners'));
drop policy if exists "staff insere imagens indomita" on storage.objects;
create policy "staff insere imagens indomita" on storage.objects
for insert to authenticated with check (bucket_id in ('product-images', 'banners') and public.is_staff());
drop policy if exists "staff atualiza imagens indomita" on storage.objects;
create policy "staff atualiza imagens indomita" on storage.objects
for update to authenticated using (bucket_id in ('product-images', 'banners') and public.is_staff()) with check (bucket_id in ('product-images', 'banners') and public.is_staff());
drop policy if exists "staff exclui imagens indomita" on storage.objects;
create policy "staff exclui imagens indomita" on storage.objects
for delete to authenticated using (bucket_id in ('product-images', 'banners') and public.is_staff());

create or replace function public.prevent_product_delete_with_order_history()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.order_items where product_id = old.id) then
    raise exception 'Produtos com histórico de pedidos devem ser arquivados, não excluídos.';
  end if;
  return old;
end;
$$;
drop trigger if exists prevent_product_delete_with_order_history on public.products;
create trigger prevent_product_delete_with_order_history
before delete on public.products
for each row execute procedure public.prevent_product_delete_with_order_history();

create or replace function public.product_has_order_history(p_product_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.order_items where product_id = p_product_id);
$$;
grant execute on function public.product_has_order_history(uuid) to authenticated;
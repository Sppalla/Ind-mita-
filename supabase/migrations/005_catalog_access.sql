-- Upgrade existing installations too: changing migration 002 alone is insufficient.
-- RLS protects rows, not columns. Public callers must not read private base rows.
drop policy if exists products_public_select on public.products;
drop policy if exists variants_public_select on public.product_variants;

-- Deliberately narrow privilege boundary: only published, projected catalog data.
-- No caller-controlled SQL, private columns, or stock quantities are returned.
create or replace function public.catalog_public_rows()
returns table (
  id uuid, slug text, name text, description text, category_id uuid,
  category_name text, price_cents bigint, available boolean, image_url text
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name, p.description, p.category_id, c.name,
    p.price_cents,
    exists (select 1 from public.product_variants v
      where v.product_id = p.id and v.is_active and v.stock > 0),
    (select i.url from public.product_images i where i.product_id = p.id
      order by i.sort_order, i.created_at, i.id limit 1)
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.status = 'publicado';
$$;
revoke all on function public.catalog_public_rows() from public;
grant execute on function public.catalog_public_rows() to anon, authenticated;

create or replace view public.public_product_catalog
with (security_invoker = true)
as select * from public.catalog_public_rows();
grant select on public.public_product_catalog to anon, authenticated;

-- This helper reveals order history and belongs exclusively to staff.
create or replace function public.product_has_order_history(p_product_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  return exists (select 1 from public.order_items where product_id = p_product_id);
end;
$$;
revoke all on function public.product_has_order_history(uuid) from public, anon;
grant execute on function public.product_has_order_history(uuid) to authenticated;

-- Public variant choices expose availability only, never raw stock or SKU.
create or replace function public.catalog_public_variants()
returns table (id uuid, product_id uuid, size text, color text, available boolean)
language sql stable security definer set search_path = '' as $$
  select v.id, v.product_id, v.size, v.color, v.stock > 0
  from public.product_variants v join public.products p on p.id = v.product_id
  where p.status = 'publicado' and v.is_active;
$$;
revoke all on function public.catalog_public_variants() from public;
grant execute on function public.catalog_public_variants() to anon, authenticated;

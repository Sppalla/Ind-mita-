-- One transaction for product, variants and images; any failure rolls everything back.
create or replace function public.save_catalog_product(
  p_id uuid, p_product jsonb, p_variants jsonb, p_images jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  saved_id uuid;
  item jsonb;
  variant_id uuid;
  active_ids uuid[] := '{}';
  generated_sku text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if jsonb_typeof(p_variants) is distinct from 'array'
    or jsonb_array_length(p_variants) = 0 then
    raise exception 'Informe pelo menos uma variante.';
  end if;
  if jsonb_typeof(p_images) is distinct from 'array' then
    raise exception 'Lista de imagens inválida.';
  end if;
  if nullif(trim(p_product->>'name'), '') is null then
    raise exception 'Informe o nome da peça.';
  end if;

  if p_id is null then
    insert into public.products(name, slug, description, category_id, price_cents, cost_cents, status)
    values (trim(p_product->>'name'), p_product->>'slug', p_product->>'description',
      (p_product->>'category_id')::uuid, (p_product->>'price_cents')::bigint,
      (p_product->>'cost_cents')::bigint, p_product->>'status') returning id into saved_id;
  else
    -- Serialize concurrent edits to this product, including its child rows.
    perform 1 from public.products where id = p_id for update;
    if not found then raise exception 'Produto não encontrado.'; end if;
    update public.products set name = trim(p_product->>'name'),
      description = p_product->>'description', category_id = (p_product->>'category_id')::uuid,
      price_cents = (p_product->>'price_cents')::bigint,
      cost_cents = (p_product->>'cost_cents')::bigint, status = p_product->>'status'
    where id = p_id returning id into saved_id;
  end if;

  for item in select value from jsonb_array_elements(p_variants) loop
    if nullif(trim(item->>'size'), '') is null or nullif(trim(item->>'color'), '') is null then
      raise exception 'Informe tamanho e cor de todas as variantes.';
    end if;
    variant_id := nullif(item->>'id', '')::uuid;
    if variant_id is not null then
      perform 1 from public.product_variants where id = variant_id and product_id = saved_id;
      if not found then raise exception 'Variante não pertence ao produto.'; end if;
    else
      -- Reuse inactive combinations to preserve IDs referenced by order history.
      select id into variant_id from public.product_variants
      where product_id = saved_id and size = trim(item->>'size') and color = trim(item->>'color');
    end if;
    if variant_id = any(active_ids) then raise exception 'Tamanho e cor duplicados.'; end if;
    if variant_id is null then
      generated_sku := coalesce(nullif(trim(item->>'sku'), ''),
        (p_product->>'slug') || case when item->>'size' = 'Único' and item->>'color' = 'Padrão'
          then '-UNQ-' else '-' end || replace(gen_random_uuid()::text, '-', ''));
      insert into public.product_variants(product_id, size, color, sku, stock, is_active)
      values (saved_id, trim(item->>'size'), trim(item->>'color'), generated_sku,
        (item->>'stock')::integer, true) returning id into variant_id;
    else
      update public.product_variants set size = trim(item->>'size'), color = trim(item->>'color'),
        sku = coalesce(nullif(trim(item->>'sku'), ''), sku), stock = (item->>'stock')::integer,
        is_active = true where id = variant_id;
    end if;
    active_ids := array_append(active_ids, variant_id);
  end loop;
  update public.product_variants set is_active = false
    where product_id = saved_id and not (id = any(active_ids));

  delete from public.product_images where product_id = saved_id;
  insert into public.product_images(product_id, url, alt, sort_order)
  select saved_id, value->>'url', p_product->>'name', (ordinality - 1)::integer
    from jsonb_array_elements(p_images) with ordinality;
  return saved_id;
end;
$$;
revoke all on function public.save_catalog_product(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_catalog_product(uuid, jsonb, jsonb, jsonb) to authenticated;

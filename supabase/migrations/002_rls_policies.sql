alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.staff_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_users su
    where su.user_id = auth.uid()
      and su.is_active = true
  );
$$;

create or replace function public.is_customer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = auth.uid()
  );
$$;

create or replace function public.is_product_public(p_product_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id and p.status = 'publicado'
  );
$$;

create or replace view public.public_product_catalog
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.description,
  p.category_id,
  c.name as category_name,
  p.price_cents,
  case when coalesce(sum(pv.stock), 0) > 0 then true else false end as available,
  (
    select pi.url
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.sort_order asc, pi.created_at asc
    limit 1
  ) as image_url
from public.products p
left join public.categories c on c.id = p.category_id
left join public.product_variants pv on pv.product_id = p.id and pv.is_active = true
where p.status = 'publicado'
group by p.id, p.slug, p.name, p.description, p.category_id, c.name, p.price_cents;

grant select on public.public_product_catalog to anon, authenticated;

create policy "categories_public_select"
on public.categories
for select
using (true);

create policy "categories_staff_all"
on public.categories
for all
using (public.is_staff())
with check (public.is_staff());

create policy "products_public_select"
on public.products
for select
using (status = 'publicado' or public.is_staff());

create policy "products_staff_all"
on public.products
for all
using (public.is_staff())
with check (public.is_staff());

create policy "variants_public_select"
on public.product_variants
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and (p.status = 'publicado' or public.is_staff())
  )
);

create policy "variants_staff_all"
on public.product_variants
for all
using (public.is_staff())
with check (public.is_staff());

create policy "images_public_select"
on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and (p.status = 'publicado' or public.is_staff())
  )
);

create policy "images_staff_all"
on public.product_images
for all
using (public.is_staff())
with check (public.is_staff());

create policy "customers_select_self_or_staff"
on public.customers
for select
using (id = auth.uid() or public.is_staff());

create policy "customers_insert_self"
on public.customers
for insert
with check (id = auth.uid());

create policy "customers_update_self_or_staff"
on public.customers
for update
using (id = auth.uid() or public.is_staff())
with check (id = auth.uid() or public.is_staff());

create policy "customers_delete_staff_only"
on public.customers
for delete
using (public.is_staff());

create policy "staff_users_staff_read"
on public.staff_users
for select
using (public.is_staff());

create policy "staff_users_admin_manage"
on public.staff_users
for all
using (public.is_staff() and exists (
  select 1
  from public.staff_users su
  where su.user_id = auth.uid()
    and su.role = 'admin'
))
with check (public.is_staff() and exists (
  select 1
  from public.staff_users su
  where su.user_id = auth.uid()
    and su.role = 'admin'
));

create policy "orders_customer_read_own"
on public.orders
for select
using (customer_id = auth.uid() or public.is_staff());

create policy "orders_customer_insert_own"
on public.orders
for insert
with check (customer_id = auth.uid());

create policy "orders_customer_update_cancel_only"
on public.orders
for update
using (customer_id = auth.uid() or public.is_staff())
with check (
  public.is_staff() or (
    customer_id = auth.uid() and status = 'cancelado'
  )
);

create policy "orders_staff_manage"
on public.orders
for update
using (public.is_staff());

create policy "orders_staff_delete"
on public.orders
for delete
using (public.is_staff());

create policy "order_items_customer_read_own"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or public.is_staff())
  )
);

create policy "order_items_customer_insert_own"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = auth.uid()
  )
);

create policy "order_items_staff_manage"
on public.order_items
for all
using (public.is_staff())
with check (public.is_staff());

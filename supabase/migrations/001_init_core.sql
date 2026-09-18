create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories(id),
  status text not null check (status in ('rascunho', 'publicado', 'arquivado')),
  price_cents bigint not null check (price_cents >= 0),
  cost_cents bigint not null check (cost_cents >= 0),
  is_featured boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  cpf text,
  email text not null,
  consent_marketing boolean not null default false,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null check (status in ('rascunho', 'pendente', 'confirmado', 'cancelado')),
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  total_price_cents bigint not null check (total_price_cents >= 0),
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.categories
for each row execute procedure public.set_updated_at();

create trigger set_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

create trigger set_updated_at before update on public.product_variants
for each row execute procedure public.set_updated_at();

create trigger set_updated_at before update on public.customers
for each row execute procedure public.set_updated_at();

create trigger set_updated_at before update on public.staff_users
for each row execute procedure public.set_updated_at();

create trigger set_updated_at before update on public.orders
for each row execute procedure public.set_updated_at();

create or replace function public.validate_product_image()
returns trigger
language plpgsql
as $$
begin
  if new.variant_id is not null and not exists (
    select 1
    from public.product_variants pv
    where pv.id = new.variant_id
      and pv.product_id = new.product_id
  ) then
    raise exception 'variant_id must belong to the same product_id';
  end if;

  return new;
end;
$$;

create trigger validate_product_image
before insert or update on public.product_images
for each row
execute procedure public.validate_product_image();

create or replace function public.validate_order_customer_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'authenticated user required';
  end if;

  if not public.is_staff() then
    if new.customer_id is distinct from old.customer_id then
      raise exception 'customer cannot change order owner';
    end if;

    if new.subtotal_cents is distinct from old.subtotal_cents
      or new.shipping_cents is distinct from old.shipping_cents
      or new.total_cents is distinct from old.total_cents then
      raise exception 'customer cannot mutate order totals';
    end if;

    if new.status is distinct from old.status and new.status <> 'cancelado' then
      raise exception 'customer can only cancel the order';
    end if;

    if old.status not in ('rascunho', 'pendente') then
      raise exception 'order cannot be cancelled after it is no longer editable';
    end if;

    if new.customer_id <> auth.uid() then
      raise exception 'customer can only manage their own order';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_order_customer_update
before update on public.orders
for each row
execute procedure public.validate_order_customer_update();

insert into public.categories (name, slug, description, is_active)
values
  ('Top', 'top', 'Peças premium para treino e dia a dia.', true),
  ('Legging', 'legging', 'Modelagens que acompanham o movimento.', true),
  ('Conjunto', 'conjunto', 'Looks completos com alto desempenho.', true),
  ('Acessórios', 'acessorios', 'Complementos funcionais e elegantes.', true)
on conflict (slug) do nothing;

-- Documented bootstrap for the first admin user:
-- 1. Create the auth user in Supabase Auth.
-- 2. Add the user_id to public.staff_users manually from the SQL Editor.
-- 3. Only then allow the admin to use the panel.
--
-- Example:
-- insert into public.staff_users (user_id, role, is_active)
-- values ('<auth-user-id>', 'admin', true);

create or replace function public.ensure_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Cliente'), new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.ensure_customer_profile();

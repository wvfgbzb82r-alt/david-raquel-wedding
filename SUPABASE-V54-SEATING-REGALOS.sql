-- DAVID & RAQUEL · V54 · SEATING Y REGALOS PRIVADOS
-- Ejecutar una sola vez en Supabase > SQL Editor

create table if not exists public.mesas_v54 (
  id bigint generated always as identity primary key,
  numero integer not null unique check (numero > 0),
  nombre text not null,
  capacidad integer not null check (capacidad between 1 and 30),
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.asignaciones_mesas_v54 (
  id bigint generated always as identity primary key,
  confirmacion_id bigint not null unique
    references public.confirmaciones_v24(id) on delete cascade,
  mesa_id bigint not null
    references public.mesas_v54(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.regalos_v54 (
  id bigint generated always as identity primary key,
  invitado text not null,
  tipo text not null check (tipo in ('Bizum','Transferencia','Sobre','Otro')),
  importe numeric(10,2) not null check (importe >= 0),
  fecha date not null default current_date,
  estado text not null default 'recibido'
    check (estado in ('recibido','pendiente','agradecido')),
  notas text,
  created_at timestamptz not null default now()
);

alter table public.mesas_v54 enable row level security;
alter table public.asignaciones_mesas_v54 enable row level security;
alter table public.regalos_v54 enable row level security;

grant select, insert, update, delete on public.mesas_v54 to authenticated;
grant select, insert, update, delete on public.asignaciones_mesas_v54 to authenticated;
grant select, insert, update, delete on public.regalos_v54 to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "novios gestionan mesas v54" on public.mesas_v54;
create policy "novios gestionan mesas v54"
on public.mesas_v54 for all to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid)
with check (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "novios gestionan asignaciones v54" on public.asignaciones_mesas_v54;
create policy "novios gestionan asignaciones v54"
on public.asignaciones_mesas_v54 for all to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid)
with check (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "novios gestionan regalos v54" on public.regalos_v54;
create policy "novios gestionan regalos v54"
on public.regalos_v54 for all to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid)
with check (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

notify pgrst, 'reload schema';

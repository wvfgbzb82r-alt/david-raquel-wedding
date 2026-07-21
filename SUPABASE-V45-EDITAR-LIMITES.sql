-- =============================================================
-- DAVID & RAQUEL · V45
-- Permitir editar los límites de invitaciones desde el panel
-- Ejecuta TODO en Supabase > SQL Editor > New query > RUN
-- =============================================================

grant update on table public.invitaciones_personalizadas to authenticated;

drop policy if exists "solo novios actualizan invitaciones personalizadas"
on public.invitaciones_personalizadas;

create policy "solo novios actualizan invitaciones personalizadas"
on public.invitaciones_personalizadas
for update
to authenticated
using (
  auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
)
with check (
  auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
  and adultos_max between 0 and 20
  and ninos_max between 0 and 20
  and adultos_max + ninos_max >= 1
);

notify pgrst, 'reload schema';

-- 관리자 화면용 설정. Supabase 대시보드 → SQL Editor 에 붙여 넣고 Run 하세요. (한 번만)
-- 먼저 setup.sql 을 실행한 상태여야 합니다.

-- 1) 관리자 표시 열
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) 현재 로그인한 사용자가 관리자인지 확인하는 함수 (RLS 순환 참조를 피하려고 security definer)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- 3) 관리자는 모든 멤버를 보고, 상태를 바꿀 수 있음
drop policy if exists "admin read all" on public.profiles;
create policy "admin read all" on public.profiles for select using (public.is_admin());

drop policy if exists "admin update status" on public.profiles;
create policy "admin update status" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- 4) 수정 가능한 열은 status 하나뿐 (is_admin, email 등은 앱에서 바꿀 수 없음)
revoke update on public.profiles from anon, authenticated;
grant update (status) on public.profiles to authenticated;

-- 5) 본인을 관리자로 지정: 사이트에 가입 신청한 이메일로 바꿔서 실행하세요.
--    (이 한 줄은 SQL Editor 에서만 실행할 수 있습니다. 앱에서는 관리자를 지정할 수 없습니다.)
update public.profiles set is_admin = true, status = 'approved' where email = '여기에_본인_가입_이메일';

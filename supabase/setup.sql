-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run 하세요. (한 번만)

-- 멤버 목록: 가입하면 자동으로 'pending'(승인 대기)으로 생성됩니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 본인 행만 읽을 수 있고, 쓰기 정책은 만들지 않습니다.
-- (멤버가 스스로 승인할 수 없고, 상태 변경은 대시보드에서 관리자만 할 수 있음)
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

-- 가입할 때 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 승인 방법: Table Editor → profiles → 해당 멤버의 status 를 approved 로 바꾸고 저장
-- 차단/취소: status 를 rejected 로 바꾸면 다음 페이지 요청부터 접근이 막힙니다.

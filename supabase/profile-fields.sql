-- 가입 신청에 이름·전화번호를 받고, 멤버 관리 화면에서 보이게 하는 설정.
-- Supabase 대시보드 → SQL Editor 에 붙여 넣고 Run 하세요. (한 번만)
-- setup.sql, admin.sql 을 실행한 상태여야 합니다.

-- 1) 이름·전화번호 열 추가 (기존 멤버는 비어 있음)
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists phone text;

-- 2) 가입할 때 이름·전화번호도 함께 저장하도록 트리거 함수 교체
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 30), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), 20), '')
  );
  return new;
end;
$$;

-- 이름·전화번호는 본인과 관리자만 볼 수 있습니다. (admin.sql 의 읽기 정책이 그대로 적용됨)
-- 앱에서 수정할 수 있는 열은 여전히 status 하나뿐입니다.

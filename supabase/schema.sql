-- 포케로그_국영수(초등) 서버 (Supabase) 설정 — 계정 · 세이브 · 랭킹
--
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 전체를 붙여 넣고 Run 을 누르세요.
-- (여러 번 실행해도 안전합니다)
--
-- 구조
--  * 계정/세이브/로그인 정보 테이블은 인터넷에서 직접 읽거나 쓸 수 없고, 아래의 함수(edu_*)로만 다룹니다.
--  * 비밀번호는 bcrypt 로 암호화해서 저장합니다. (원래 비밀번호는 서버도 모릅니다)
--  * 로그인하면 임시 열쇠(token)를 주고, 서버에는 그 열쇠의 해시만 보관합니다. (30일 뒤 만료)
--  * 순위표(scores)는 누구나 볼 수 있지만, 점수는 로그인한 본인만 함수를 통해서만 올릴 수 있습니다.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- #region 테이블

create table if not exists public.edu_users (
  id                uuid primary key default gen_random_uuid(),
  username          text        not null check (char_length(username) between 2 and 16),
  username_key      text        not null unique,
  password_hash     text        not null,
  last_session_slot int         not null default -1,
  profile           jsonb,
  failed_logins     int         not null default 0,
  locked_until      timestamptz,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz,
  last_submit_at    timestamptz
);

-- 시간당 점수 한도 확인용 (이미 만든 테이블에도 안전하게 추가)
alter table public.edu_users add column if not exists hour_start  timestamptz;
alter table public.edu_users add column if not exists hour_points int not null default 0;

create table if not exists public.edu_sessions (
  token_hash text primary key,
  user_id    uuid        not null references public.edu_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists edu_sessions_user_idx on public.edu_sessions (user_id);

create table if not exists public.edu_saves (
  user_id    uuid        not null references public.edu_users (id) on delete cascade,
  kind       text        not null check (kind in ('system', 'session')),
  slot       int         not null check (slot between 0 and 9),
  data       text        not null check (char_length(data) <= 8000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, slot)
);

create table if not exists public.scores (
  uid          text        not null check (char_length(uid) between 8 and 40),
  subject      text        not null check (subject in ('kor', 'eng', 'math')),
  school_code  text        not null check (char_length(school_code) between 1 and 80),
  school_name  text        not null check (char_length(school_name) <= 40),
  grade        int         not null check (grade between 1 and 6),
  class_name   text        not null check (char_length(class_name) between 1 and 8),
  student_no   int         not null check (student_no between 0 and 99),
  nickname     text        not null default '' check (char_length(nickname) <= 8),
  points       int         not null default 0 check (points between 0 and 100000000),
  solved       int         not null default 0,
  perfect      int         not null default 0,
  best_wave    int         not null default 0,
  best_streak  int         not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (uid, subject)
);
create index if not exists scores_school_idx on public.scores (school_code, subject, points desc);
create index if not exists scores_class_idx  on public.scores (school_code, subject, grade, class_name, points desc);

-- #endregion

-- #region 접근 권한: 계정 관련 테이블은 막고, 순위표만 읽기 허용

alter table public.edu_users    enable row level security;
alter table public.edu_sessions enable row level security;
alter table public.edu_saves    enable row level security;
alter table public.scores       enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.edu_users, public.edu_sessions, public.edu_saves, public.scores from anon;
    grant select on public.scores to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.edu_users, public.edu_sessions, public.edu_saves, public.scores from authenticated;
    grant select on public.scores to authenticated;
  end if;
end $$;

drop policy if exists "scores read" on public.scores;
create policy "scores read" on public.scores for select using (true);

-- #endregion

-- #region 함수 (모두 SECURITY DEFINER: 위 테이블은 이 함수들만 건드립니다)

-- 열쇠(token) → 사용자 아이디. 없거나 만료되면 null.
create or replace function public.edu_user_from_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select user_id
  from public.edu_sessions
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and expires_at > now()
$$;

create or replace function public.edu_register(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(coalesce(p_username, ''));
begin
  if v_name !~ '^[[:alnum:]_-]{2,16}$' then
    return json_build_object('ok', false, 'error', 'invalid username');
  end if;
  if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 72 then
    return json_build_object('ok', false, 'error', 'invalid password');
  end if;
  -- 자동 가입 프로그램으로 계정이 한꺼번에 만들어지는 것을 막는다 (1시간에 300명까지)
  if (select count(*) from public.edu_users where created_at > now() - interval '1 hour') >= 300 then
    return json_build_object('ok', false, 'error', 'try again later');
  end if;
  insert into public.edu_users (username, username_key, password_hash)
  values (v_name, lower(v_name), crypt(p_password, gen_salt('bf', 8)));
  return json_build_object('ok', true);
exception when unique_violation then
  return json_build_object('ok', false, 'error', 'failed to add account record');
end $$;

create or replace function public.edu_login(p_username text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.edu_users%rowtype;
  v_token text;
begin
  select * into v_user from public.edu_users where username_key = lower(btrim(coalesce(p_username, '')));
  if not found then
    return json_build_object('ok', false, 'error', 'account doesn''t exist');
  end if;
  if v_user.locked_until is not null and v_user.locked_until > now() then
    return json_build_object('ok', false, 'error', 'too many attempts');
  end if;
  if v_user.password_hash <> crypt(coalesce(p_password, ''), v_user.password_hash) then
    -- 5번 틀리면 10분 동안 잠근다
    update public.edu_users
       set failed_logins = case when failed_logins >= 4 then 0 else failed_logins + 1 end,
           locked_until  = case when failed_logins >= 4 then now() + interval '10 minutes' else locked_until end
     where id = v_user.id;
    return json_build_object('ok', false, 'error', 'password doesn''t match');
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  delete from public.edu_sessions where user_id = v_user.id and expires_at < now();
  insert into public.edu_sessions (token_hash, user_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), v_user.id, now() + interval '30 days');
  update public.edu_users set failed_logins = 0, locked_until = null, last_login_at = now() where id = v_user.id;
  return json_build_object('ok', true, 'token', v_token);
end $$;

create or replace function public.edu_logout(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.edu_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  return json_build_object('ok', true);
end $$;

create or replace function public.edu_info(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
  v_user public.edu_users%rowtype;
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  select * into v_user from public.edu_users where id = v_id;
  return json_build_object(
    'ok', true,
    'uid', v_id::text,
    'username', v_user.username,
    'last_session_slot', v_user.last_session_slot,
    'profile', v_user.profile,
    'scores', coalesce((select json_agg(s) from public.scores s where s.uid = v_id::text), '[]'::json)
  );
end $$;

create or replace function public.edu_change_password(p_token text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 72 then
    return json_build_object('ok', false, 'error', 'invalid password');
  end if;
  update public.edu_users set password_hash = crypt(p_password, gen_salt('bf', 8)) where id = v_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.edu_save_get(p_token text, p_kind text, p_slot int)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
  v_data text;
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  select data into v_data from public.edu_saves where user_id = v_id and kind = p_kind and slot = p_slot;
  if v_data is null then
    return json_build_object('ok', false, 'error', 'save does not exist');
  end if;
  return json_build_object('ok', true, 'data', v_data);
end $$;

create or replace function public.edu_save_put(p_token text, p_kind text, p_slot int, p_data text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  if p_kind not in ('system', 'session') or p_slot not between 0 and 9 or p_data is null then
    return json_build_object('ok', false, 'error', 'invalid save');
  end if;
  insert into public.edu_saves (user_id, kind, slot, data) values (v_id, p_kind, p_slot, p_data)
  on conflict (user_id, kind, slot) do update set data = excluded.data, updated_at = now();
  if p_kind = 'session' then
    update public.edu_users set last_session_slot = p_slot where id = v_id;
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.edu_save_delete(p_token text, p_kind text, p_slot int)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  delete from public.edu_saves where user_id = v_id and kind = p_kind and slot = p_slot;
  return json_build_object('ok', true);
end $$;

-- 시스템 세이브와 현재 세션 세이브를 한 번에 저장
create or replace function public.edu_save_all(p_token text, p_system text, p_session text, p_slot int)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  if p_system is not null then
    insert into public.edu_saves (user_id, kind, slot, data) values (v_id, 'system', 0, p_system)
    on conflict (user_id, kind, slot) do update set data = excluded.data, updated_at = now();
  end if;
  if p_session is not null and p_slot between 0 and 9 then
    insert into public.edu_saves (user_id, kind, slot, data) values (v_id, 'session', p_slot, p_session)
    on conflict (user_id, kind, slot) do update set data = excluded.data, updated_at = now();
    update public.edu_users set last_session_slot = p_slot where id = v_id;
  end if;
  return json_build_object('ok', true);
end $$;

-- 학습 설정(과목·학년·학교·반·번호·별명 …)을 계정에 저장해서 어느 기기에서든 같게 한다
create or replace function public.edu_profile_put(p_token text, p_profile jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  if p_profile is null or char_length(p_profile::text) > 4000 then
    return json_build_object('ok', false, 'error', 'invalid profile');
  end if;
  update public.edu_users set profile = p_profile where id = v_id;
  -- 반·번호·별명이 바뀌면 순위표의 내 줄도 같이 바꾼다
  update public.scores s
     set school_code = coalesce(left(p_profile #>> '{school,code}', 80), s.school_code),
         school_name = coalesce(left(p_profile #>> '{school,name}', 40), s.school_name),
         grade       = case when (p_profile ->> 'grade') ~ '^[1-6]$' then (p_profile ->> 'grade')::int else s.grade end,
         class_name  = coalesce(nullif(left(btrim(p_profile ->> 'className'), 8), ''), s.class_name),
         student_no  = case when (p_profile ->> 'studentNo') ~ '^[0-9]{1,2}$' then (p_profile ->> 'studentNo')::int else s.student_no end,
         nickname    = left(coalesce(p_profile ->> 'nickname', ''), 8)
   where s.uid = v_id::text;
  return json_build_object('ok', true);
end $$;

-- 문제 하나를 풀었을 때 점수를 올린다.
-- 서버가 막는 것: 로그인 안 한 요청, 랭킹 동의가 없는 계정, 한 번에 250점 초과, 3초 안에 연속 요청, 한 시간에 3만 점 초과
create or replace function public.edu_submit_solve(
  p_token text, p_subject text, p_points int, p_wave int, p_streak int, p_perfect boolean
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.edu_user_from_token(p_token);
  v_user public.edu_users%rowtype;
  v_p jsonb;
  v_total int;
begin
  if v_id is null then
    return json_build_object('ok', false, 'error', 'session not found');
  end if;
  if p_subject not in ('kor', 'eng', 'math') or p_points not between 1 and 250
     or p_wave not between 0 and 100000 or p_streak not between 0 and 100000 then
    return json_build_object('ok', false, 'error', 'invalid score');
  end if;
  select * into v_user from public.edu_users where id = v_id for update;
  v_p := v_user.profile;
  if v_p is null or coalesce(v_p ->> 'rankingConsent', 'false') <> 'true'
     or coalesce(v_p #>> '{school,code}', '') = '' then
    return json_build_object('ok', false, 'error', 'consent required');
  end if;
  if v_user.last_submit_at is not null and v_user.last_submit_at > now() - interval '3 seconds' then
    return json_build_object('ok', false, 'error', 'too fast');
  end if;
  -- 한 시간에 3만 점까지 (정상적으로 풀면 닿기 어려운 양이라 자동 프로그램만 걸린다)
  if v_user.hour_start is null or v_user.hour_start < now() - interval '1 hour' then
    v_user.hour_start := now();
    v_user.hour_points := 0;
  end if;
  if v_user.hour_points + p_points > 30000 then
    return json_build_object('ok', false, 'error', 'limit reached');
  end if;
  update public.edu_users
     set last_submit_at = now(), hour_start = v_user.hour_start, hour_points = v_user.hour_points + p_points
   where id = v_id;

  insert into public.scores as s
    (uid, subject, school_code, school_name, grade, class_name, student_no, nickname,
     points, solved, perfect, best_wave, best_streak)
  values (
    v_id::text, p_subject,
    left(v_p #>> '{school,code}', 80),
    left(coalesce(v_p #>> '{school,name}', ''), 40),
    case when (v_p ->> 'grade') ~ '^[1-6]$' then (v_p ->> 'grade')::int else 1 end,
    coalesce(nullif(left(btrim(v_p ->> 'className'), 8), ''), '?'),
    case when (v_p ->> 'studentNo') ~ '^[0-9]{1,2}$' then (v_p ->> 'studentNo')::int else 0 end,
    left(coalesce(v_p ->> 'nickname', ''), 8),
    p_points, 1, case when p_perfect then 1 else 0 end, p_wave + 1, p_streak
  )
  on conflict (uid, subject) do update set
    school_code = excluded.school_code,
    school_name = excluded.school_name,
    grade       = excluded.grade,
    class_name  = excluded.class_name,
    student_no  = excluded.student_no,
    nickname    = excluded.nickname,
    points      = least(s.points + p_points, 100000000),
    solved      = s.solved + 1,
    perfect     = s.perfect + (case when p_perfect then 1 else 0 end),
    best_wave   = greatest(s.best_wave, p_wave + 1),
    best_streak = greatest(s.best_streak, p_streak),
    updated_at  = now()
  returning points into v_total;

  return json_build_object('ok', true, 'points', v_total);
end $$;

create or replace function public.edu_player_count()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('playerCount', (select count(*) from public.edu_users))
$$;

-- #endregion

-- #region 함수 실행 권한: 내부용 함수는 막고, 화면에서 부르는 함수만 연다

revoke execute on function public.edu_user_from_token(text) from public;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'edu_register(text,text)', 'edu_login(text,text)', 'edu_logout(text)', 'edu_info(text)',
    'edu_change_password(text,text)', 'edu_save_get(text,text,int)', 'edu_save_put(text,text,int,text)',
    'edu_save_delete(text,text,int)', 'edu_save_all(text,text,text,int)', 'edu_profile_put(text,jsonb)',
    'edu_submit_solve(text,text,int,int,int,boolean)', 'edu_player_count()'
  ] loop
    execute format('revoke execute on function public.%s from public', fn);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('grant execute on function public.%s to anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function public.%s to authenticated', fn);
    end if;
  end loop;
end $$;

-- #endregion

-- 포케로그_국영수(초등) 랭킹 서버 (Supabase) 설정
-- Supabase 대시보드 → SQL Editor 에 이 내용을 붙여 넣고 Run 을 누르세요.

create table if not exists public.scores (
  uid          text        not null check (char_length(uid) between 8 and 40),
  subject      text        not null check (subject in ('kor', 'eng', 'math')),
  school_code  text        not null check (char_length(school_code) between 1 and 60),
  school_name  text        not null check (char_length(school_name) <= 40),
  grade        int         not null check (grade between 1 and 6),
  class_name   text        not null check (char_length(class_name) between 1 and 8),
  student_no   int         not null check (student_no between 0 and 99),
  nickname     text        not null default '' check (char_length(nickname) <= 8),
  points       int         not null default 0 check (points between 0 and 10000000),
  solved       int         not null default 0 check (solved between 0 and 1000000),
  best_wave    int         not null default 0 check (best_wave between 0 and 100000),
  best_streak  int         not null default 0 check (best_streak between 0 and 100000),
  updated_at   timestamptz not null default now(),
  primary key (uid, subject)
);

create index if not exists scores_school_idx on public.scores (school_code, subject, points desc);
create index if not exists scores_class_idx  on public.scores (school_code, subject, grade, class_name, points desc);

alter table public.scores enable row level security;

-- 누구나 순위표를 볼 수 있고, 점수를 올릴 수 있습니다. (삭제는 불가)
drop policy if exists "scores read"   on public.scores;
drop policy if exists "scores insert" on public.scores;
drop policy if exists "scores update" on public.scores;
create policy "scores read"   on public.scores for select using (true);
create policy "scores insert" on public.scores for insert with check (true);
create policy "scores update" on public.scores for update using (true) with check (true);

-- 점수가 줄어드는 갱신은 막고, 갱신 시각을 자동으로 기록합니다.
create or replace function public.scores_guard() returns trigger language plpgsql as $$
begin
  if new.points < old.points then
    new.points := old.points;
    new.solved := greatest(new.solved, old.solved);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists scores_guard_trg on public.scores;
create trigger scores_guard_trg before update on public.scores
  for each row execute function public.scores_guard();

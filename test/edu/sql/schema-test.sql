-- 서버 함수 동작 검사 (로컬 PostgreSQL 에서 실행). 실패하면 예외로 멈춘다.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.check(name text, cond boolean) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', name; end if;
  raise notice 'ok  - %', name;
end $$;

truncate public.edu_users, public.scores cascade;

-- 회원가입
select pg_temp.check('가입 성공(한글 아이디)', (select (public.edu_register('학생01','abc123')::jsonb ->> 'ok') = 'true'));
select pg_temp.check('같은 아이디(대소문자 무시)는 막는다', (select public.edu_register('학생01','zzz999')::jsonb ->> 'error') = 'failed to add account record');
select pg_temp.check('영문 대소문자 중복', (select (public.edu_register('Tom','abc123')::jsonb ->> 'ok') = 'true') and (select public.edu_register('tOM','abc123')::jsonb ->> 'error') = 'failed to add account record');
select pg_temp.check('너무 짧은 아이디', (select public.edu_register('a','abc123')::jsonb ->> 'error') = 'invalid username');
select pg_temp.check('이상한 글자 아이디', (select public.edu_register('a b!','abc123')::jsonb ->> 'error') = 'invalid username');
select pg_temp.check('너무 긴 아이디', (select public.edu_register(repeat('가',17),'abc123')::jsonb ->> 'error') = 'invalid username');
select pg_temp.check('짧은 비밀번호', (select public.edu_register('student9','123')::jsonb ->> 'error') = 'invalid password');
select pg_temp.check('비밀번호는 암호화되어 저장', (select password_hash like '$2a$%' and password_hash <> 'abc123' from public.edu_users where username_key = '학생01'));

-- 가입 폭주 방지
insert into public.edu_users (username, username_key, password_hash)
  select 'bulk' || g, 'bulk' || g, 'x' from generate_series(1, 300) g;
select pg_temp.check('1시간에 300명이 넘으면 가입을 잠시 막는다', (select public.edu_register('늦은학생','abc123')::jsonb ->> 'error') = 'try again later');
delete from public.edu_users where username_key like 'bulk%';
select pg_temp.check('정리하면 다시 가입 가능', (select (public.edu_register('늦은학생','abc123')::jsonb ->> 'ok') = 'true'));
delete from public.edu_users where username_key = '늦은학생';

-- 로그인
select pg_temp.check('없는 계정', (select public.edu_login('nobody','abc123')::jsonb ->> 'error') = 'account doesn''t exist');
select pg_temp.check('틀린 비밀번호', (select public.edu_login('학생01','wrong1')::jsonb ->> 'error') = 'password doesn''t match');
create temp table t as select public.edu_login('학생01','abc123')::jsonb as r;
select pg_temp.check('로그인 성공: 열쇠를 준다', (select (r ->> 'ok') = 'true' and length(r ->> 'token') = 64 from t));
select pg_temp.check('서버에는 열쇠의 해시만 보관', (select count(*) = 1 and bool_and(token_hash <> (select r ->> 'token' from t)) from public.edu_sessions));
select set_config('t.tok', (select r ->> 'token' from t), false);

select pg_temp.check('내 정보', (select (public.edu_info(current_setting('t.tok'))::jsonb ->> 'username') = '학생01'));
select pg_temp.check('가짜 열쇠는 거절', (select public.edu_info('fake')::jsonb ->> 'error') = 'session not found');

-- 세이브
select pg_temp.check('세이브 없음', (select public.edu_save_get(current_setting('t.tok'),'system',0)::jsonb ->> 'error') = 'save does not exist');
select public.edu_save_put(current_setting('t.tok'),'system',0,'{"trainerId":1}');
select pg_temp.check('시스템 세이브 저장/불러오기', (select public.edu_save_get(current_setting('t.tok'),'system',0)::jsonb ->> 'data') = '{"trainerId":1}');
select public.edu_save_put(current_setting('t.tok'),'session',2,'{"wave":7}');
select pg_temp.check('세션 세이브 + 마지막 슬롯', (select (public.edu_info(current_setting('t.tok'))::jsonb ->> 'last_session_slot') = '2'));
select pg_temp.check('덮어쓰기', (select public.edu_save_put(current_setting('t.tok'),'session',2,'{"wave":8}')::jsonb ->> 'ok') = 'true' and (select public.edu_save_get(current_setting('t.tok'),'session',2)::jsonb ->> 'data') = '{"wave":8}');
select public.edu_save_all(current_setting('t.tok'),'{"trainerId":5}','{"wave":9}',1);
select pg_temp.check('한 번에 저장', (select public.edu_save_get(current_setting('t.tok'),'system',0)::jsonb ->> 'data') = '{"trainerId":5}' and (select public.edu_save_get(current_setting('t.tok'),'session',1)::jsonb ->> 'data') = '{"wave":9}');
select pg_temp.check('잘못된 슬롯', (select public.edu_save_put(current_setting('t.tok'),'session',99,'x')::jsonb ->> 'error') = 'invalid save');
select public.edu_save_delete(current_setting('t.tok'),'session',1);
select pg_temp.check('삭제', (select public.edu_save_get(current_setting('t.tok'),'session',1)::jsonb ->> 'error') = 'save does not exist');

-- 다른 사람의 세이브는 못 본다
select public.edu_register('친구','abc123');
create temp table t2 as select public.edu_login('친구','abc123')::jsonb as r;
select set_config('t.tok2', (select r ->> 'token' from t2), false);
select pg_temp.check('친구는 내 세이브를 못 본다', (select public.edu_save_get(current_setting('t.tok2'),'system',0)::jsonb ->> 'error') = 'save does not exist');

-- 랭킹: 동의·프로필 없이는 못 올린다
select pg_temp.check('프로필 없으면 거절', (select public.edu_submit_solve(current_setting('t.tok'),'math',50,3,1,true)::jsonb ->> 'error') = 'consent required');
select public.edu_profile_put(current_setting('t.tok'), '{"school":{"code":"T10:1","name":"테스트초등학교"},"grade":6,"className":"여울반","studentNo":6,"nickname":"별이","rankingConsent":false}');
select pg_temp.check('동의 안 했으면 거절', (select public.edu_submit_solve(current_setting('t.tok'),'math',50,3,1,true)::jsonb ->> 'error') = 'consent required');
select public.edu_profile_put(current_setting('t.tok'), '{"school":{"code":"T10:1","name":"테스트초등학교"},"grade":6,"className":"여울반","studentNo":6,"nickname":"별이","rankingConsent":true}');
select pg_temp.check('동의하면 점수가 올라간다', (select (public.edu_submit_solve(current_setting('t.tok'),'math',50,3,1,true)::jsonb ->> 'points') = '50'));
select pg_temp.check('3초 안에 또 올리면 거절', (select public.edu_submit_solve(current_setting('t.tok'),'math',50,3,1,true)::jsonb ->> 'error') = 'too fast');
update public.edu_users set last_submit_at = now() - interval '10 seconds';
select pg_temp.check('250점 초과 거절', (select public.edu_submit_solve(current_setting('t.tok'),'math',251,3,1,true)::jsonb ->> 'error') = 'invalid score');
select pg_temp.check('0점·음수 거절', (select public.edu_submit_solve(current_setting('t.tok'),'math',-5,3,1,true)::jsonb ->> 'error') = 'invalid score');
select pg_temp.check('이상한 과목 거절', (select public.edu_submit_solve(current_setting('t.tok'),'art',10,3,1,true)::jsonb ->> 'error') = 'invalid score');
select pg_temp.check('가짜 열쇠 거절', (select public.edu_submit_solve('fake','math',10,3,1,true)::jsonb ->> 'error') = 'session not found');
select pg_temp.check('두 번째 점수가 더해진다', (select (public.edu_submit_solve(current_setting('t.tok'),'math',30,9,4,false)::jsonb ->> 'points') = '80'));
select pg_temp.check('기록: 푼 문제·한 번에 정답·최고 층·연속', (select solved = 2 and perfect = 1 and best_wave = 10 and best_streak = 4 and school_name = '테스트초등학교' and class_name = '여울반' and student_no = 6 from public.scores where subject = 'math'));
select pg_temp.check('내 정보에 점수가 들어 있다', (select jsonb_array_length((public.edu_info(current_setting('t.tok'))::jsonb) -> 'scores') = 1));
-- 프로필을 바꾸면 순위표의 내 줄도 바뀐다
select public.edu_profile_put(current_setting('t.tok'), '{"school":{"code":"T10:1","name":"테스트초등학교"},"grade":6,"className":"새암반","studentNo":7,"nickname":"해님","rankingConsent":true}');
select pg_temp.check('프로필 변경이 순위표에 반영', (select class_name = '새암반' and student_no = 7 and nickname = '해님' from public.scores));

-- 로그인 5번 틀리면 잠금
select public.edu_login('친구','x00000') from generate_series(1,5);
select pg_temp.check('5번 틀리면 잠김', (select public.edu_login('친구','abc123')::jsonb ->> 'error') = 'too many attempts');
update public.edu_users set locked_until = now() - interval '1 minute';
select pg_temp.check('잠금이 풀리면 다시 로그인', (select (public.edu_login('친구','abc123')::jsonb ->> 'ok') = 'true'));

-- 비밀번호 변경
select pg_temp.check('비밀번호 변경', (select public.edu_change_password(current_setting('t.tok'),'newpass1')::jsonb ->> 'ok') = 'true');
select pg_temp.check('옛 비밀번호는 안 된다', (select public.edu_login('학생01','abc123')::jsonb ->> 'error') = 'password doesn''t match');
select pg_temp.check('새 비밀번호', (select (public.edu_login('학생01','newpass1')::jsonb ->> 'ok') = 'true'));

-- 로그아웃
select public.edu_logout(current_setting('t.tok'));
select pg_temp.check('로그아웃하면 열쇠가 무효', (select public.edu_info(current_setting('t.tok'))::jsonb ->> 'error') = 'session not found');

-- 만료된 열쇠
update public.edu_sessions set expires_at = now() - interval '1 second';
select pg_temp.check('만료된 열쇠 거절', (select public.edu_info(current_setting('t.tok2'))::jsonb ->> 'error') = 'session not found');

select pg_temp.check('플레이어 수', (select (public.edu_player_count()::jsonb ->> 'playerCount')::int = 3));

-- 인터넷(anon)에서 직접 접근
set role anon;
select pg_temp.check('anon: 계정 테이블은 못 읽는다', (select count(*) from (select 1) x where not exists (select 1)) = 0);
do $$ begin
  begin perform * from public.edu_users; raise exception 'FAIL: anon 이 edu_users 를 읽음'; exception when insufficient_privilege then null; end;
  begin perform * from public.edu_sessions; raise exception 'FAIL: anon 이 edu_sessions 를 읽음'; exception when insufficient_privilege then null; end;
  begin perform * from public.edu_saves; raise exception 'FAIL: anon 이 edu_saves 를 읽음'; exception when insufficient_privilege then null; end;
  begin update public.scores set points = 999999; raise exception 'FAIL: anon 이 점수를 직접 고침'; exception when insufficient_privilege then null; end;
  begin insert into public.scores (uid,subject,school_code,school_name,grade,class_name,student_no,points) values ('12345678','math','x','x',1,'1',1,5); raise exception 'FAIL: anon 이 점수를 직접 넣음'; exception when insufficient_privilege then null; end;
  begin perform public.edu_user_from_token('x'); raise exception 'FAIL: anon 이 내부 함수를 부름'; exception when insufficient_privilege then null; end;
  raise notice 'ok  - anon 은 테이블을 직접 읽거나 쓸 수 없고, 내부 함수도 못 부른다';
end $$;
select pg_temp.check('anon: 순위표는 읽을 수 있다', (select count(*) from public.scores) = 1);
select pg_temp.check('anon: 함수로 가입 가능', (select (public.edu_register('익명가입','abc123')::jsonb ->> 'ok') = 'true'));
reset role;

\echo ALL SQL TESTS PASSED

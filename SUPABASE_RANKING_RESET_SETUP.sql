-- Supabaseの「SQL Editor」でこのSQLを一度だけ実行してください。
-- ブラウザにDELETE権限を与えず、パスワード一致時だけ全件削除します。

create or replace function public.reset_shooting_ranking(admin_password text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if admin_password is distinct from 'kous0490' then
    raise exception 'Invalid admin password';
  end if;

  delete from public.shooting_scores;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.reset_shooting_ranking(text) from public;
grant execute on function public.reset_shooting_ranking(text) to anon, authenticated;

-- Tend — schema inicial
-- Supabase Auth gerencia auth.users; nossas tabelas vivem em public.*

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type member_role as enum ('owner', 'admin', 'member');
create type space_mode as enum ('simple', 'gamified');
create type recurrence_type as enum ('daily', 'weekly', 'custom');
create type assignment_type as enum ('fixed', 'rotation');
create type occurrence_status as enum ('pending', 'done', 'skipped');

-- ---------------------------------------------------------------------------
-- profiles — espelho público de auth.users
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- homes
-- ---------------------------------------------------------------------------
create table homes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references profiles (id) on delete restrict,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table home_members (
  home_id   uuid not null references homes (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  role      member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

create index home_members_user_idx on home_members (user_id);

-- ---------------------------------------------------------------------------
-- spaces
-- ---------------------------------------------------------------------------
create table spaces (
  id         uuid primary key default gen_random_uuid(),
  home_id    uuid not null references homes (id) on delete cascade,
  name       text not null,
  icon       text,
  mode       space_mode not null default 'simple',
  created_at timestamptz not null default now()
);

create index spaces_home_idx on spaces (home_id);

create table space_members (
  space_id  uuid not null references spaces (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index space_members_user_idx on space_members (user_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table tasks (
  id                       uuid primary key default gen_random_uuid(),
  space_id                 uuid not null references spaces (id) on delete cascade,
  title                    text not null,
  description              text,
  recurrence_type          recurrence_type not null,
  recurrence_days          int[] not null default '{}',   -- 0=dom..6=sab (weekly)
  recurrence_interval_days int,                            -- a cada X dias (custom)
  assignment_type          assignment_type not null,
  assignee_id              uuid references profiles (id) on delete set null, -- fixed
  points                   int not null default 0,
  start_date               date not null default current_date,
  created_by               uuid references profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  archived_at              timestamptz,
  constraint points_non_negative check (points >= 0),
  constraint interval_positive check (recurrence_interval_days is null or recurrence_interval_days > 0)
);

create index tasks_space_idx on tasks (space_id) where archived_at is null;

-- Fila de rodízio (ordem fixa)
create table task_rotation_queue (
  task_id  uuid not null references tasks (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  position int not null,
  primary key (task_id, user_id),
  unique (task_id, position)
);

-- ---------------------------------------------------------------------------
-- task_occurrences
-- ---------------------------------------------------------------------------
create table task_occurrences (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references tasks (id) on delete cascade,
  assigned_to    uuid references profiles (id) on delete set null,
  due_date       date not null,
  status         occurrence_status not null default 'pending',
  completed_at   timestamptz,
  completed_by   uuid references profiles (id) on delete set null,
  points_awarded int not null default 0,
  unique (task_id, due_date)
);

create index occurrences_assigned_idx on task_occurrences (assigned_to, due_date);
create index occurrences_task_idx on task_occurrences (task_id);

-- ---------------------------------------------------------------------------
-- pontos acumulados por space
-- ---------------------------------------------------------------------------
create table space_member_points (
  space_id     uuid not null references spaces (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  total_points int not null default 0,
  primary key (space_id, user_id)
);

-- ---------------------------------------------------------------------------
-- push subscriptions
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

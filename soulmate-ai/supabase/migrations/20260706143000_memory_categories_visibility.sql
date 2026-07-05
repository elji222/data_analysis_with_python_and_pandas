-- Expand memory categories and add visibility levels

alter table public.user_memories
  add column if not exists visibility text;

update public.user_memories
set visibility = 'personal'
where visibility is null;

alter table public.user_memories
  alter column visibility set default 'personal';

alter table public.user_memories
  alter column visibility set not null;

alter table public.user_memories
  drop constraint if exists user_memories_category_check;

update public.user_memories
set category = case category
  when 'identity' then 'basic_information'
  when 'preferences' then 'preferences'
  when 'goals' then 'goals_ambitions'
  when 'work' then 'work_career'
  when 'projects' then 'projects'
  when 'family' then 'family_relationships'
  when 'education' then 'education'
  when 'location' then 'location_lifestyle'
  when 'interests' then 'interests_hobbies'
  when 'communication_style' then 'communication_style'
  when 'important_dates' then 'important_dates'
  when 'other' then 'everything_else'
  else 'everything_else'
end;

alter table public.user_memories
  add constraint user_memories_category_check check (
    category in (
      'basic_information',
      'preferences',
      'communication_style',
      'work_career',
      'projects',
      'goals_ambitions',
      'family_relationships',
      'education',
      'location_lifestyle',
      'interests_hobbies',
      'skills_expertise',
      'health_food_preferences',
      'ai_preferences',
      'important_dates',
      'favorites',
      'everything_else'
    )
  );

alter table public.user_memories
  drop constraint if exists user_memories_visibility_check;

alter table public.user_memories
  add constraint user_memories_visibility_check check (
    visibility in ('personal', 'friends', 'public')
  );

create index if not exists user_memories_visibility_idx
  on public.user_memories (user_id, visibility);

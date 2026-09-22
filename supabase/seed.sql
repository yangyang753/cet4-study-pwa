insert into public.knowledge_points (id, title, category, content_version) values ('kp-vocab', '核心词汇', 'vocabulary', '1.0.0') on conflict do nothing;

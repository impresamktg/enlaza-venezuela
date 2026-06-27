begin;

-- "puerto coral" (la-guaira) — 2 posts, canonical=501b0ec0-c6b9-422b-95cf-b642dc9dea9d
update posts set duplicate_of = '501b0ec0-c6b9-422b-95cf-b642dc9dea9d', status = 'resolved' where id in ('53be1660-0738-4615-af84-2d3da91384e6');
update posts set corroboration_count = (select count(*) from posts where duplicate_of = '501b0ec0-c6b9-422b-95cf-b642dc9dea9d') where id = '501b0ec0-c6b9-422b-95cf-b642dc9dea9d';

commit;

-- skipped (left as separate posts): "celtamar", "caracalleda", "granamar", "ritamar palace", "portofino"

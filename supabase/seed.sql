insert into public.game_cards (id, name, rarity, attack, hp, image_path, sort_order)
overriding system value
values
  (1, 'Gemini 5WA9', 'SSR', 21, 118, '/cards/001-gemini-5wa9.png', 1),
  (2, 'Screenshot 1121', 'SR', 17, 132, '/cards/002-screenshot-1121.png', 2),
  (3, 'ChatGPT 1035', 'SSR', 20, 120, '/cards/003-chatgpt-1035.png', 3),
  (4, 'Gemini M064', 'SR', 16, 138, '/cards/004-gemini-m064.png', 4),
  (5, 'IMG 1588', 'R', 14, 146, '/cards/005-img-1588.jpeg', 5),
  (6, 'IMG 1589', 'R', 15, 140, '/cards/006-img-1589.jpeg', 6),
  (7, '왕준후', 'SSR', 22, 110, '/cards/007-wang-junhu.png', 7),
  (8, 'Evangelion', 'SR', 19, 122, '/cards/008-evangelion.png', 8),
  (9, 'Yaru Junhu', 'SR', 18, 128, '/cards/009-yaru-junhu.jpeg', 9),
  (10, 'Gemini G8MG', 'SSR', 23, 98, '/cards/010-gemini-g8mg.png', 10),
  (11, 'IMG 1584', 'R', 13, 150, '/cards/011-img-1584.jpeg', 11),
  (12, 'Inbound 7265', 'SR', 18, 124, '/cards/012-inbound-7265.png', 12),
  (13, 'Gemini Blank', 'SR', 17, 130, '/cards/013-gemini-blank.png', 13),
  (14, 'Face Swap 53081', 'N', 12, 156, '/cards/014-face-swap-53081.jpeg', 14),
  (15, 'Giraffe', 'SSR', 24, 92, '/cards/015-giraffe.png', 15),
  (16, 'Face Swap 87304', 'N', 11, 162, '/cards/016-face-swap-87304.jpeg', 16),
  (17, 'Screenshot 1132', 'SR', 18, 126, '/cards/017-screenshot-1132.png', 17),
  (18, 'Alley Junhu', 'SSR', 22, 108, '/cards/018-alley-junhu.png', 18),
  (19, 'Nitmol Junhu', 'SR', 16, 136, '/cards/019-nitmol-junhu.png', 19),
  (20, 'ChatGPT 1024', 'SR', 19, 116, '/cards/020-chatgpt-1024.png', 20)
on conflict (id) do nothing;

insert into public.game_rankings (player_name, score, is_player)
values
  ('배준후', 1000, true),
  ('NeonMaster', 1360, false),
  ('SparkQueen', 1280, false),
  ('FlashKing', 1195, false),
  ('CardWizard', 1070, false);

select setval(pg_get_serial_sequence('public.game_cards', 'id'), (select max(id) from public.game_cards));

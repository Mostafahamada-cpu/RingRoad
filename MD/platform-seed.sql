-- ============================================================================
-- Ring Roads PLATFORM — Egyptian demo seed data.
-- Run AFTER platform-setup.sql. Idempotent (on conflict do nothing).
--
-- Creates loginnable demo accounts (shared password below), two teams, and
-- 10+ realistic Egyptian records in every table with valid relationships.
--
--   Demo password for ALL seeded accounts:  RingRoads#2026
--   management@ringroads.eg    Management (company-wide)
--   sara.leader@ringroads.eg   Team Leader — Cairo Gate
--   khaled.leader@ringroads.eg Team Leader — Coast & Compounds
--   omar.agent@ringroads.eg  … + 5 more agents  (see profiles below)
-- ============================================================================
create extension if not exists pgcrypto;

-- ── 1. demo auth users (the profiles trigger auto-creates their profile) ─────
do $$
declare u record; pw text := 'RingRoads#2026';
begin
  for u in select * from (values
    ('a1000000-0000-4000-a000-000000000001'::uuid, 'management@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000011'::uuid, 'sara.leader@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000012'::uuid, 'khaled.leader@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000101'::uuid, 'omar.agent@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000102'::uuid, 'nada.agent@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000103'::uuid, 'youssef.agent@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000201'::uuid, 'mariam.agent@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000202'::uuid, 'kareem.agent@ringroads.eg'),
    ('a1000000-0000-4000-a000-000000000203'::uuid, 'habiba.agent@ringroads.eg')
  ) as t(id, email) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
      u.email, crypt(pw, gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''
    ) on conflict (id) do nothing;
    insert into auth.identities (
      provider_id, id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      u.id::text, gen_random_uuid(), u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
    ) on conflict (provider, provider_id) do nothing;
  end loop;
end $$;

-- ── 2. teams ─────────────────────────────────────────────────────────────────
insert into public.teams (id, name, description, color, leader_id, monthly_goal, kpis, archived) values
 ('b2000000-0000-4000-b000-000000000001','Cairo Gate','New Cairo & West Cairo premium compounds','#F97316','a1000000-0000-4000-a000-000000000011', 40000000, '{"response":2,"satisfaction":94,"lead_conversion":22}', false),
 ('b2000000-0000-4000-b000-000000000002','Coast & Compounds','North Coast, Sokhna, El Gouna & the New Capital','#6A003C','a1000000-0000-4000-a000-000000000012', 35000000, '{"response":3,"satisfaction":90,"lead_conversion":18}', false)
on conflict (id) do nothing;

-- ── 3. profiles: set role / team / details for the seeded accounts ───────────
update public.profiles set name='Yasmine Fouad',  role='management', phone='+201001234500', nationality='Egyptian', performance_rating=5,   joined='2024-02-01' where id='a1000000-0000-4000-a000-000000000001';
update public.profiles set name='Sara Adel',      role='leader', team_id='b2000000-0000-4000-b000-000000000001', phone='+201001234511', nationality='Egyptian', performance_rating=4.8, joined='2024-03-15' where id='a1000000-0000-4000-a000-000000000011';
update public.profiles set name='Khaled Mansour', role='leader', team_id='b2000000-0000-4000-b000-000000000002', phone='+201001234512', nationality='Egyptian', performance_rating=4.6, joined='2024-04-01' where id='a1000000-0000-4000-a000-000000000012';
update public.profiles set name='Omar Farouk',    role='agent',  team_id='b2000000-0000-4000-b000-000000000001', phone='+201001234531', nationality='Egyptian', performance_rating=4.5, joined='2024-06-10' where id='a1000000-0000-4000-a000-000000000101';
update public.profiles set name='Nada Samir',     role='agent',  team_id='b2000000-0000-4000-b000-000000000001', phone='+201001234532', nationality='Egyptian', performance_rating=4.2, joined='2024-07-05' where id='a1000000-0000-4000-a000-000000000102';
update public.profiles set name='Youssef Ibrahim',role='agent',  team_id='b2000000-0000-4000-b000-000000000001', phone='+201001234533', nationality='Egyptian', performance_rating=3.9, joined='2024-09-01' where id='a1000000-0000-4000-a000-000000000103';
update public.profiles set name='Mariam Adel',    role='agent',  team_id='b2000000-0000-4000-b000-000000000002', phone='+201001234541', nationality='Egyptian', performance_rating=4.4, joined='2024-05-20' where id='a1000000-0000-4000-a000-000000000201';
update public.profiles set name='Kareem Hossam',  role='agent',  team_id='b2000000-0000-4000-b000-000000000002', phone='+201001234542', nationality='Egyptian', performance_rating=4.7, joined='2024-06-18' where id='a1000000-0000-4000-a000-000000000202';
update public.profiles set name='Habiba Tarek',   role='agent',  team_id='b2000000-0000-4000-b000-000000000002', phone='+201001234543', nationality='Egyptian', performance_rating=4.0, joined='2024-10-12' where id='a1000000-0000-4000-a000-000000000203';

-- ── 4. properties (14 · real Egyptian projects & areas, EGP) ─────────────────
insert into public.properties
 (id, code, title, ptype, unit_type, price, area, bedrooms, bathrooms, beds, baths, floor, year_built, parking,
  furnished, featured, address, address_en, address_ar, city, governorate, type, status, approval, description,
  project, developer, agent_id, team_id, amenities, images, sold_date, buyer_name, sold_price, commission, payment_plan) values
 ('c3000000-0000-4000-c000-000000000001','RR-1001','Palm Hills October Standalone Villa','villa','villa',12500000,320,4,4,4,4,null,2024,2,true,true,'Palm Hills, 26th of July Corridor','Palm Hills, 26th of July Corridor','بالم هيلز، محور 26 يوليو','6th of October','Giza','sale','sold','available','Landmark standalone villa with private pool and landscaped garden on a corner plot.','Palm Hills October','Palm Hills Developments','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','["pool","garden","security","smart_home"]','[]',null,null,null,null,'10% down / 8 years'),
 ('c3000000-0000-4000-c000-000000000002','RR-1002','Mivida B6 Apartment','apartment','apartment',6800000,185,3,3,3,3,3,2023,1,false,false,'Mivida, New Cairo','Mivida, New Cairo','ميفيدا، القاهرة الجديدة','New Cairo','Cairo','sale','reserved','approved','Bright family apartment overlooking the central park with premium finishing.','Mivida','Emaar Misr','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','["gym","clubhouse","elevator","security"]','[]',null,null,null,null,'15% down / 7 years'),
 ('c3000000-0000-4000-c000-000000000003','RR-1003','Marassi Blanca Chalet','chalet','chalet',9500000,140,2,2,2,2,null,2022,1,true,false,'Marassi, Sidi Abdel Rahman','Marassi, Sidi Abdel Rahman','مراسي، سيدي عبد الرحمن','North Coast','Matrouh','sale','sold','approved','First-row chalet with direct lagoon access and full sea view.','Marassi','Emaar Misr','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','["sea_view","pool","clubhouse"]','[]', current_date - 12,'Tarek El-Masry',9800000,245000,'20% down / 5 years'),
 ('c3000000-0000-4000-c000-000000000004','RR-1004','Mountain View iCity Townhouse','townhouse','townhouse',8200000,240,3,3,3,3,null,2024,2,false,false,'Mountain View iCity, New Cairo','Mountain View iCity, New Cairo','ماونتن فيو آي سيتي، القاهرة الجديدة','New Cairo','Cairo','sale','available','approved','Corner townhouse with roof and garden in the iVilla district.','Mountain View iCity','DMG','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','["garden","security","kids_area"]','[]',null,null,null,null,'10% down / 9 years'),
 ('c3000000-0000-4000-c000-000000000005','RR-1005','ZED East Loft','apartment','apartment',5400000,120,2,2,2,2,7,2023,1,true,false,'ZED East, New Cairo','ZED East, New Cairo','زيد إيست، القاهرة الجديدة','New Cairo','Cairo','sale','sold','approved','Fully finished loft with smart-home system and club membership.','ZED East','Ora Developers','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','["gym","smart_home","clubhouse"]','[]', current_date - 40,'Amr Zaki',5400000,135000,'12% down / 6 years'),
 ('c3000000-0000-4000-c000-000000000006','RR-1006','SODIC Villette Duplex','duplex','duplex',7900000,215,3,3,3,3,null,2024,2,false,false,'Villette, New Cairo','Villette, New Cairo','فيليت، القاهرة الجديدة','New Cairo','Cairo','sale','available','approved','Garden duplex with double-height reception in SODIC Villette.','Villette','SODIC','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','["garden","gym","security"]','[]',null,null,null,null,'10% down / 8 years'),
 ('c3000000-0000-4000-c000-000000000007','RR-1007','Hyde Park Penthouse','penthouse','penthouse',11200000,260,4,4,4,4,12,2023,2,true,true,'Hyde Park, New Cairo','Hyde Park, New Cairo','هايد بارك، القاهرة الجديدة','New Cairo','Cairo','sale','reserved','approved','Panoramic penthouse over the 25-acre central park with private roof.','Hyde Park','Hyde Park Developments','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','["sea_view","gym","clubhouse","elevator"]','[]',null,null,null,null,'15% down / 7 years'),
 ('c3000000-0000-4000-c000-000000000008','RR-1008','Telal Ain Sokhna Chalet','chalet','chalet',4600000,110,2,1,2,1,1,2022,1,true,false,'Telal, Ain Sokhna','Telal, Ain Sokhna','تلال، العين السخنة','Ain Sokhna','Suez','sale','available','approved','Sea-view chalet steps from the beach in Telal Sokhna.','Telal','Roya Developments','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','["sea_view","pool"]','[]',null,null,null,null,'20% down / 5 years'),
 ('c3000000-0000-4000-c000-000000000009','RR-1009','IL Monte Galala Chalet','chalet','chalet',6100000,130,3,2,3,2,2,2023,1,false,false,'IL Monte Galala, Ain Sokhna','IL Monte Galala, Ain Sokhna','إيل مونتي جلالة، العين السخنة','Ain Sokhna','Suez','sale','approved','approved','Mountain-and-sea view chalet in the funicular district.','IL Monte Galala','Tatweer Misr','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','["sea_view","pool","clubhouse"]','[]', current_date - 68,'Dina Fouad',6300000,157500,'15% down / 6 years'),
 ('c3000000-0000-4000-c000-000000000010','RR-1010','Madinaty B12 Apartment','apartment','apartment',4900000,160,3,2,3,2,4,2021,1,false,false,'Madinaty, B12','Madinaty, B12','مدينتي، B12','Madinaty','Cairo','sale','available','approved','Spacious apartment with golf-course view in Madinaty.','Madinaty','Talaat Moustafa Group','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','["garden","security","kids_area"]','[]',null,null,null,null,'over 8 years'),
 ('c3000000-0000-4000-c000-000000000011','RR-1011','Al Rehab Family Apartment','apartment','apartment',3700000,155,3,2,3,2,2,2019,1,false,false,'Al Rehab City, Second Phase','Al Rehab City, Second Phase','الرحاب، المرحلة الثانية','New Cairo','Cairo','sale','available','approved','Well-kept family apartment near services in Al Rehab.','Al Rehab','Talaat Moustafa Group','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','["elevator","security"]','[]',null,null,null,null,'cash or 3 years'),
 ('c3000000-0000-4000-c000-000000000012','RR-1012','El Gouna Ancient Sands Villa','villa','villa',15300000,380,5,5,5,5,null,2024,3,true,true,'Ancient Sands, El Gouna','Ancient Sands, El Gouna','أنشنت ساندز، الجونة','El Gouna','Red Sea','sale','available','approved','Golf villa with private pool and lagoon frontage in El Gouna.','El Gouna','Orascom Development','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','["pool","sea_view","garden","smart_home"]','[]',null,null,null,null,'10% down / 6 years'),
 ('c3000000-0000-4000-c000-000000000013','RR-1013','New Capital R7 Office','office','office',3300000,90,0,1,0,1,6,2023,1,false,false,'R7, New Administrative Capital','R7, New Administrative Capital','آر7، العاصمة الإدارية','New Administrative Capital','Cairo','sale','approved','approved','Finished office unit in a prime R7 business tower.','The Loft','Living Yards','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','["elevator","security","central_ac"]','[]', current_date - 95,'Mohamed Al Nahyan',3450000,86250,'10% down / 5 years'),
 ('c3000000-0000-4000-c000-000000000014','RR-1014','Zamalek Classic Apartment','apartment','apartment',45000,220,3,2,3,2,3,1978,0,true,false,'Zamalek, 26th of July St','Zamalek, 26th of July St','الزمالك، شارع 26 يوليو','Zamalek','Cairo','rent','available','approved','Renovated classic apartment with Nile-side breeze in Zamalek, monthly rent.','—','—','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','["balcony","elevator"]','[]',null,null,null,null,'12-month contract')
on conflict (id) do nothing;

-- ── 5. clients (12 · Egyptian & Gulf buyers) ─────────────────────────────────
insert into public.clients
 (id, name, phone, email, nationality, budget, preferred_area, preferred_unit_type, notes, stage, agent_id, team_id) values
 ('d4000000-0000-4000-d000-000000000001','Ahmed Hassan','+201002345001','ahmed.hassan@example.com','Egyptian',7000000,'New Cairo','apartment','Wants delivery within a year, high floor.','negotiating','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001'),
 ('d4000000-0000-4000-d000-000000000002','Mona Salah','+201002345002','mona.salah@example.com','Egyptian',5000000,'Sheikh Zayed','apartment','First-time buyer, prefers ready-to-move.','contacted','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001'),
 ('d4000000-0000-4000-d000-000000000003','Tarek El-Masry','+201002345003','tarek.elmasry@example.com','Egyptian',12000000,'North Coast','chalet','Summer home, closed on Marassi.','contract_signed','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001'),
 ('d4000000-0000-4000-d000-000000000004','Salma Nabil','+201002345004','salma.nabil@example.com','Egyptian',6000000,'New Cairo','duplex','Looking for garden units only.','new_lead','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001'),
 ('d4000000-0000-4000-d000-000000000005','Fahad Al-Otaibi','+201002345005','fahad.otaibi@example.com','Saudi',15000000,'El Gouna','villa','Investor, cash buyer, El Gouna focus.','negotiating','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000006','Layla Haddad','+201002345006','layla.haddad@example.com','Lebanese',8000000,'New Cairo','townhouse','Relocating to Cairo, needs schools nearby.','contacted','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000007','Omar Sherif','+201002345007','omar.sherif@example.com','Egyptian',4500000,'Madinaty','apartment','Budget-sensitive, decided to wait.','visit_scheduled','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000008','Dina Fouad','+201002345008','dina.fouad@example.com','Egyptian',9000000,'Ain Sokhna','chalet','Closed on IL Monte Galala.','contract_signed','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000009','Hassan Ali','+201002345009','hassan.ali@example.com','Egyptian',3500000,'Al Rehab','apartment','Went with another broker.','new_lead','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000010','Mohamed Al Nahyan','+201002345010','m.alnahyan@example.com','Emirati',20000000,'New Administrative Capital','office','Commercial investor, closed an R7 office.','contract_signed','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002'),
 ('d4000000-0000-4000-d000-000000000011','Nourhan Sami','+201002345011','nourhan.sami@example.com','Egyptian',6500000,'New Cairo','penthouse','Reserved Hyde Park penthouse.','reservation','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001'),
 ('d4000000-0000-4000-d000-000000000012','Amr Zaki','+201002345012','amr.zaki@example.com','Egyptian',5800000,'New Cairo','apartment','Closed on ZED East loft.','contract_signed','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001')
on conflict (id) do nothing;

-- ── 6. deals (12 · won / lost / active pipeline) ─────────────────────────────
insert into public.deals
 (id, client_id, property_id, agent, agent_id, team_id, stage, value, commission_pct, agent_share_pct, company_share_pct, closed_at) values
 ('e5000000-0000-4000-e000-000000000001','d4000000-0000-4000-d000-000000000003','c3000000-0000-4000-c000-000000000003','Omar Farouk','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','won',9800000,2.5,40,60, current_date - 12),
 ('e5000000-0000-4000-e000-000000000002','d4000000-0000-4000-d000-000000000012','c3000000-0000-4000-c000-000000000005','Nada Samir','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','won',5400000,2.5,40,60, current_date - 40),
 ('e5000000-0000-4000-e000-000000000003','d4000000-0000-4000-d000-000000000008','c3000000-0000-4000-c000-000000000009','Kareem Hossam','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','won',6300000,2.5,40,60, current_date - 68),
 ('e5000000-0000-4000-e000-000000000004','d4000000-0000-4000-d000-000000000010','c3000000-0000-4000-c000-000000000013','Habiba Tarek','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','won',3450000,2.5,40,60, current_date - 95),
 ('e5000000-0000-4000-e000-000000000005','d4000000-0000-4000-d000-000000000001','c3000000-0000-4000-c000-000000000002','Omar Farouk','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','negotiation',6800000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000006','d4000000-0000-4000-d000-000000000005','c3000000-0000-4000-c000-000000000012','Kareem Hossam','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','negotiation',15300000,2.0,45,55, null),
 ('e5000000-0000-4000-e000-000000000007','d4000000-0000-4000-d000-000000000006','c3000000-0000-4000-c000-000000000004','Mariam Adel','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','visit',8200000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000008','d4000000-0000-4000-d000-000000000004','c3000000-0000-4000-c000-000000000006','Youssef Ibrahim','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','lead',7900000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000009','d4000000-0000-4000-d000-000000000011','c3000000-0000-4000-c000-000000000007','Youssef Ibrahim','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','reservation',11200000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000010','d4000000-0000-4000-d000-000000000002','c3000000-0000-4000-c000-000000000001','Nada Samir','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','contacted',12500000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000011','d4000000-0000-4000-d000-000000000009','c3000000-0000-4000-c000-000000000011','Habiba Tarek','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','lost',3700000,2.5,40,60, null),
 ('e5000000-0000-4000-e000-000000000012','d4000000-0000-4000-d000-000000000007','c3000000-0000-4000-c000-000000000010','Mariam Adel','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','lost',4900000,2.5,40,60, null)
on conflict (id) do nothing;

-- ── 7. followups (12 · overdue / today / upcoming, mixed done) ───────────────
insert into public.followups
 (id, client_id, agent_id, team_id, title, kind, due_at, done, notes) values
 ('f6000000-0000-4000-f000-000000000001','d4000000-0000-4000-d000-000000000001','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','Call Ahmed re: Mivida payment plan','call', now() + interval '3 hours', false,'Send updated installment sheet.'),
 ('f6000000-0000-4000-f000-000000000002','d4000000-0000-4000-d000-000000000002','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','WhatsApp Mona ready-to-move options','call', now() + interval '6 hours', false, null),
 ('f6000000-0000-4000-f000-000000000003','d4000000-0000-4000-d000-000000000004','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','Site visit — SODIC Villette','visit', now() + interval '1 day', false,'Meet at sales gate 12:00.'),
 ('f6000000-0000-4000-f000-000000000004','d4000000-0000-4000-d000-000000000011','a1000000-0000-4000-a000-000000000103','b2000000-0000-4000-b000-000000000001','Collect Hyde Park reservation cheque','meeting', now() + interval '2 days', false, null),
 ('f6000000-0000-4000-f000-000000000005','d4000000-0000-4000-d000-000000000005','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','Call Fahad — El Gouna final price','call', now() - interval '5 hours', false,'Overdue — Gulf investor, follow up today.'),
 ('f6000000-0000-4000-f000-000000000006','d4000000-0000-4000-d000-000000000006','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','Send Layla school-district brochure','followup', now() - interval '1 day', false, null),
 ('f6000000-0000-4000-f000-000000000007','d4000000-0000-4000-d000-000000000007','a1000000-0000-4000-a000-000000000201','b2000000-0000-4000-b000-000000000002','Madinaty viewing with Omar Sherif','visit', now() + interval '4 hours', false, null),
 ('f6000000-0000-4000-f000-000000000008','d4000000-0000-4000-d000-000000000003','a1000000-0000-4000-a000-000000000101','b2000000-0000-4000-b000-000000000001','Marassi handover paperwork','meeting', now() - interval '3 days', true,'Completed — keys delivered.'),
 ('f6000000-0000-4000-f000-000000000009','d4000000-0000-4000-d000-000000000008','a1000000-0000-4000-a000-000000000202','b2000000-0000-4000-b000-000000000002','IL Monte contract signature','meeting', now() - interval '10 days', true,'Signed.'),
 ('f6000000-0000-4000-f000-000000000010','d4000000-0000-4000-d000-000000000012','a1000000-0000-4000-a000-000000000102','b2000000-0000-4000-b000-000000000001','ZED East move-in coordination','followup', now() - interval '20 days', true, null),
 ('f6000000-0000-4000-f000-000000000011','d4000000-0000-4000-d000-000000000010','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','New Capital office tax docs','other', now() + interval '3 days', false, null),
 ('f6000000-0000-4000-f000-000000000012','d4000000-0000-4000-d000-000000000009','a1000000-0000-4000-a000-000000000203','b2000000-0000-4000-b000-000000000002','Re-engage Hassan with Rehab resale','call', now() + interval '5 days', false,'Lost to competitor — try new inventory.')
on conflict (id) do nothing;

-- ── 8. tasks (team to-dos) ───────────────────────────────────────────────────
insert into public.tasks (id, team_id, title, notes, assignee_id, due, priority, done) values
 ('17000000-0000-4000-a000-000000000001','b2000000-0000-4000-b000-000000000001','Refresh Palm Hills photo set','Reshoot villa exterior', 'a1000000-0000-4000-a000-000000000101', current_date, 'high', false),
 ('17000000-0000-4000-a000-000000000002','b2000000-0000-4000-b000-000000000001','Update Hyde Park price list','New Q3 prices from developer', 'a1000000-0000-4000-a000-000000000103', current_date + 2, 'normal', false),
 ('17000000-0000-4000-a000-000000000003','b2000000-0000-4000-b000-000000000001','Weekly pipeline review prep','Compile team numbers for the leader', 'a1000000-0000-4000-a000-000000000102', current_date - 1, 'normal', false),
 ('17000000-0000-4000-a000-000000000004','b2000000-0000-4000-b000-000000000001','Follow up ZED East move-in','Coordinate with developer', 'a1000000-0000-4000-a000-000000000102', current_date - 4, 'low', true),
 ('17000000-0000-4000-a000-000000000005','b2000000-0000-4000-b000-000000000001','Prepare Mivida offer letter',null, 'a1000000-0000-4000-a000-000000000101', current_date + 1, 'high', false),
 ('17000000-0000-4000-a000-000000000006','b2000000-0000-4000-b000-000000000002','El Gouna villa investor deck','For Fahad Al-Otaibi', 'a1000000-0000-4000-a000-000000000202', current_date, 'high', false),
 ('17000000-0000-4000-a000-000000000007','b2000000-0000-4000-b000-000000000002','Book Madinaty viewing slots',null, 'a1000000-0000-4000-a000-000000000201', current_date + 3, 'normal', false),
 ('17000000-0000-4000-a000-000000000008','b2000000-0000-4000-b000-000000000002','Sokhna inventory audit','Check availability with Roya', 'a1000000-0000-4000-a000-000000000202', current_date - 2, 'normal', false),
 ('17000000-0000-4000-a000-000000000009','b2000000-0000-4000-b000-000000000002','New Capital office aftercare','Handover feedback call', 'a1000000-0000-4000-a000-000000000203', current_date + 5, 'low', false),
 ('17000000-0000-4000-a000-000000000010','b2000000-0000-4000-b000-000000000002','Refresh El Gouna listing copy',null, 'a1000000-0000-4000-a000-000000000202', current_date - 6, 'low', true)
on conflict (id) do nothing;

-- ── 9. events (team calendar) ────────────────────────────────────────────────
insert into public.events (id, team_id, title, kind, starts_at, notes) values
 ('28000000-0000-4000-a000-000000000001','b2000000-0000-4000-b000-000000000001','Weekly pipeline review','meeting', date_trunc('day', now()) + interval '2 days 11 hours', null),
 ('28000000-0000-4000-a000-000000000002','b2000000-0000-4000-b000-000000000001','Site visit — SODIC Villette','visit', date_trunc('day', now()) + interval '1 day 12 hours', 'Client: Salma Nabil'),
 ('28000000-0000-4000-a000-000000000003','b2000000-0000-4000-b000-000000000001','Hyde Park reservation signing','meeting', date_trunc('day', now()) + interval '2 days 15 hours', null),
 ('28000000-0000-4000-a000-000000000004','b2000000-0000-4000-b000-000000000001','Ahmed Hassan follow-up call','followup', date_trunc('day', now()) + interval '3 hours', null),
 ('28000000-0000-4000-a000-000000000005','b2000000-0000-4000-b000-000000000002','El Gouna investor meeting','meeting', date_trunc('day', now()) + interval '4 hours', 'Fahad Al-Otaibi'),
 ('28000000-0000-4000-a000-000000000006','b2000000-0000-4000-b000-000000000002','Madinaty viewing','visit', date_trunc('day', now()) + interval '4 days 13 hours', 'Omar Sherif'),
 ('28000000-0000-4000-a000-000000000007','b2000000-0000-4000-b000-000000000002','Team monthly target sync','meeting', date_trunc('day', now()) + interval '6 days 10 hours', null),
 ('28000000-0000-4000-a000-000000000008','b2000000-0000-4000-b000-000000000002','Sokhna client tour','visit', date_trunc('day', now()) + interval '5 days 9 hours', null)
on conflict (id) do nothing;

-- ── 10. categories (property types EN/AR) ────────────────────────────────────
insert into public.categories (kind, slug, name_en, name_ar, sort) values
 ('ptype','apartment','Apartment','شقة',1),
 ('ptype','villa','Villa','فيلا',2),
 ('ptype','townhouse','Townhouse','تاون هاوس',3),
 ('ptype','duplex','Duplex','دوبلكس',4),
 ('ptype','penthouse','Penthouse','بنتهاوس',5),
 ('ptype','studio','Studio','ستوديو',6),
 ('ptype','chalet','Chalet','شاليه',7),
 ('ptype','office','Office','مكتب',8),
 ('ptype','retail','Retail','محل تجاري',9),
 ('ptype','land','Land','أرض',10)
on conflict (kind, slug) do nothing;

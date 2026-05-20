-- Seed employees + child rows for the V2 portal demo.
-- Idempotent: safe to re-run; uses ON CONFLICT on email.

-- Priya Sharma
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Priya Sharma','Senior Associate','Assurance','Canada',
    '4 years, 3 months','1 year, 8 months','David Chen (Manager)','priya.sharma@clearhouse.ca','(647) 555-0192',
    4.2,'G','Ready Now',
    'Priya envisions growing into a managerial role within the Assurance practice, eventually leading a team of 5-8 associates. She is passionate about process improvement and wants to develop expertise in IFRS advisory.','Priya Sharma delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Priya Sharma acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Priya Sharma met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Priya Sharma''s career vision is to grow within the Assurance practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Priya Sharma has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Priya Sharma is rated as ''Ready Now''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_1 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_1), 'Thought', 'G', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_1), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_1), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_1), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_1), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_1), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_1), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_1), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_1), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_1), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_1), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_1), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_1), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_1), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_1), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_1), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_1), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_1), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_1), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_1;

-- Arun Patel
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Arun Patel','Associate','Tax','India',
    '2 years, 1 month','2 years, 1 month','Michael Roberts (Manager)','arun.patel@clearhouse.ca','+91 98765 43210',
    3.5,'G','Ready Soon',
    'Arun aims to specialize in international tax compliance, particularly cross-border Canada-India transactions. He sees himself as a tax advisory specialist within 3 years.','Arun Patel delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Arun Patel acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Arun Patel met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Arun Patel''s career vision is to grow within the Tax practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Arun Patel has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Arun Patel is rated as ''Ready Soon''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_2 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_2), 'Thought', 'G', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_2), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_2), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_2), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_2), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_2), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_2), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_2), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_2), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_2), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_2), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_2), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_2), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_2), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_2), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_2), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_2), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_2), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_2), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_2;

-- David Chen
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'David Chen','Manager','Assurance','Canada',
    '8 years, 6 months','3 years, 2 months','Sarb Clearhouse (Partner)','david.chen@clearhouse.ca','(905) 555-0147',
    4.6,'E','Well Placed',
    'David aspires to become a Partner within 5 years, focusing on growing the firm''s mid-market assurance practice and mentoring the next generation of managers.','David Chen delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','David Chen acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, David Chen met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','David Chen''s career vision is to grow within the Assurance practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','David Chen has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','David Chen is rated as ''Well Placed''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_3 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_3), 'Thought', 'E', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_3), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_3), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_3), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_3), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_3), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_3), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_3), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_3), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_3), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_3), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_3), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_3), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_3), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_3), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_3), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_3), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_3), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_3), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_3;

-- Emily Tremblay
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Emily Tremblay','Intermediate','Advisory','Canada',
    '1 year, 9 months','1 year, 9 months','David Chen (Manager)','emily.tremblay@clearhouse.ca','(416) 555-0283',
    2.8,'M','Ready Later',
    'Emily is exploring whether she wants to pursue advisory consulting or move toward a project management role. She values variety in her work assignments.','Emily Tremblay delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Emily Tremblay acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Emily Tremblay met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Emily Tremblay''s career vision is to grow within the Advisory practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Emily Tremblay has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Emily Tremblay is rated as ''Ready Later''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_4 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_4), 'Thought', 'M', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_4), 'Results', 'G', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_4), 'Expertise', 'M', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_4), 'People', 'M', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_4), 'Self', 'NI', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_4), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_4), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_4), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_4), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_4), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_4), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_4), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_4), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_4), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_4), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_4), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_4), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_4), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_4), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_4;

-- Gurpreet Dhillon
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Gurpreet Dhillon','Senior Associate','Tax','Canada',
    '5 years, 0 months','2 years, 4 months','Michael Roberts (Manager)','gurpreet.dhillon@clearhouse.ca','(647) 555-0371',
    4.0,'G','Ready Now',
    'Gurpreet wants to become a recognized tax specialist, eventually leading the firm''s corporate tax practice and developing expertise in tax planning for owner-managed businesses.','Gurpreet Dhillon delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Gurpreet Dhillon acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Gurpreet Dhillon met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Gurpreet Dhillon''s career vision is to grow within the Tax practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Gurpreet Dhillon has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Gurpreet Dhillon is rated as ''Ready Now''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_5 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_5), 'Thought', 'G', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_5), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_5), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_5), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_5), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_5), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_5), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_5), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_5), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_5), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_5), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_5), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_5), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_5), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_5), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_5), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_5), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_5), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_5), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_5;

-- Riya Kapoor
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Riya Kapoor','Associate','Assurance','India',
    '1 year, 5 months','1 year, 5 months','David Chen (Manager)','riya.kapoor@clearhouse.ca','+91 99887 76655',
    3.4,'M','Ready Soon',
    'Riya sees herself growing within assurance, with a particular interest in technology audits and data analytics. She wants to bridge accounting and tech.','Riya Kapoor delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Riya Kapoor acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Riya Kapoor met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Riya Kapoor''s career vision is to grow within the Assurance practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Riya Kapoor has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Riya Kapoor is rated as ''Ready Soon''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_6 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_6), 'Thought', 'M', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_6), 'Results', 'G', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_6), 'Expertise', 'M', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_6), 'People', 'M', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_6), 'Self', 'NI', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_6), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_6), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_6), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_6), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_6), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_6), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_6), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_6), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_6), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_6), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_6), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_6), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_6), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_6), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_6;

-- Michael Roberts
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Michael Roberts','Manager','Tax','Canada',
    '10 years, 2 months','4 years, 7 months','Sarb Clearhouse (Partner)','michael.roberts@clearhouse.ca','(905) 555-0492',
    4.5,'E','Well Placed',
    'Michael aims to expand the tax department''s service offerings into US cross-border tax and estate planning. He envisions building a team of 10+ dedicated tax professionals.','Michael Roberts delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Michael Roberts acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Michael Roberts met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Michael Roberts''s career vision is to grow within the Tax practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Michael Roberts has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Michael Roberts is rated as ''Well Placed''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_7 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_7), 'Thought', 'E', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_7), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_7), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_7), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_7), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_7), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_7), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_7), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_7), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_7), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_7), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_7), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_7), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_7), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_7), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_7), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_7), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_7), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_7), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_7;

-- Anita Desai
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Anita Desai','Intermediate','Operations','India',
    '3 years, 0 months','1 year, 2 months','Michael Roberts (Manager)','anita.desai@clearhouse.ca','+91 98765 11223',
    3.3,'M','Ready Soon',
    'Anita wants to streamline the firm''s internal operations and eventually lead the operations department. She is passionate about process automation and efficiency.','Anita Desai delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Anita Desai acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Anita Desai met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Anita Desai''s career vision is to grow within the Operations practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Anita Desai has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Anita Desai is rated as ''Ready Soon''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_8 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_8), 'Thought', 'M', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_8), 'Results', 'G', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_8), 'Expertise', 'M', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_8), 'People', 'M', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_8), 'Self', 'NI', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_8), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_8), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_8), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_8), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_8), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_8), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_8), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_8), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_8), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_8), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_8), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_8), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_8), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_8), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_8;

-- James Wilson
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'James Wilson','Associate','Advisory','Canada',
    '0 years, 10 months','0 years, 10 months','David Chen (Manager)','james.wilson@clearhouse.ca','(416) 555-0518',
    2.9,'M','Ready Later',
    'James is still exploring his career path but is drawn to advisory work, particularly business valuations and due diligence engagements.','James Wilson delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','James Wilson acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, James Wilson met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','James Wilson''s career vision is to grow within the Advisory practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','James Wilson has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','James Wilson is rated as ''Ready Later''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_9 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_9), 'Thought', 'M', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_9), 'Results', 'G', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_9), 'Expertise', 'M', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_9), 'People', 'M', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_9), 'Self', 'NI', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_9), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_9), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_9), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_9), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_9), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_9), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_9), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_9), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_9), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_9), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_9), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_9), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_9), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_9), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_9;

-- Neha Malhotra
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Neha Malhotra','Senior Associate','Tax','India',
    '6 years, 1 month','2 years, 9 months','Michael Roberts (Manager)','neha.malhotra@clearhouse.ca','+91 99001 22334',
    4.1,'G','Ready Now',
    'Neha aspires to become a senior tax manager specializing in corporate restructuring and M&A tax advisory. She wants to lead cross-border engagements between Canada and India.','Neha Malhotra delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Neha Malhotra acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Neha Malhotra met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Neha Malhotra''s career vision is to grow within the Tax practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Neha Malhotra has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Neha Malhotra is rated as ''Ready Now''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_10 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_10), 'Thought', 'G', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_10), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_10), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_10), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_10), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_10), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_10), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_10), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_10), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_10), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_10), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_10), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_10), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_10), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_10), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_10), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_10), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_10), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_10), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_10;

-- Karan Operations Lead
with ins as (
  insert into public.employees (
    name, position, department, location,
    tenure_with_firm, tenure_in_role, supervisor, email, phone,
    current_year_rating, current_year_rating_code, potential_rating,
    bff_summary, performance_what_went_well, performance_what_could_go_better,
    performance_summary, career_aspirations_summary, dev_plan_summary, growth_rationale
  ) values (
    'Karan Operations Lead','Operations','Operations','India',
    '2 years, 6 months','2 years, 6 months','Anita Desai (Operations)','karan.opslead@clearhouse.ca','+91 98765 99001',
    3.8,'G','Well Placed',
    'Karan is focused on building out the firm''s operational backbone — finance ops, vendor management, and internal tooling. He aspires to lead a 6-person operations team within 18 months.','Karan Operations Lead delivered strong work across their engagements this year. They took ownership of complex files and earned positive client and peer feedback. Their reliability and growth in technical depth were standout strengths this review period.','Karan Operations Lead acknowledges that earlier escalation of issues and better time management during peak season would have improved outcomes on a couple of files. They identified workload prioritisation as a specific area to work on.',
    'Overall, Karan Operations Lead met and frequently exceeded the expectations of their role. Performance over the past 12 months has been notable, particularly in independent file management and client relationships.','Karan Operations Lead''s career vision is to grow within the Operations practice over the next 2-3 years, taking on progressively more complex engagements and people-leadership responsibilities.','Karan Operations Lead has made steady progress against last cycle''s development goals. Focus for the next 12 months is on deepening technical expertise, expanding sector exposure, and building leadership skills.','Karan Operations Lead is rated as ''Well Placed''. Rationale: demonstrated strong technical ability and growing influence within the team. Recommend revisiting readiness in the next review cycle once additional managerial exposure has been gained.'
  )
  on conflict (email) do update set name = excluded.name
  returning id
)
select id as employee_id into temporary emp_11 from ins;

insert into public.employee_core_competencies (employee_id, competency_name, rating_code, commentary) values
  ((select employee_id from emp_11), 'Thought', 'G', 'Demonstrates strong analytical thinking on engagement files. Proactively identifies risk areas. Could push further on innovative approaches to recurring challenges.'),
  ((select employee_id from emp_11), 'Results', 'E', 'Consistently meets deadlines and delivers high-quality outputs. Led several engagements with minimal supervision.'),
  ((select employee_id from emp_11), 'Expertise', 'G', 'Solid technical knowledge. Continues to build sector-specific depth. Identified specific certifications to pursue this cycle.'),
  ((select employee_id from emp_11), 'People', 'G', 'Effective communicator with clients and peers. Mentors junior colleagues. Working on confidence when presenting to senior leadership.'),
  ((select employee_id from emp_11), 'Self', 'M', 'Self-aware and open to feedback. Identified workload prioritisation as an area to develop further during peak season.')
on conflict (employee_id, competency_name) do nothing;

insert into public.employee_dev_plan_rows (employee_id, objective, activities, support_resources, target_date, sort_order) values
  ((select employee_id from emp_11), 'Deepen technical expertise', 'Attend one advanced technical training course relevant to discipline', 'Course registration fee, study leave', '2026-09-30', 0),
  ((select employee_id from emp_11), 'Build leadership skills', 'Enroll in Leadership Fundamentals program; present at 2 internal team sessions', 'Leadership training budget, mentor pairing', '2026-12-31', 1),
  ((select employee_id from emp_11), 'Expand sector exposure', 'Shadow one cross-discipline engagement this year', 'Assignment from supervising Manager', '2027-03-31', 2);

insert into public.employee_interpersonal (employee_id, skill_area, assessment_text) values
  ((select employee_id from emp_11), 'Client Communication', 'Communicates clearly and professionally with clients. Translates complex concepts into understandable language.'),
  ((select employee_id from emp_11), 'Team Collaboration', 'Actively supports team members during busy season. Volunteers to help peers with overflow work.'),
  ((select employee_id from emp_11), 'Adaptability', 'Adjusts well to new tools and processes. Comfortable shifting priorities when engagement demands change.'),
  ((select employee_id from emp_11), 'Problem-Solving', 'Strong analytical thinker. Proactively identifies potential issues before they escalate.'),
  ((select employee_id from emp_11), 'Initiative', 'Has proposed process improvements that reduced setup or review time on engagements.'),
  ((select employee_id from emp_11), 'Commitment to Firm Values', 'Consistently demonstrates integrity, professionalism, and a client-first mindset.'),
  ((select employee_id from emp_11), 'Dependability During Peak Seasons', 'Highly dependable. Available for extended hours during peak season without quality slipping.'),
  ((select employee_id from emp_11), 'Support for Team Members', 'Acts as an informal mentor to newer associates. Conducts knowledge-sharing sessions.'),
  ((select employee_id from emp_11), 'Contributions to Firm Culture', 'Engaged in firm cultural and community initiatives.')
on conflict (employee_id, skill_area) do nothing;

insert into public.management_notes (employee_id, comment_text, comment_by) values
  ((select employee_id from emp_11), 'Handled their primary engagement independently this quarter. Impressed with attention to detail.', 'David Chen'),
  ((select employee_id from emp_11), 'Discussed career development goals. Aligned on focus areas for the next 12 months.', 'Sarb Clearhouse');
drop table emp_11;


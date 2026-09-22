-- ==============================================================================
-- TopVeda Phase 4.1 Step 5I: Legacy / Dummy Content Migration into Super Admin CMS
-- Idempotent SQL Seed for Educational Boards, Classes, Subjects, Courses, Batches,
-- Lectures, Live Classes, Hero Banners, Quotes, Hub Items, Study Materials, & Chatbot
-- ==============================================================================

DO $$
DECLARE
    v_cbse_id UUID := '10000000-0000-0000-0000-000000000001'::uuid;
    v_bseb_id UUID := '10000000-0000-0000-0000-000000000002'::uuid;
    v_icse_id UUID := '10000000-0000-0000-0000-000000000003'::uuid;
    v_comp_id UUID := '10000000-0000-0000-0000-000000000004'::uuid;

    v_class10_id UUID := '20000000-0000-0000-0000-000000000001'::uuid;
    v_class11_id UUID := '20000000-0000-0000-0000-000000000002'::uuid;
    v_class12_id UUID := '20000000-0000-0000-0000-000000000003'::uuid;
    v_target_id  UUID := '20000000-0000-0000-0000-000000000004'::uuid;

    v_sub_math_id UUID := '30000000-0000-0000-0000-000000000001'::uuid;
    v_sub_sci_id  UUID := '30000000-0000-0000-0000-000000000002'::uuid;
    v_sub_phy_id  UUID := '30000000-0000-0000-0000-000000000003'::uuid;
    v_sub_chem_id UUID := '30000000-0000-0000-0000-000000000004'::uuid;
    v_sub_bio_id  UUID := '30000000-0000-0000-0000-000000000005'::uuid;
    v_sub_eng_id  UUID := '30000000-0000-0000-0000-000000000006'::uuid;
    v_sub_comm_id UUID := '30000000-0000-0000-0000-000000000007'::uuid;

    v_crs_math10_id UUID := '40000000-0000-0000-0000-000000000001'::uuid;
    v_crs_sci10_id  UUID := '40000000-0000-0000-0000-000000000002'::uuid;
    v_crs_eng10_id  UUID := '40000000-0000-0000-0000-000000000003'::uuid;
    v_crs_pcm10_id  UUID := '40000000-0000-0000-0000-000000000004'::uuid;
    v_crs_sci12_id  UUID := '40000000-0000-0000-0000-000000000005'::uuid;
    v_crs_comm12_id UUID := '40000000-0000-0000-0000-000000000006'::uuid;
    v_crs_jee_id    UUID := '40000000-0000-0000-0000-000000000007'::uuid;
    v_crs_neet_id   UUID := '40000000-0000-0000-0000-000000000008'::uuid;

    v_batch_fb1_id UUID := '50000000-0000-0000-0000-000000000001'::uuid;
    v_batch_fb2_id UUID := '50000000-0000-0000-0000-000000000002'::uuid;
    v_batch_fb3_id UUID := '50000000-0000-0000-0000-000000000003'::uuid;
    v_batch_fb4_id UUID := '50000000-0000-0000-0000-000000000004'::uuid;
    v_batch_ob1_id UUID := '50000000-0000-0000-0000-000000000005'::uuid;
    v_batch_ob2_id UUID := '50000000-0000-0000-0000-000000000006'::uuid;
    v_batch_ob3_id UUID := '50000000-0000-0000-0000-000000000007'::uuid;
    v_batch_ob4_id UUID := '50000000-0000-0000-0000-000000000008'::uuid;
    v_batch_ob5_id UUID := '50000000-0000-0000-0000-000000000009'::uuid;

    v_ch1_id UUID := '60000000-0000-0000-0000-000000000001'::uuid;
    v_ch2_id UUID := '60000000-0000-0000-0000-000000000002'::uuid;
    v_ch3_id UUID := '60000000-0000-0000-0000-000000000003'::uuid;
    v_ch4_id UUID := '60000000-0000-0000-0000-000000000004'::uuid;
BEGIN

    -- 1. Educational Boards
    INSERT INTO public.cms_boards (id, name, code, slug, description, icon_name, display_order, is_visible, status)
    VALUES
        (v_cbse_id, 'CBSE', 'CBSE', 'cbse', 'Central Board of Secondary Education', 'Award', 1, TRUE, 'PUBLISHED'),
        (v_bseb_id, 'Bihar Board', 'BSEB', 'bseb', 'Bihar School Examination Board', 'BookOpen', 2, TRUE, 'PUBLISHED'),
        (v_icse_id, 'ICSE', 'ICSE', 'icse', 'Indian Certificate of Secondary Education', 'GraduationCap', 3, TRUE, 'PUBLISHED'),
        (v_comp_id, 'Competitive Entrance', 'COMPETITIVE', 'competitive', 'JEE / NEET Competitive Preparation', 'Target', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 2. Class Levels
    INSERT INTO public.cms_class_levels (id, name, code, slug, display_order, is_visible, status)
    VALUES
        (v_class10_id, 'Class 10', 'CLASS_10', 'class-10', 1, TRUE, 'PUBLISHED'),
        (v_class11_id, 'Class 11', 'CLASS_11', 'class-11', 2, TRUE, 'PUBLISHED'),
        (v_class12_id, 'Class 12', 'CLASS_12', 'class-12', 3, TRUE, 'PUBLISHED'),
        (v_target_id,  'JEE / NEET Target', 'TARGET', 'target-prep', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 3. Academic Subjects
    INSERT INTO public.cms_subjects (id, name, slug, code, icon_name, icon_color, icon_bg, display_order, is_visible, status)
    VALUES
        (v_sub_math_id, 'Mathematics', 'mathematics', 'MATH', 'Calculator', 'text-rose-500', 'bg-rose-50', 1, TRUE, 'PUBLISHED'),
        (v_sub_sci_id,  'Science', 'science', 'SCI', 'FlaskConical', 'text-emerald-500', 'bg-emerald-50', 2, TRUE, 'PUBLISHED'),
        (v_sub_phy_id,  'Physics', 'physics', 'PHY', 'Atom', 'text-sky-500', 'bg-sky-50', 3, TRUE, 'PUBLISHED'),
        (v_sub_chem_id, 'Chemistry', 'chemistry', 'CHEM', 'TestTube', 'text-amber-500', 'bg-amber-50', 4, TRUE, 'PUBLISHED'),
        (v_sub_bio_id,  'Biology', 'biology', 'BIO', 'Stethoscope', 'text-emerald-600', 'bg-emerald-50', 5, TRUE, 'PUBLISHED'),
        (v_sub_eng_id,  'English', 'english', 'ENG', 'Book', 'text-purple-500', 'bg-purple-50', 6, TRUE, 'PUBLISHED'),
        (v_sub_comm_id, 'Commerce', 'commerce', 'COMM', 'Briefcase', 'text-pink-500', 'bg-pink-50', 7, TRUE, 'PUBLISHED')
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        icon_name = EXCLUDED.icon_name,
        icon_color = EXCLUDED.icon_color,
        icon_bg = EXCLUDED.icon_bg,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 4. Explore Courses Catalog
    INSERT INTO public.cms_courses (id, board_id, class_id, subject_id, title, category, slug, short_description, icon_type, icon_color, icon_bg, display_order, is_visible, is_featured, status)
    VALUES
        (v_crs_math10_id, v_cbse_id, v_class10_id, v_sub_math_id, 'Class 10', 'Mathematics', 'class-10-mathematics', 'Complete Class 10 CBSE Board syllabus', 'school', 'text-rose-500', 'bg-rose-50 border-rose-100', 1, TRUE, TRUE, 'PUBLISHED'),
        (v_crs_sci10_id,  v_cbse_id, v_class10_id, v_sub_sci_id,  'Class 10', 'Science', 'class-10-science', 'Complete Science physics, chemistry & biology', 'flask', 'text-emerald-500', 'bg-emerald-50 border-emerald-100', 2, TRUE, TRUE, 'PUBLISHED'),
        (v_crs_eng10_id,  v_cbse_id, v_class10_id, v_sub_eng_id,  'Class 10', 'English', 'class-10-english', 'Grammar and literature comprehensive coverage', 'book', 'text-purple-500', 'bg-purple-50 border-purple-100', 3, TRUE, FALSE, 'PUBLISHED'),
        (v_crs_pcm10_id,  v_cbse_id, v_class10_id, v_sub_phy_id,  'Class 10', 'PCM', 'class-10-pcm', 'Integrated foundation for science aspirants', 'atom', 'text-sky-500', 'bg-sky-50 border-sky-100', 4, TRUE, FALSE, 'PUBLISHED'),
        (v_crs_sci12_id,  v_cbse_id, v_class12_id, v_sub_sci_id,  'Class 12', 'Science', 'class-12-science', 'Physics, Chemistry & Mathematics/Biology', 'shield', 'text-orange-500', 'bg-orange-50 border-orange-100', 5, TRUE, TRUE, 'PUBLISHED'),
        (v_crs_comm12_id, v_cbse_id, v_class12_id, v_sub_comm_id, 'Class 12', 'Commerce', 'class-12-commerce', 'Accounts, Economics, and Business Studies', 'briefcase', 'text-pink-500', 'bg-pink-50 border-pink-100', 6, TRUE, FALSE, 'PUBLISHED'),
        (v_crs_jee_id,    v_comp_id, v_target_id,  v_sub_phy_id,  'JEE', 'Preparation', 'jee-preparation', 'JEE Main & Advanced 2-Year Master Plan', 'test-tube', 'text-amber-500', 'bg-amber-50 border-amber-100', 7, TRUE, TRUE, 'PUBLISHED'),
        (v_crs_neet_id,   v_comp_id, v_target_id,  v_sub_bio_id,  'NEET', 'Preparation', 'neet-preparation', 'NEET UG Complete Medical Syllabus Drills', 'stethoscope', 'text-emerald-600', 'bg-emerald-50 border-emerald-100', 8, TRUE, TRUE, 'PUBLISHED')
    ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        short_description = EXCLUDED.short_description,
        icon_type = EXCLUDED.icon_type,
        icon_color = EXCLUDED.icon_color,
        icon_bg = EXCLUDED.icon_bg,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        is_featured = EXCLUDED.is_featured,
        status = EXCLUDED.status;

    -- 5. Batches (Featured + Ongoing)
    INSERT INTO public.cms_batches (id, course_id, board_id, class_id, title, slug, board_label, subtitle, badge_text, badge_variant, is_featured, is_ongoing, status_type, educator_name, educator_avatar_url, bg_gradient, border_color, icon_type, icon_bg, icon_color, cta_text, cta_link, display_order, is_visible, status)
    VALUES
        -- Featured Batches
        (v_batch_fb1_id, v_crs_math10_id, v_cbse_id, v_class10_id, 'Mathematics', 'cbse-10-maths-featured', 'Class 10 CBSE', 'Complete Board Preparation', 'New', 'orange', TRUE, FALSE, 'ongoing', 'Rohit Sir', '/assets/student/teacher-male-1.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'math', 'bg-emerald-50 border-emerald-100 text-emerald-600', 'text-emerald-600', 'Explore →', '/student/batches', 1, TRUE, 'PUBLISHED'),
        (v_batch_fb2_id, v_crs_sci12_id,  v_cbse_id, v_class12_id, 'Physics + Chemistry', 'class-12-science-featured', 'Class 12 Science', 'Full Syllabus Coverage', 'Popular', 'pink', TRUE, FALSE, 'ongoing', 'Neha Ma''am', '/assets/student/teacher-female-1.jpg', 'from-pink-50/70 via-rose-50/40 to-orange-50/30', 'border-pink-100', 'science', 'bg-sky-50 border-sky-100 text-sky-600', 'text-sky-600', 'Explore →', '/student/batches', 2, TRUE, 'PUBLISHED'),
        (v_batch_fb3_id, v_crs_jee_id,    v_comp_id, v_target_id,  'Foundation Batch', 'jee-2027-foundation-featured', 'JEE 2027', 'Start Early, Stay Ahead', 'New', 'green', TRUE, FALSE, 'ongoing', 'Arjun Sir', '/assets/student/teacher-male-1.jpg', 'from-emerald-50/70 via-teal-50/40 to-green-50/30', 'border-emerald-100', 'foundation', 'bg-amber-50 border-amber-100 text-amber-600', 'text-amber-600', 'Explore →', '/student/batches', 3, TRUE, 'PUBLISHED'),
        (v_batch_fb4_id, v_crs_neet_id,   v_comp_id, v_target_id,  'Complete Preparation', 'neet-2027-complete-featured', 'NEET 2027', 'Learn from Expert Faculty', 'New', 'purple', TRUE, FALSE, 'ongoing', 'Dr. Priya Sharma', '/assets/student/teacher-doctor.jpg', 'from-purple-50/70 via-violet-50/40 to-fuchsia-50/30', 'border-purple-100', 'medical', 'bg-purple-50 border-purple-100 text-purple-600', 'text-purple-600', 'Explore →', '/student/batches', 4, TRUE, 'PUBLISHED'),
        -- Ongoing Batches
        (v_batch_ob1_id, v_crs_math10_id, v_cbse_id, v_class10_id, 'Mathematics', 'cbse-10-maths-ongoing', 'CBSE Board', 'Class 10 CBSE Math ongoing track', 'Class 10 (CBSE)', 'orange', FALSE, TRUE, 'live', 'Rohit Sir', '/assets/student/teacher-male-1.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'target', 'bg-emerald-50 border-emerald-100 text-emerald-600', 'text-emerald-600', 'Join Now', '/student/batches', 5, TRUE, 'PUBLISHED'),
        (v_batch_ob2_id, v_crs_sci10_id,  v_bseb_id, v_class10_id, 'Science', 'bseb-10-science-ongoing', 'BSEB Board', 'Class 10 Bihar Board Science', 'Class 10 (Bihar Board)', 'orange', FALSE, TRUE, 'ongoing', 'Neha Ma''am', '/assets/student/teacher-female-1.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'atom', 'bg-sky-50 border-sky-100 text-sky-600', 'text-sky-600', 'View Details', '/student/batches', 6, TRUE, 'PUBLISHED'),
        (v_batch_ob3_id, v_crs_comm12_id, v_cbse_id, v_class12_id, 'Commerce', 'class-12-commerce-ongoing', 'Accounts & Eco', 'Class 12 Commerce Accounts & Eco', 'Class 12', 'orange', FALSE, TRUE, 'ongoing', 'Arjun Sir', '/assets/student/teacher-male-1.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'book', 'bg-amber-50 border-amber-100 text-amber-600', 'text-amber-600', 'View Details', '/student/batches', 7, TRUE, 'PUBLISHED'),
        (v_batch_ob4_id, v_crs_jee_id,    v_comp_id, v_target_id,  'Preparation', 'jee-2027-pcm-ongoing', 'PCM Advanced', 'JEE Main/Advanced PCM Preparation', 'JEE 2027', 'orange', FALSE, TRUE, 'ongoing', 'Arjun Sir', '/assets/student/teacher-male-1.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'academy', 'bg-indigo-50 border-indigo-100 text-indigo-600', 'text-indigo-600', 'View Details', '/student/batches', 8, TRUE, 'PUBLISHED'),
        (v_batch_ob5_id, v_crs_neet_id,   v_comp_id, v_target_id,  'Preparation', 'neet-2027-pcb-ongoing', 'PCB Medical', 'NEET UG Medical PCB Preparation', 'NEET 2027', 'orange', FALSE, TRUE, 'ongoing', 'Dr. Priya Sharma', '/assets/student/teacher-doctor.jpg', 'from-sky-50/70 via-blue-50/40 to-indigo-50/30', 'border-sky-100', 'medical', 'bg-purple-50 border-purple-100 text-purple-600', 'text-purple-600', 'View Details', '/student/batches', 9, TRUE, 'PUBLISHED')
    ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        board_label = EXCLUDED.board_label,
        subtitle = EXCLUDED.subtitle,
        badge_text = EXCLUDED.badge_text,
        badge_variant = EXCLUDED.badge_variant,
        is_featured = EXCLUDED.is_featured,
        is_ongoing = EXCLUDED.is_ongoing,
        status_type = EXCLUDED.status_type,
        educator_name = EXCLUDED.educator_name,
        educator_avatar_url = EXCLUDED.educator_avatar_url,
        bg_gradient = EXCLUDED.bg_gradient,
        border_color = EXCLUDED.border_color,
        icon_type = EXCLUDED.icon_type,
        icon_bg = EXCLUDED.icon_bg,
        icon_color = EXCLUDED.icon_color,
        cta_text = EXCLUDED.cta_text,
        cta_link = EXCLUDED.cta_link,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 6. Chapters / Modules
    INSERT INTO public.cms_chapters (id, course_id, batch_id, title, slug, chapter_number, description, display_order, is_visible, status)
    VALUES
        (v_ch1_id, v_crs_math10_id, v_batch_fb1_id, 'Real Numbers & Trigonometry', 'real-numbers-trigonometry', 1, 'Core foundational mathematical concepts and formulas', 1, TRUE, 'PUBLISHED'),
        (v_ch2_id, v_crs_sci10_id,  v_batch_fb2_id, 'Chemical Reactions & Equations', 'chemical-reactions-equations', 2, 'Types of chemical reactions, balancing, and redox drills', 2, TRUE, 'PUBLISHED'),
        (v_ch3_id, v_crs_sci10_id,  v_batch_fb2_id, 'Life Processes', 'chapter-life-processes', 3, 'Nutrition, respiration, transportation, and excretion', 3, TRUE, 'PUBLISHED'),
        (v_ch4_id, v_crs_jee_id,    v_batch_fb3_id, 'Laws of Motion & Work', 'laws-of-motion-work', 4, 'Newtonian mechanics, momentum, work, power and energy', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (course_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        chapter_number = EXCLUDED.chapter_number,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 7. Latest Lectures
    INSERT INTO public.cms_lectures (id, chapter_id, batch_id, title, slug, subject, teacher_name, duration_human, duration_formatted, thumbnail_url, thumbnail_bg, category_tag, is_home_featured, is_free_preview, display_order, is_visible, status)
    VALUES
        ('70000000-0000-0000-0000-000000000001'::uuid, v_ch1_id, v_batch_fb1_id, 'Trigonometry Basics', 'trigonometry-basics', 'Mathematics', 'By Rohit Sharma', '45 min', '45:00', '/assets/student/hero-character.jpg', 'from-[#0F2042] via-[#162D59] to-[#0A162B]', 'TRIGONOMETRY BASICS', TRUE, TRUE, 1, TRUE, 'PUBLISHED'),
        ('70000000-0000-0000-0000-000000000002'::uuid, v_ch3_id, v_batch_fb2_id, 'Life Processes', 'life-processes', 'Science', 'By Neha Ma''am', '38 min', '38:00', '/assets/student/hero-character.jpg', 'from-[#0A362E] via-[#0E4A3F] to-[#062620]', 'Life Processes', TRUE, TRUE, 2, TRUE, 'PUBLISHED'),
        ('70000000-0000-0000-0000-000000000003'::uuid, v_ch1_id, v_batch_fb1_id, 'Grammar Rules', 'grammar-rules', 'English', 'By Arjun Gupta', '32 min', '32:00', '/assets/student/hero-character.jpg', 'from-[#2A1B4E] via-[#3B256E] to-[#1B1133]', 'Grammar Rules', TRUE, TRUE, 3, TRUE, 'PUBLISHED'),
        ('70000000-0000-0000-0000-000000000004'::uuid, v_ch2_id, v_batch_fb2_id, 'Chemical Reactions', 'chemical-reactions', 'Science', 'By Rohit Sharma', '40 min', '40:00', '/assets/student/hero-character.jpg', 'from-[#0E344A] via-[#154E6E] to-[#092231]', 'Chemical Reactions', TRUE, TRUE, 4, TRUE, 'PUBLISHED'),
        ('70000000-0000-0000-0000-000000000005'::uuid, v_ch4_id, v_batch_fb3_id, 'Work, Energy & Power', 'work-energy-power', 'Physics', 'By Karan Verma', '36 min', '36:00', '/assets/student/hero-character.jpg', 'from-[#3D2314] via-[#59331D] to-[#26160C]', 'Work, Energy & Power', TRUE, TRUE, 5, TRUE, 'PUBLISHED'),
        ('70000000-0000-0000-0000-000000000006'::uuid, v_ch3_id, v_batch_fb4_id, 'Heredity and Evolution', 'heredity-evolution', 'Biology', 'By Dr. Priya Sharma', '42 min', '42:00', '/assets/student/hero-character.jpg', 'from-[#0F382A] via-[#174F3B] to-[#0A261C]', 'Heredity & Evolution', TRUE, TRUE, 6, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        teacher_name = EXCLUDED.teacher_name,
        duration_human = EXCLUDED.duration_human,
        duration_formatted = EXCLUDED.duration_formatted,
        thumbnail_bg = EXCLUDED.thumbnail_bg,
        category_tag = EXCLUDED.category_tag,
        is_home_featured = EXCLUDED.is_home_featured,
        is_free_preview = EXCLUDED.is_free_preview,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 8. Live Classes Today
    INSERT INTO public.cms_live_classes (id, batch_id, subject, topic, educator_name, educator_avatar_url, scheduled_start, time_display, is_live, status_text, live_status, cta_text, display_order, is_visible, status)
    VALUES
        ('80000000-0000-0000-0000-000000000001'::uuid, v_batch_fb1_id, 'Mathematics', 'Trigonometry Basics', 'By Rohit Sir', '/assets/student/teacher-male-1.jpg', (CURRENT_DATE + interval '18 hours'), '6:00 PM', TRUE, 'LIVE', 'LIVE', 'Join Class', 1, TRUE, 'PUBLISHED'),
        ('80000000-0000-0000-0000-000000000002'::uuid, v_batch_fb2_id, 'Science', 'Chemical Reactions', 'By Neha Ma''am', '/assets/student/teacher-female-1.jpg', (CURRENT_DATE + interval '19 hours 30 minutes'), '7:30 PM', FALSE, 'UPCOMING', 'SCHEDULED', 'Reminder', 2, TRUE, 'PUBLISHED'),
        ('80000000-0000-0000-0000-000000000003'::uuid, v_batch_fb1_id, 'English', 'Writing Skills', 'By Arjun Sir', '/assets/student/teacher-male-1.jpg', (CURRENT_DATE + interval '20 hours 30 minutes'), '8:30 PM', FALSE, 'UPCOMING', 'SCHEDULED', 'Reminder', 3, TRUE, 'PUBLISHED'),
        ('80000000-0000-0000-0000-000000000004'::uuid, v_batch_fb3_id, 'Physics', 'Laws of Motion', 'By Karan Sir', '/assets/student/teacher-male-1.jpg', (CURRENT_DATE + interval '17 hours'), '5:00 PM', FALSE, 'UPCOMING', 'SCHEDULED', 'Reminder', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        topic = EXCLUDED.topic,
        educator_name = EXCLUDED.educator_name,
        educator_avatar_url = EXCLUDED.educator_avatar_url,
        time_display = EXCLUDED.time_display,
        is_live = EXCLUDED.is_live,
        status_text = EXCLUDED.status_text,
        live_status = EXCLUDED.live_status,
        cta_text = EXCLUDED.cta_text,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 9. Hero Carousel Banners
    INSERT INTO public.cms_hero_banners (id, tagline, title, subtitle, cta_text, cta_link, quote_text, character_image_url, bg_gradient, display_order, is_visible, status)
    VALUES
        ('90000000-0000-0000-0000-000000000001'::uuid, 'TOPVEDA ACADEMIC DISCOVERY', 'Learn. Practice. Grow.', 'Your future is built by what you do today.', 'Keep Learning →', '#featured-batches', 'Better Students' || E'\n' || 'Brighter Futures', '/assets/student/hero-character.jpg', 'from-[#081326] via-[#0E2044] to-[#1B3A72]', 1, TRUE, 'PUBLISHED'),
        ('90000000-0000-0000-0000-000000000002'::uuid, 'TARGET BOARDS 2027', 'Master Every Concept with Top Faculty.', 'Structured daily live sessions, comprehensive notes & mock tests.', 'Explore Batches →', '/student/batches', 'Excellence in Every Class', '/assets/student/hero-character.jpg', 'from-[#081326] via-[#0E2044] to-[#1B3A72]', 2, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        tagline = EXCLUDED.tagline,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        cta_text = EXCLUDED.cta_text,
        cta_link = EXCLUDED.cta_link,
        quote_text = EXCLUDED.quote_text,
        character_image_url = EXCLUDED.character_image_url,
        bg_gradient = EXCLUDED.bg_gradient,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 10. Daily Motivational Quote
    INSERT INTO public.cms_daily_quotes (id, quote, author, is_active, display_order, is_visible, status)
    VALUES
        ('a0000000-0000-0000-0000-000000000001'::uuid, 'Success is built by the small things you do consistently every day.', 'TopVeda', TRUE, 1, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        quote = EXCLUDED.quote,
        author = EXCLUDED.author,
        is_active = EXCLUDED.is_active,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 11. Student Portal Hub Items ("What's Happening on TopVeda?")
    INSERT INTO public.cms_hub_items (id, category, badge_text, badge_variant, title, description, cta_text, cta_link, icon_type, display_order, is_visible, status)
    VALUES
        ('b0000000-0000-0000-0000-000000000001'::uuid, 'announcement', 'NEW BATCH', 'orange', 'Class 10 Mathematics Batch', 'Enrollment is now officially open for the new 2026-27 Board Preparation batch.', 'Explore Batch', '/student/batches', 'megaphone', 1, TRUE, 'PUBLISHED'),
        ('b0000000-0000-0000-0000-000000000002'::uuid, 'material', 'REVISION NOTES', 'sky', 'New Science Formula Sheets', 'Comprehensive quick-revision PDF notes and mindmaps are ready for download.', 'View Material', '/student/study-material', 'book', 2, TRUE, 'PUBLISHED'),
        ('b0000000-0000-0000-0000-000000000003'::uuid, 'live', 'LIVE TODAY', 'purple', 'Trigonometry Masterclass', 'Join Rohit Sir live at 6:00 PM for deep concept drills and PYQ problem-solving.', 'View Class', '/student/live', 'target', 3, TRUE, 'PUBLISHED'),
        ('b0000000-0000-0000-0000-000000000004'::uuid, 'tip', 'STUDY TIP', 'emerald', 'Daily Practice Discipline', 'Solving 5 previous-year questions every evening boosts board retention by 40%.', 'Read More', '/student/learning', 'lightbulb', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        badge_text = EXCLUDED.badge_text,
        badge_variant = EXCLUDED.badge_variant,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        cta_text = EXCLUDED.cta_text,
        cta_link = EXCLUDED.cta_link,
        icon_type = EXCLUDED.icon_type,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 12. Study Materials
    INSERT INTO public.cms_study_materials (id, course_id, chapter_id, title, material_type, file_url, page_count, download_count, display_order, is_visible, status)
    VALUES
        ('c0000000-0000-0000-0000-000000000001'::uuid, v_crs_math10_id, v_ch1_id, 'Class 10 Trigonometry Formula Sheet', 'formula_sheet', NULL, 4, 142, 1, TRUE, 'PUBLISHED'),
        ('c0000000-0000-0000-0000-000000000002'::uuid, v_crs_sci10_id,  v_ch2_id, 'Class 10 Chemical Reactions Quick Notes', 'notes', NULL, 8, 98, 2, TRUE, 'PUBLISHED'),
        ('c0000000-0000-0000-0000-000000000003'::uuid, v_crs_sci10_id,  v_ch3_id, 'Class 10 Life Processes NCERT Solutions', 'ncert_solution', NULL, 12, 210, 3, TRUE, 'PUBLISHED'),
        ('c0000000-0000-0000-0000-000000000004'::uuid, v_crs_math10_id, v_ch1_id, 'CBSE Class 10 Mathematics 2025 Solved PYQ', 'pyq_paper', NULL, 16, 320, 4, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        material_type = EXCLUDED.material_type,
        file_url = EXCLUDED.file_url,
        page_count = EXCLUDED.page_count,
        download_count = EXCLUDED.download_count,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 13. AI Chatbot Singleton Global Settings
    INSERT INTO public.cms_chatbot_settings (id, is_enabled, name, greeting, welcome_message, placeholder_text, system_instructions, maintenance_mode, maintenance_message, rate_limit_per_minute, max_daily_queries_per_student, model_provider, model_name, temperature, max_tokens, status)
    VALUES
        ('d0000000-0000-0000-0000-000000000001'::uuid, TRUE, 'TopVeda AI', 'TopVeda AI Assistant', 'TopVeda AI Assistant is coming soon!', 'Your 24/7 personal academic tutor is currently undergoing training to assist you with doubt-solving, instant concept explanations, and personalized revision.', 'You are TopVeda AI, an encouraging and academically rigorous tutor for Indian school students (CBSE/BSEB/ICSE) preparing for board and competitive exams. Answer strictly using approved TopVeda knowledge.', FALSE, 'TopVeda AI is undergoing scheduled academic knowledge updates. It will be back shortly.', 10, 50, 'cloudflare_workers_ai', '@cf/meta/llama-3.1-8b-instruct', 0.20, 1024, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        greeting = EXCLUDED.greeting,
        welcome_message = EXCLUDED.welcome_message,
        placeholder_text = EXCLUDED.placeholder_text,
        system_instructions = EXCLUDED.system_instructions,
        maintenance_mode = EXCLUDED.maintenance_mode,
        maintenance_message = EXCLUDED.maintenance_message,
        rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
        max_daily_queries_per_student = EXCLUDED.max_daily_queries_per_student,
        model_provider = EXCLUDED.model_provider,
        model_name = EXCLUDED.model_name,
        temperature = EXCLUDED.temperature,
        max_tokens = EXCLUDED.max_tokens,
        status = EXCLUDED.status;

    -- 14. AI Chatbot Suggested Prompts
    INSERT INTO public.cms_chatbot_prompts (id, prompt_text, category_tag, icon_name, display_order, is_visible, status)
    VALUES
        ('e0000000-0000-0000-0000-000000000001'::uuid, 'Explain Pythagoras Theorem with an example', 'Academic', 'Calculator', 1, TRUE, 'PUBLISHED'),
        ('e0000000-0000-0000-0000-000000000002'::uuid, 'How do I balance chemical equations quickly?', 'Academic', 'Atom', 2, TRUE, 'PUBLISHED'),
        ('e0000000-0000-0000-0000-000000000003'::uuid, 'Create a 3-hour evening study routine for Class 10', 'Study Plan', 'Target', 3, TRUE, 'PUBLISHED'),
        ('e0000000-0000-0000-0000-000000000004'::uuid, 'How to handle exam anxiety during mock tests?', 'Motivation', 'Sparkles', 4, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        prompt_text = EXCLUDED.prompt_text,
        category_tag = EXCLUDED.category_tag,
        icon_name = EXCLUDED.icon_name,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- 15. AI Chatbot FAQs
    INSERT INTO public.cms_chatbot_faqs (id, question, answer, category, search_tags, display_order, is_visible, status)
    VALUES
        ('f0000000-0000-0000-0000-000000000001'::uuid, 'What is TopVeda AI Assistant?', 'TopVeda AI is your 24/7 personal tutor designed to assist you with conceptual explanations, homework doubts, revision strategies, and board exam preparation.', 'General', '{"ai", "assistant", "tutor", "about"}'::text[], 1, TRUE, 'PUBLISHED'),
        ('f0000000-0000-0000-0000-000000000002'::uuid, 'How do I join a live class?', 'Navigate to the Live Classes tab from the left sidebar. Any ongoing session will feature a ''Join Class'' button. Simply click to enter the interactive room.', 'Live Classes', '{"live", "classes", "join", "schedule"}'::text[], 2, TRUE, 'PUBLISHED'),
        ('f0000000-0000-0000-0000-000000000003'::uuid, 'Where can I download chapter formula sheets?', 'Visit the Study Material section in the sidebar. You can filter by subject and download high-resolution PDF formula sheets and revision summaries.', 'Study Material', '{"study material", "pdf", "formula sheet", "notes"}'::text[], 3, TRUE, 'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET
        question = EXCLUDED.question,
        answer = EXCLUDED.answer,
        category = EXCLUDED.category,
        search_tags = EXCLUDED.search_tags,
        display_order = EXCLUDED.display_order,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

END $$;

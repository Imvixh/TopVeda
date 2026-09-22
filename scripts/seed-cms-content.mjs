import { createClient } from "@supabase/supabase-js";
import fs from "fs";

let envContent = "";
try {
  envContent = fs.readFileSync("d:/TopVeda/TopVeda/.env.local", "utf8");
} catch {
  envContent = fs.readFileSync("d:/TopVeda/TopVeda/.env.production", "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://uxkvwuavidufnqliauuj.supabase.co";
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const client = createClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("==================================================================");
console.log("TopVeda Phase 4.1 Step 5I: Safe Idempotent CMS Content Seed");
console.log("Target Supabase URL:", supabaseUrl);
console.log("Using Service Role:", !!serviceRoleKey);
console.log("==================================================================\n");

async function seed() {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] };

  // 1. Boards
  const boards = [
    { id: "10000000-0000-0000-0000-000000000001", name: "CBSE", code: "CBSE", slug: "cbse", description: "Central Board of Secondary Education", icon_name: "Award", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "10000000-0000-0000-0000-000000000002", name: "Bihar Board", code: "BSEB", slug: "bseb", description: "Bihar School Examination Board", icon_name: "BookOpen", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "10000000-0000-0000-0000-000000000003", name: "ICSE", code: "ICSE", slug: "icse", description: "Indian Certificate of Secondary Education", icon_name: "GraduationCap", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "10000000-0000-0000-0000-000000000004", name: "Competitive Entrance", code: "COMPETITIVE", slug: "competitive", description: "JEE / NEET Competitive Preparation", icon_name: "Target", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const b of boards) {
    const { error } = await client.from("cms_boards").upsert(b, { onConflict: "slug" });
    if (error) stats.errors.push(`cms_boards (${b.slug}): ${error.message}`);
    else stats.created++;
  }

  // 2. Class Levels
  const classes = [
    { id: "20000000-0000-0000-0000-000000000001", name: "Class 10", code: "CLASS_10", slug: "class-10", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "20000000-0000-0000-0000-000000000002", name: "Class 11", code: "CLASS_11", slug: "class-11", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "20000000-0000-0000-0000-000000000003", name: "Class 12", code: "CLASS_12", slug: "class-12", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "20000000-0000-0000-0000-000000000004", name: "JEE / NEET Target", code: "TARGET", slug: "target-prep", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const c of classes) {
    const { error } = await client.from("cms_class_levels").upsert(c, { onConflict: "slug" });
    if (error) stats.errors.push(`cms_class_levels (${c.slug}): ${error.message}`);
    else stats.created++;
  }

  // 3. Subjects
  const subjects = [
    { id: "30000000-0000-0000-0000-000000000001", name: "Mathematics", slug: "mathematics", code: "MATH", icon_name: "Calculator", icon_color: "text-rose-500", icon_bg: "bg-rose-50", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000002", name: "Science", slug: "science", code: "SCI", icon_name: "FlaskConical", icon_color: "text-emerald-500", icon_bg: "bg-emerald-50", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000003", name: "Physics", slug: "physics", code: "PHY", icon_name: "Atom", icon_color: "text-sky-500", icon_bg: "bg-sky-50", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000004", name: "Chemistry", slug: "chemistry", code: "CHEM", icon_name: "TestTube", icon_color: "text-amber-500", icon_bg: "bg-amber-50", display_order: 4, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000005", name: "Biology", slug: "biology", code: "BIO", icon_name: "Stethoscope", icon_color: "text-emerald-600", icon_bg: "bg-emerald-50", display_order: 5, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000006", name: "English", slug: "english", code: "ENG", icon_name: "Book", icon_color: "text-purple-500", icon_bg: "bg-purple-50", display_order: 6, is_visible: true, status: "PUBLISHED" },
    { id: "30000000-0000-0000-0000-000000000007", name: "Commerce", slug: "commerce", code: "COMM", icon_name: "Briefcase", icon_color: "text-pink-500", icon_bg: "bg-pink-50", display_order: 7, is_visible: true, status: "PUBLISHED" },
  ];
  for (const s of subjects) {
    const { error } = await client.from("cms_subjects").upsert(s, { onConflict: "slug" });
    if (error) stats.errors.push(`cms_subjects (${s.slug}): ${error.message}`);
    else stats.created++;
  }

  // 4. Courses
  const courses = [
    { id: "40000000-0000-0000-0000-000000000001", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", subject_id: "30000000-0000-0000-0000-000000000001", title: "Class 10", category: "Mathematics", slug: "class-10-mathematics", short_description: "Complete Class 10 CBSE Board syllabus", icon_type: "school", icon_color: "text-rose-500", icon_bg: "bg-rose-50 border-rose-100", display_order: 1, is_visible: true, is_featured: true, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000002", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", subject_id: "30000000-0000-0000-0000-000000000002", title: "Class 10", category: "Science", slug: "class-10-science", short_description: "Complete Science physics, chemistry & biology", icon_type: "flask", icon_color: "text-emerald-500", icon_bg: "bg-emerald-50 border-emerald-100", display_order: 2, is_visible: true, is_featured: true, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000003", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", subject_id: "30000000-0000-0000-0000-000000000006", title: "Class 10", category: "English", slug: "class-10-english", short_description: "Grammar and literature comprehensive coverage", icon_type: "book", icon_color: "text-purple-500", icon_bg: "bg-purple-50 border-purple-100", display_order: 3, is_visible: true, is_featured: false, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000004", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", subject_id: "30000000-0000-0000-0000-000000000003", title: "Class 10", category: "PCM", slug: "class-10-pcm", short_description: "Integrated foundation for science aspirants", icon_type: "atom", icon_color: "text-sky-500", icon_bg: "bg-sky-50 border-sky-100", display_order: 4, is_visible: true, is_featured: false, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000005", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000003", subject_id: "30000000-0000-0000-0000-000000000002", title: "Class 12", category: "Science", slug: "class-12-science", short_description: "Physics, Chemistry & Mathematics/Biology", icon_type: "shield", icon_color: "text-orange-500", icon_bg: "bg-orange-50 border-orange-100", display_order: 5, is_visible: true, is_featured: true, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000006", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000003", subject_id: "30000000-0000-0000-0000-000000000007", title: "Class 12", category: "Commerce", slug: "class-12-commerce", short_description: "Accounts, Economics, and Business Studies", icon_type: "briefcase", icon_color: "text-pink-500", icon_bg: "bg-pink-50 border-pink-100", display_order: 6, is_visible: true, is_featured: false, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000007", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", subject_id: "30000000-0000-0000-0000-000000000003", title: "JEE", category: "Preparation", slug: "jee-preparation", short_description: "JEE Main & Advanced 2-Year Master Plan", icon_type: "test-tube", icon_color: "text-amber-500", icon_bg: "bg-amber-50 border-amber-100", display_order: 7, is_visible: true, is_featured: true, status: "PUBLISHED" },
    { id: "40000000-0000-0000-0000-000000000008", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", subject_id: "30000000-0000-0000-0000-000000000005", title: "NEET", category: "Preparation", slug: "neet-preparation", short_description: "NEET UG Complete Medical Syllabus Drills", icon_type: "stethoscope", icon_color: "text-emerald-600", icon_bg: "bg-emerald-50 border-emerald-100", display_order: 8, is_visible: true, is_featured: true, status: "PUBLISHED" },
  ];
  for (const crs of courses) {
    const { error } = await client.from("cms_courses").upsert(crs, { onConflict: "slug" });
    if (error) stats.errors.push(`cms_courses (${crs.slug}): ${error.message}`);
    else stats.created++;
  }

  // 5. Batches
  const batches = [
    { id: "50000000-0000-0000-0000-000000000001", course_id: "40000000-0000-0000-0000-000000000001", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", title: "Mathematics", slug: "cbse-10-maths-featured", board_label: "Class 10 CBSE", subtitle: "Complete Board Preparation", badge_text: "New", badge_variant: "orange", is_featured: true, is_ongoing: false, status_type: "ongoing", educator_name: "Rohit Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "math", icon_bg: "bg-emerald-50 border-emerald-100 text-emerald-600", icon_color: "text-emerald-600", cta_text: "Explore →", cta_link: "/student/batches", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000002", course_id: "40000000-0000-0000-0000-000000000005", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000003", title: "Physics + Chemistry", slug: "class-12-science-featured", board_label: "Class 12 Science", subtitle: "Full Syllabus Coverage", badge_text: "Popular", badge_variant: "pink", is_featured: true, is_ongoing: false, status_type: "ongoing", educator_name: "Neha Ma'am", educator_avatar_url: "/assets/student/teacher-female-1.jpg", bg_gradient: "from-pink-50/70 via-rose-50/40 to-orange-50/30", border_color: "border-pink-100", icon_type: "science", icon_bg: "bg-sky-50 border-sky-100 text-sky-600", icon_color: "text-sky-600", cta_text: "Explore →", cta_link: "/student/batches", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000003", course_id: "40000000-0000-0000-0000-000000000007", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", title: "Foundation Batch", slug: "jee-2027-foundation-featured", board_label: "JEE 2027", subtitle: "Start Early, Stay Ahead", badge_text: "New", badge_variant: "green", is_featured: true, is_ongoing: false, status_type: "ongoing", educator_name: "Arjun Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", bg_gradient: "from-emerald-50/70 via-teal-50/40 to-green-50/30", border_color: "border-emerald-100", icon_type: "foundation", icon_bg: "bg-amber-50 border-amber-100 text-amber-600", icon_color: "text-amber-600", cta_text: "Explore →", cta_link: "/student/batches", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000004", course_id: "40000000-0000-0000-0000-000000000008", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", title: "Complete Preparation", slug: "neet-2027-complete-featured", board_label: "NEET 2027", subtitle: "Learn from Expert Faculty", badge_text: "New", badge_variant: "purple", is_featured: true, is_ongoing: false, status_type: "ongoing", educator_name: "Dr. Priya Sharma", educator_avatar_url: "/assets/student/teacher-doctor.jpg", bg_gradient: "from-purple-50/70 via-violet-50/40 to-fuchsia-50/30", border_color: "border-purple-100", icon_type: "medical", icon_bg: "bg-purple-50 border-purple-100 text-purple-600", icon_color: "text-purple-600", cta_text: "Explore →", cta_link: "/student/batches", display_order: 4, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000005", course_id: "40000000-0000-0000-0000-000000000001", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000001", title: "Mathematics", slug: "cbse-10-maths-ongoing", board_label: "CBSE Board", subtitle: "Class 10 CBSE Math ongoing track", badge_text: "Class 10 (CBSE)", badge_variant: "orange", is_featured: false, is_ongoing: true, status_type: "live", educator_name: "Rohit Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "target", icon_bg: "bg-emerald-50 border-emerald-100 text-emerald-600", icon_color: "text-emerald-600", cta_text: "Join Now", cta_link: "/student/batches", display_order: 5, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000006", course_id: "40000000-0000-0000-0000-000000000002", board_id: "10000000-0000-0000-0000-000000000002", class_id: "20000000-0000-0000-0000-000000000001", title: "Science", slug: "bseb-10-science-ongoing", board_label: "BSEB Board", subtitle: "Class 10 Bihar Board Science", badge_text: "Class 10 (Bihar Board)", badge_variant: "orange", is_featured: false, is_ongoing: true, status_type: "ongoing", educator_name: "Neha Ma'am", educator_avatar_url: "/assets/student/teacher-female-1.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "atom", icon_bg: "bg-sky-50 border-sky-100 text-sky-600", icon_color: "text-sky-600", cta_text: "View Details", cta_link: "/student/batches", display_order: 6, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000007", course_id: "40000000-0000-0000-0000-000000000006", board_id: "10000000-0000-0000-0000-000000000001", class_id: "20000000-0000-0000-0000-000000000003", title: "Commerce", slug: "class-12-commerce-ongoing", board_label: "Accounts & Eco", subtitle: "Class 12 Commerce Accounts & Eco", badge_text: "Class 12", badge_variant: "orange", is_featured: false, is_ongoing: true, status_type: "ongoing", educator_name: "Arjun Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "book", icon_bg: "bg-amber-50 border-amber-100 text-amber-600", icon_color: "text-amber-600", cta_text: "View Details", cta_link: "/student/batches", display_order: 7, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000008", course_id: "40000000-0000-0000-0000-000000000007", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", title: "Preparation", slug: "jee-2027-pcm-ongoing", board_label: "PCM Advanced", subtitle: "JEE Main/Advanced PCM Preparation", badge_text: "JEE 2027", badge_variant: "orange", is_featured: false, is_ongoing: true, status_type: "ongoing", educator_name: "Arjun Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "academy", icon_bg: "bg-indigo-50 border-indigo-100 text-indigo-600", icon_color: "text-indigo-600", cta_text: "View Details", cta_link: "/student/batches", display_order: 8, is_visible: true, status: "PUBLISHED" },
    { id: "50000000-0000-0000-0000-000000000009", course_id: "40000000-0000-0000-0000-000000000008", board_id: "10000000-0000-0000-0000-000000000004", class_id: "20000000-0000-0000-0000-000000000004", title: "Preparation", slug: "neet-2027-pcb-ongoing", board_label: "PCB Medical", subtitle: "NEET UG Medical PCB Preparation", badge_text: "NEET 2027", badge_variant: "orange", is_featured: false, is_ongoing: true, status_type: "ongoing", educator_name: "Dr. Priya Sharma", educator_avatar_url: "/assets/student/teacher-doctor.jpg", bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30", border_color: "border-sky-100", icon_type: "medical", icon_bg: "bg-purple-50 border-purple-100 text-purple-600", icon_color: "text-purple-600", cta_text: "View Details", cta_link: "/student/batches", display_order: 9, is_visible: true, status: "PUBLISHED" },
  ];
  for (const b of batches) {
    const { error } = await client.from("cms_batches").upsert(b, { onConflict: "slug" });
    if (error) stats.errors.push(`cms_batches (${b.slug}): ${error.message}`);
    else stats.created++;
  }

  // 6. Chapters
  const chapters = [
    { id: "60000000-0000-0000-0000-000000000001", course_id: "40000000-0000-0000-0000-000000000001", batch_id: "50000000-0000-0000-0000-000000000001", title: "Real Numbers & Trigonometry", slug: "real-numbers-trigonometry", chapter_number: 1, description: "Core foundational mathematical concepts and formulas", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "60000000-0000-0000-0000-000000000002", course_id: "40000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000002", title: "Chemical Reactions & Equations", slug: "chemical-reactions-equations", chapter_number: 2, description: "Types of chemical reactions, balancing, and redox drills", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "60000000-0000-0000-0000-000000000002", course_id: "40000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000002", title: "Life Processes", slug: "chapter-life-processes", chapter_number: 3, description: "Nutrition, respiration, transportation, and excretion", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "60000000-0000-0000-0000-000000000004", course_id: "40000000-0000-0000-0000-000000000007", batch_id: "50000000-0000-0000-0000-000000000003", title: "Laws of Motion & Work", slug: "laws-of-motion-work", chapter_number: 4, description: "Newtonian mechanics, momentum, work, power and energy", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const ch of chapters) {
    const { error } = await client.from("cms_chapters").upsert(ch, { onConflict: "id" });
    if (error) stats.errors.push(`cms_chapters (${ch.slug}): ${error.message}`);
    else stats.created++;
  }

  // 7. Lectures
  const lectures = [
    { id: "70000000-0000-0000-0000-000000000001", chapter_id: "60000000-0000-0000-0000-000000000001", batch_id: "50000000-0000-0000-0000-000000000001", title: "Trigonometry Basics", slug: "trigonometry-basics", subject: "Mathematics", teacher_name: "By Rohit Sharma", duration_human: "45 min", duration_formatted: "45:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#0F2042] via-[#162D59] to-[#0A162B]", category_tag: "TRIGONOMETRY BASICS", is_home_featured: true, is_free_preview: true, display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "70000000-0000-0000-0000-000000000002", chapter_id: "60000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000002", title: "Life Processes", slug: "life-processes", subject: "Science", teacher_name: "By Neha Ma'am", duration_human: "38 min", duration_formatted: "38:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#0A362E] via-[#0E4A3F] to-[#062620]", category_tag: "Life Processes", is_home_featured: true, is_free_preview: true, display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "70000000-0000-0000-0000-000000000003", chapter_id: "60000000-0000-0000-0000-000000000001", batch_id: "50000000-0000-0000-0000-000000000001", title: "Grammar Rules", slug: "grammar-rules", subject: "English", teacher_name: "By Arjun Gupta", duration_human: "32 min", duration_formatted: "32:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#2A1B4E] via-[#3B256E] to-[#1B1133]", category_tag: "Grammar Rules", is_home_featured: true, is_free_preview: true, display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "70000000-0000-0000-0000-000000000004", chapter_id: "60000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000002", title: "Chemical Reactions", slug: "chemical-reactions", subject: "Science", teacher_name: "By Rohit Sharma", duration_human: "40 min", duration_formatted: "40:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#0E344A] via-[#154E6E] to-[#092231]", category_tag: "Chemical Reactions", is_home_featured: true, is_free_preview: true, display_order: 4, is_visible: true, status: "PUBLISHED" },
    { id: "70000000-0000-0000-0000-000000000005", chapter_id: "60000000-0000-0000-0000-000000000004", batch_id: "50000000-0000-0000-0000-000000000003", title: "Work, Energy & Power", slug: "work-energy-power", subject: "Physics", teacher_name: "By Karan Verma", duration_human: "36 min", duration_formatted: "36:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#3D2314] via-[#59331D] to-[#26160C]", category_tag: "Work, Energy & Power", is_home_featured: true, is_free_preview: true, display_order: 5, is_visible: true, status: "PUBLISHED" },
    { id: "70000000-0000-0000-0000-000000000006", chapter_id: "60000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000004", title: "Heredity and Evolution", slug: "heredity-evolution", subject: "Biology", teacher_name: "By Dr. Priya Sharma", duration_human: "42 min", duration_formatted: "42:00", thumbnail_url: "/assets/student/hero-character.jpg", thumbnail_bg: "from-[#0F382A] via-[#174F3B] to-[#0A261C]", category_tag: "Heredity & Evolution", is_home_featured: true, is_free_preview: true, display_order: 6, is_visible: true, status: "PUBLISHED" },
  ];
  for (const l of lectures) {
    const { error } = await client.from("cms_lectures").upsert(l, { onConflict: "id" });
    if (error) stats.errors.push(`cms_lectures (${l.slug}): ${error.message}`);
    else stats.created++;
  }

  // 8. Live Classes
  const liveClasses = [
    { id: "80000000-0000-0000-0000-000000000001", batch_id: "50000000-0000-0000-0000-000000000001", subject: "Mathematics", topic: "Trigonometry Basics", educator_name: "By Rohit Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", scheduled_start: new Date(Date.now() + 3600000).toISOString(), time_display: "6:00 PM", is_live: true, status_text: "LIVE", live_status: "LIVE", cta_text: "Join Class", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "80000000-0000-0000-0000-000000000002", batch_id: "50000000-0000-0000-0000-000000000002", subject: "Science", topic: "Chemical Reactions", educator_name: "By Neha Ma'am", educator_avatar_url: "/assets/student/teacher-female-1.jpg", scheduled_start: new Date(Date.now() + 7200000).toISOString(), time_display: "7:30 PM", is_live: false, status_text: "UPCOMING", live_status: "SCHEDULED", cta_text: "Reminder", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "80000000-0000-0000-0000-000000000003", batch_id: "50000000-0000-0000-0000-000000000001", subject: "English", topic: "Writing Skills", educator_name: "By Arjun Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", scheduled_start: new Date(Date.now() + 10800000).toISOString(), time_display: "8:30 PM", is_live: false, status_text: "UPCOMING", live_status: "SCHEDULED", cta_text: "Reminder", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "80000000-0000-0000-0000-000000000004", batch_id: "50000000-0000-0000-0000-000000000003", subject: "Physics", topic: "Laws of Motion", educator_name: "By Karan Sir", educator_avatar_url: "/assets/student/teacher-male-1.jpg", scheduled_start: new Date(Date.now() + 14400000).toISOString(), time_display: "5:00 PM", is_live: false, status_text: "UPCOMING", live_status: "SCHEDULED", cta_text: "Reminder", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const lc of liveClasses) {
    const { error } = await client.from("cms_live_classes").upsert(lc, { onConflict: "id" });
    if (error) stats.errors.push(`cms_live_classes (${lc.topic}): ${error.message}`);
    else stats.created++;
  }

  // 9. Hero Banners
  const heroBanners = [
    { id: "90000000-0000-0000-0000-000000000001", tagline: "TOPVEDA ACADEMIC DISCOVERY", title: "Learn. Practice. Grow.", subtitle: "Your future is built by what you do today.", cta_text: "Keep Learning →", cta_link: "#featured-batches", quote_text: "Better Students\nBrighter Futures", character_image_url: "/assets/student/hero-character.jpg", bg_gradient: "from-[#081326] via-[#0E2044] to-[#1B3A72]", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "90000000-0000-0000-0000-000000000002", tagline: "TARGET BOARDS 2027", title: "Master Every Concept with Top Faculty.", subtitle: "Structured daily live sessions, comprehensive notes & mock tests.", cta_text: "Explore Batches →", cta_link: "/student/batches", quote_text: "Excellence in Every Class", character_image_url: "/assets/student/hero-character.jpg", bg_gradient: "from-[#081326] via-[#0E2044] to-[#1B3A72]", display_order: 2, is_visible: true, status: "PUBLISHED" },
  ];
  for (const hb of heroBanners) {
    const { error } = await client.from("cms_hero_banners").upsert(hb, { onConflict: "id" });
    if (error) stats.errors.push(`cms_hero_banners (${hb.title}): ${error.message}`);
    else stats.created++;
  }

  // 10. Daily Quote
  const dailyQuote = {
    id: "a0000000-0000-0000-0000-000000000001",
    quote: "Success is built by the small things you do consistently every day.",
    author: "TopVeda",
    is_active: true,
    display_order: 1,
    is_visible: true,
    status: "PUBLISHED"
  };
  const { error: quoteErr } = await client.from("cms_daily_quotes").upsert(dailyQuote, { onConflict: "id" });
  if (quoteErr) stats.errors.push(`cms_daily_quotes: ${quoteErr.message}`);
  else stats.created++;

  // 11. Hub Items
  const hubItems = [
    { id: "b0000000-0000-0000-0000-000000000001", category: "announcement", badge_text: "NEW BATCH", badge_variant: "orange", title: "Class 10 Mathematics Batch", description: "Enrollment is now officially open for the new 2026-27 Board Preparation batch.", cta_text: "Explore Batch", cta_link: "/student/batches", icon_type: "megaphone", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "b0000000-0000-0000-0000-000000000002", category: "material", badge_text: "REVISION NOTES", badge_variant: "sky", title: "New Science Formula Sheets", description: "Comprehensive quick-revision PDF notes and mindmaps are ready for download.", cta_text: "View Material", cta_link: "/student/study-material", icon_type: "book", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "b0000000-0000-0000-0000-000000000003", category: "live", badge_text: "LIVE TODAY", badge_variant: "purple", title: "Trigonometry Masterclass", description: "Join Rohit Sir live at 6:00 PM for deep concept drills and PYQ problem-solving.", cta_text: "View Class", cta_link: "/student/live", icon_type: "target", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "b0000000-0000-0000-0000-000000000004", category: "tip", badge_text: "STUDY TIP", badge_variant: "emerald", title: "Daily Practice Discipline", description: "Solving 5 previous-year questions every evening boosts board retention by 40%.", cta_text: "Read More", cta_link: "/student/learning", icon_type: "lightbulb", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const hi of hubItems) {
    const { error } = await client.from("cms_hub_items").upsert(hi, { onConflict: "id" });
    if (error) stats.errors.push(`cms_hub_items (${hi.title}): ${error.message}`);
    else stats.created++;
  }

  // 12. Study Materials
  const materials = [
    { id: "c0000000-0000-0000-0000-000000000001", course_id: "40000000-0000-0000-0000-000000000001", chapter_id: "60000000-0000-0000-0000-000000000001", title: "Class 10 Trigonometry Formula Sheet", material_type: "formula_sheet", file_url: null, page_count: 4, download_count: 142, display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "c0000000-0000-0000-0000-000000000002", course_id: "40000000-0000-0000-0000-000000000002", chapter_id: "60000000-0000-0000-0000-000000000002", title: "Class 10 Chemical Reactions Quick Notes", material_type: "notes", file_url: null, page_count: 8, download_count: 98, display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "c0000000-0000-0000-0000-000000000003", course_id: "40000000-0000-0000-0000-000000000002", chapter_id: "60000000-0000-0000-0000-000000000002", title: "Class 10 Life Processes NCERT Solutions", material_type: "ncert_solution", file_url: null, page_count: 12, download_count: 210, display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "c0000000-0000-0000-0000-000000000004", course_id: "40000000-0000-0000-0000-000000000001", chapter_id: "60000000-0000-0000-0000-000000000001", title: "CBSE Class 10 Mathematics 2025 Solved PYQ", material_type: "pyq_paper", file_url: null, page_count: 16, download_count: 320, display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const m of materials) {
    const { error } = await client.from("cms_study_materials").upsert(m, { onConflict: "id" });
    if (error) stats.errors.push(`cms_study_materials (${m.title}): ${error.message}`);
    else stats.created++;
  }

  // 13. Chatbot Settings
  const chatbotSettings = {
    id: "d0000000-0000-0000-0000-000000000001",
    is_enabled: true,
    name: "TopVeda AI",
    greeting: "TopVeda AI Assistant",
    welcome_message: "TopVeda AI Assistant is coming soon!",
    placeholder_text: "Your 24/7 personal academic tutor is currently undergoing training to assist you with doubt-solving, instant concept explanations, and personalized revision.",
    system_instructions: "You are TopVeda AI, an encouraging and academically rigorous tutor for Indian school students (CBSE/BSEB/ICSE) preparing for board and competitive exams. Answer strictly using approved TopVeda knowledge.",
    maintenance_mode: false,
    maintenance_message: "TopVeda AI is undergoing scheduled academic knowledge updates. It will be back shortly.",
    rate_limit_per_minute: 10,
    max_daily_queries_per_student: 50,
    model_provider: "cloudflare_workers_ai",
    model_name: "@cf/meta/llama-3.1-8b-instruct",
    temperature: 0.20,
    max_tokens: 1024,
    status: "PUBLISHED"
  };
  const { error: cbErr } = await client.from("cms_chatbot_settings").upsert(chatbotSettings, { onConflict: "id" });
  if (cbErr) stats.errors.push(`cms_chatbot_settings: ${cbErr.message}`);
  else stats.created++;

  // 14. Chatbot Prompts
  const prompts = [
    { id: "e0000000-0000-0000-0000-000000000001", prompt_text: "Explain Pythagoras Theorem with an example", category_tag: "Academic", icon_name: "Calculator", display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "e0000000-0000-0000-0000-000000000002", prompt_text: "How do I balance chemical equations quickly?", category_tag: "Academic", icon_name: "Atom", display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "e0000000-0000-0000-0000-000000000003", prompt_text: "Create a 3-hour evening study routine for Class 10", category_tag: "Study Plan", icon_name: "Target", display_order: 3, is_visible: true, status: "PUBLISHED" },
    { id: "e0000000-0000-0000-0000-000000000004", prompt_text: "How to handle exam anxiety during mock tests?", category_tag: "Motivation", icon_name: "Sparkles", display_order: 4, is_visible: true, status: "PUBLISHED" },
  ];
  for (const p of prompts) {
    const { error } = await client.from("cms_chatbot_prompts").upsert(p, { onConflict: "id" });
    if (error) stats.errors.push(`cms_chatbot_prompts (${p.prompt_text}): ${error.message}`);
    else stats.created++;
  }

  // 15. Chatbot FAQs
  const faqs = [
    { id: "f0000000-0000-0000-0000-000000000001", question: "What is TopVeda AI Assistant?", answer: "TopVeda AI is your 24/7 personal tutor designed to assist you with conceptual explanations, homework doubts, revision strategies, and board exam preparation.", category: "General", search_tags: ["ai", "assistant", "tutor", "about"], display_order: 1, is_visible: true, status: "PUBLISHED" },
    { id: "f0000000-0000-0000-0000-000000000002", question: "How do I join a live class?", answer: "Navigate to the Live Classes tab from the left sidebar. Any ongoing session will feature a 'Join Class' button. Simply click to enter the interactive room.", category: "Live Classes", search_tags: ["live", "classes", "join", "schedule"], display_order: 2, is_visible: true, status: "PUBLISHED" },
    { id: "f0000000-0000-0000-0000-000000000003", question: "Where can I download chapter formula sheets?", answer: "Visit the Study Material section in the sidebar. You can filter by subject and download high-resolution PDF formula sheets and revision summaries.", category: "Study Material", search_tags: ["study material", "pdf", "formula sheet", "notes"], display_order: 3, is_visible: true, status: "PUBLISHED" },
  ];
  for (const f of faqs) {
    const { error } = await client.from("cms_chatbot_faqs").upsert(f, { onConflict: "id" });
    if (error) stats.errors.push(`cms_chatbot_faqs (${f.question}): ${error.message}`);
    else stats.created++;
  }

  console.log("=== SEED EXECUTION SUMMARY ===");
  console.log(`Total Operations Successful: ${stats.created}`);
  console.log(`Total Errors: ${stats.errors.length}`);
  if (stats.errors.length > 0) {
    console.log("Error details:", stats.errors);
  }
  console.log("==============================\n");
}

seed();

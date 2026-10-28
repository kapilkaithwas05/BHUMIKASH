// Read-only summary of academic accounts and their related records.
// Run from apps/api with: node -r dotenv/config scripts/academic-audit-readonly.cjs
const { Pool } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Check the local project environment.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;

    const [roles, profiles, labSummary, academicTables] = await Promise.all([
      client.query(`
        SELECT "role"::text AS role, COUNT(*)::int AS accounts
        FROM "User"
        GROUP BY "role"
        ORDER BY role
      `),
      client.query(`
        SELECT
          (SELECT COUNT(*) FROM "User" WHERE "role" = 'STUDENT')::int AS student_accounts,
          (SELECT COUNT(*) FROM "User" u WHERE u."role" = 'STUDENT' AND NOT EXISTS
            (SELECT 1 FROM "StudentProfile" sp WHERE sp."userId" = u."id"))::int AS students_without_profile,
          (SELECT COUNT(*) FROM "User" WHERE "role" = 'FACULTY')::int AS faculty_accounts,
          (SELECT COUNT(*) FROM "User" u WHERE u."role" = 'FACULTY' AND NOT EXISTS
            (SELECT 1 FROM "FacultyProfile" fp WHERE fp."userId" = u."id"))::int AS faculty_without_profile
      `),
      client.query(`
        SELECT
          COUNT(*)::int AS total_labs,
          COUNT(*) FILTER (WHERE "isPublished")::int AS published_labs,
          COUNT(*) FILTER (WHERE NOT "isPublished")::int AS unpublished_labs,
          COUNT(*) FILTER (WHERE "departmentId" IS NULL)::int AS labs_without_department,
          COUNT(*) FILTER (WHERE "courseId" IS NULL)::int AS labs_without_course,
          COUNT(*) FILTER (WHERE "cohortId" IS NULL)::int AS labs_without_cohort
        FROM "Lab"
      `),
      client.query(`
        SELECT
          (SELECT COUNT(*) FROM "Institution")::int AS institutions,
          (SELECT COUNT(*) FROM "Department")::int AS departments,
          (SELECT COUNT(*) FROM "Program")::int AS programs,
          (SELECT COUNT(*) FROM "AcademicYear")::int AS academic_years,
          (SELECT COUNT(*) FROM "Cohort")::int AS cohorts,
          (SELECT COUNT(*) FROM "StudentProfile")::int AS student_profiles,
          (SELECT COUNT(*) FROM "FacultyProfile")::int AS faculty_profiles,
          (SELECT COUNT(*) FROM "Course")::int AS courses,
          (SELECT COUNT(*) FROM "Lab")::int AS labs,
          (SELECT COUNT(*) FROM "Enrollment")::int AS enrollments
      `),
    ]);

    console.log("Account roles:");
    console.table(roles.rows);
    console.log("Profile coverage:");
    console.table(profiles.rows);
    console.log("Academic record counts:");
    console.table(academicTables.rows);
    console.log("Lab links and publication:");
    console.table(labSummary.rows);

  } finally {
    if (client) {
      if (transactionStarted) await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Read-only audit failed:", error.code || error.name || "unknown error");
  process.exitCode = 1;
});

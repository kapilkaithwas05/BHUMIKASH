
async function main() {
  throw new Error("This legacy roster seeder was removed because no verified institutional roster is included in the repository. Use the authorized student import workflow once the source roster is available.");
}

main().catch((error) => {
  console.error("Student seeding failed:", error);
  process.exitCode = 1;
});

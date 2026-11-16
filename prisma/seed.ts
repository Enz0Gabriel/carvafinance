import "dotenv/config";
import { db } from "@/server/db";
import { seedDemo } from "@/server/services/demo-data";

seedDemo(new Date())
  .then(({ created }) =>
    console.log(created ? "Demo data created" : "Demo data already exists"),
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

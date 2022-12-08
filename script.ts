import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import assert from "assert";

const prisma = new PrismaClient();

async function main() {
  await resetDatabaseForConsistentResults();

  // Create a user so the future nested create call will fail.
  await prisma.user.create({ data: { id: 1, email: "bugs@prisma.test" } });

  // Create a post with a nested user create (using the author relationship)
  const [createResult] = await Promise.allSettled([
    prisma.post.create({
      data: {
        title: "An example post",
        author: { create: { id: 1, email: "bugs2@prisma.test" } },
      },
    }),
  ]);

  // Make some base level assertions to make sure we're on the right track
  assert(createResult.status === "rejected", "Expected post creation to fail");
  const err = createResult.reason;
  assert(
    err instanceof PrismaClientKnownRequestError,
    "Expected post create to fail for known reason"
  );

  /* Here's the error message that prisma returns at this point:

  -- BEGIN ERROR --
      Invalid `prisma.post.create()` invocation in
      /Users/nicolas/source/nakleiderer/prisma-error-message-reproduction/script.ts:13:23

        10 await prisma.user.create({ data: { id: 1, email: "bugs@prisma.test" } });
        11
        12 try {
      → 13   await prisma.post.create(
      Unique constraint failed on the fields: (`id`)
  -- END ERROR --

  Notice there's nothing about this error that indicates the failure is regarding the nested
  */

  console.error(err);
}

async function resetDatabaseForConsistentResults() {
  await Promise.all([prisma.user.deleteMany(), prisma.post.deleteMany()]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

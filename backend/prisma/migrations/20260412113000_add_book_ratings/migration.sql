-- CreateTable
CREATE TABLE "book_ratings" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_ratings_book_id_member_id_key" ON "book_ratings"("book_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_book_ratings_book" ON "book_ratings"("book_id");

-- CreateIndex
CREATE INDEX "idx_book_ratings_member" ON "book_ratings"("member_id");

-- AddForeignKey
ALTER TABLE "book_ratings"
ADD CONSTRAINT "book_ratings_book_id_fkey"
FOREIGN KEY ("book_id") REFERENCES "books"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "book_ratings"
ADD CONSTRAINT "book_ratings_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

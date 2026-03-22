-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "books" (
    "id" SERIAL NOT NULL,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "publication_year" INTEGER,
    "category" TEXT,
    "language" TEXT DEFAULT 'English',
    "pages" INTEGER,
    "description" TEXT,
    "cover_image_url" TEXT,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "card_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "password_hash" TEXT,
    "member_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fines" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "joined_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "last_visit" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "staff_id" INTEGER,
    "checkout_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'checked_out',
    "checkout_condition" TEXT DEFAULT 'good',
    "return_condition" TEXT,
    "fine_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fine_paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "reservation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "staff_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hired_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_book_cache" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT,
    "author" TEXT,
    "cover_url" TEXT,
    "description" TEXT,
    "subjects" TEXT,
    "formats_available" TEXT,
    "is_public_domain" BOOLEAN NOT NULL DEFAULT false,
    "can_borrow" BOOLEAN NOT NULL DEFAULT false,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_book_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_uploaded_books" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "file_path" TEXT NOT NULL,
    "file_format" TEXT,
    "file_size" INTEGER,
    "cover_path" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_uploaded_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "book_type" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "current_location" TEXT,
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_category_idx" ON "books"("category");

-- CreateIndex
CREATE INDEX "books_author_idx" ON "books"("author");

-- CreateIndex
CREATE INDEX "books_updated_at_idx" ON "books"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "members_card_id_key" ON "members"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE INDEX "members_member_type_idx" ON "members"("member_type");

-- CreateIndex
CREATE INDEX "members_joined_date_idx" ON "members"("joined_date");

-- CreateIndex
CREATE INDEX "transactions_book_id_idx" ON "transactions"("book_id");

-- CreateIndex
CREATE INDEX "transactions_member_id_idx" ON "transactions"("member_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_checkout_date_idx" ON "transactions"("checkout_date");

-- CreateIndex
CREATE INDEX "transactions_due_date_idx" ON "transactions"("due_date");

-- CreateIndex
CREATE INDEX "transactions_status_due_date_idx" ON "transactions"("status", "due_date");

-- CreateIndex
CREATE INDEX "transactions_member_id_status_idx" ON "transactions"("member_id", "status");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staff_id_key" ON "staff"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "external_book_cache_cached_at_idx" ON "external_book_cache"("cached_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_book_cache_source_source_id_key" ON "external_book_cache"("source", "source_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_uploaded_books" ADD CONSTRAINT "user_uploaded_books_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "attachment_content_chunks" (
	"storage_key" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "attachment_content_chunks_pkey" PRIMARY KEY("storage_key","chunk_index"),
	CONSTRAINT "attachment_content_chunks_key_format" CHECK ("attachment_content_chunks"."storage_key" ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'),
	CONSTRAINT "attachment_content_chunks_index_range" CHECK ("attachment_content_chunks"."chunk_index" >= 0),
	CONSTRAINT "attachment_content_chunks_size_range" CHECK (octet_length("attachment_content_chunks"."data") BETWEEN 1 AND 1048576)
);
--> statement-breakpoint
-- Photos, PDFs and Office files are already compressed: store chunks out of line
-- without a futile pglz compression attempt.
ALTER TABLE "attachment_content_chunks" ALTER COLUMN "data" SET STORAGE EXTERNAL;

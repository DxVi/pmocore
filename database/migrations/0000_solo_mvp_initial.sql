CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "reference_values" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference_values_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category" text NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"semantic" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "reference_values_category_code_key" UNIQUE("category","code")
);
--> statement-breakpoint
CREATE TABLE "acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"release_id" uuid NOT NULL,
	"status_id" integer,
	"acceptance_date" date,
	"accepted_by" text,
	"certificate_ref" text,
	"certificate_document_id" uuid,
	"handover_notes" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "acceptances_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "acceptances_project_id_code_key" UNIQUE("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"activity_type_id" integer,
	"title" text NOT NULL,
	"activity_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"mode_id" integer,
	"location" text,
	"end_users" text,
	"attendees" text,
	"agenda" text,
	"findings" text,
	"outcomes" text,
	"todo_summary" text,
	"minutes_ref" text,
	"minutes_document_id" uuid,
	"prepared_by_user_id" uuid,
	"status_id" integer,
	"next_schedule_date" date,
	"next_schedule_note" text,
	"related_requirement_id" uuid,
	"previous_activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "activities_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "activities_project_id_code_key" UNIQUE("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_type" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"extension" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_driver" text NOT NULL,
	"storage_key" text NOT NULL,
	"capture_source" text,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"purged_at" timestamp with time zone,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachments_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "attachments_size_range" CHECK ("attachments"."size_bytes" BETWEEN 1 AND 10485760),
	CONSTRAINT "attachments_parent_type_allowed" CHECK ("attachments"."parent_type" IN ('activity', 'document')),
	CONSTRAINT "attachments_capture_source_allowed" CHECK ("attachments"."capture_source" IS NULL OR "attachments"."capture_source" IN ('camera', 'gallery', 'file'))
);
--> statement-breakpoint
CREATE TABLE "defects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"test_case_id" uuid,
	"external_ref" text,
	"title" text NOT NULL,
	"description" text,
	"severity_id" integer,
	"assignee_name" text,
	"status_id" integer,
	"target_fix_date" date,
	"target_fix_release_id" uuid,
	"retest_date" date,
	"retest_result_id" integer,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "defects_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "defects_project_id_code_key" UNIQUE("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"phase_id" integer,
	"document_type_id" integer,
	"title" text NOT NULL,
	"doc_version" text,
	"owner_name" text,
	"document_date" date,
	"status_id" integer,
	"link_url" text,
	"related_requirement_id" uuid,
	"related_activity_id" uuid,
	"related_release_id" uuid,
	"related_work_item_id" uuid,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "documents_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "documents_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "documents_single_related_record" CHECK (num_nonnulls("documents"."related_requirement_id", "documents"."related_activity_id", "documents"."related_release_id", "documents"."related_work_item_id") <= 1),
	CONSTRAINT "documents_link_url_scheme" CHECK ("documents"."link_url" IS NULL OR "documents"."link_url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"phase_id" integer,
	"status_id" integer,
	"health_id" integer,
	"start_date" date,
	"target_date" date,
	"go_live_date" date,
	"next_milestone_label" text,
	"next_milestone_date" date,
	"pm_remarks" text,
	"owner_user_id" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code"),
	CONSTRAINT "projects_code_format" CHECK ("projects"."code" ~ '^[A-Z0-9-]{2,20}$')
);
--> statement-breakpoint
CREATE TABLE "raid_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"type_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"impact" text,
	"owner_name" text,
	"date_raised" date NOT NULL,
	"source_activity_id" uuid,
	"probability_id" integer,
	"priority_id" integer,
	"due_date" date,
	"status_id" integer,
	"mitigation" text,
	"resolution" text,
	"closed_date" date,
	"evidence" text,
	"remarks" text,
	"requirement_id" uuid,
	"release_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "raid_items_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "raid_items_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "raid_items_closed_order" CHECK ("raid_items"."closed_date" IS NULL OR "raid_items"."closed_date" >= "raid_items"."date_raised")
);
--> statement-breakpoint
CREATE TABLE "record_counters" (
	"project_id" uuid NOT NULL,
	"record_type" text NOT NULL,
	"next_value" integer NOT NULL,
	CONSTRAINT "record_counters_pkey" PRIMARY KEY("project_id","record_type")
);
--> statement-breakpoint
CREATE TABLE "release_defects" (
	"project_id" uuid NOT NULL,
	"release_id" uuid NOT NULL,
	"defect_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "release_defects_pkey" PRIMARY KEY("release_id","defect_id")
);
--> statement-breakpoint
CREATE TABLE "release_requirements" (
	"project_id" uuid NOT NULL,
	"release_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "release_requirements_pkey" PRIMARY KEY("release_id","requirement_id")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"version_label" text NOT NULL,
	"name" text,
	"planned_date" date,
	"release_date" date,
	"environment_id" integer,
	"scope" text,
	"deployment_status_id" integer,
	"demo_date" date,
	"uat_date" date,
	"uat_result_id" integer,
	"delivery_date" date,
	"training_date" date,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "releases_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "releases_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "releases_project_version_key" UNIQUE("project_id","version_label")
);
--> statement-breakpoint
CREATE TABLE "requirement_work_items" (
	"project_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"work_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "requirement_work_items_pkey" PRIMARY KEY("requirement_id","work_item_id")
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"module" text,
	"date_raised" date,
	"source" text,
	"statement" text NOT NULL,
	"acceptance_criteria" text,
	"type_id" integer,
	"priority_id" integer,
	"assignee_name" text,
	"status_id" integer,
	"target_release_id" uuid,
	"is_change_request" boolean DEFAULT false NOT NULL,
	"change_request_raid_id" uuid,
	"validation_evidence" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "requirements_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "requirements_project_id_code_key" UNIQUE("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"module" text,
	"requirement_id" uuid,
	"stage_id" integer,
	"scenario" text NOT NULL,
	"expected_result" text,
	"actual_result" text,
	"tester_name" text,
	"test_date" date,
	"result_id" integer,
	"status_id" integer,
	"evidence" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "test_cases_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "test_cases_project_id_code_key" UNIQUE("project_id","code")
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"phase_id" integer,
	"workstream" text,
	"title" text NOT NULL,
	"description" text,
	"owner_name" text,
	"planned_start" date,
	"planned_end" date,
	"actual_start" date,
	"actual_end" date,
	"percent_complete" smallint DEFAULT 0 NOT NULL,
	"status_id" integer,
	"priority_id" integer,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"dependency_note" text,
	"evidence_ref" text,
	"evidence_document_id" uuid,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "work_items_project_id_id_key" UNIQUE("project_id","id"),
	CONSTRAINT "work_items_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "work_items_percent_range" CHECK ("work_items"."percent_complete" BETWEEN 0 AND 100),
	CONSTRAINT "work_items_planned_order" CHECK ("work_items"."planned_end" IS NULL OR "work_items"."planned_start" IS NULL OR "work_items"."planned_end" >= "work_items"."planned_start"),
	CONSTRAINT "work_items_actual_order" CHECK ("work_items"."actual_end" IS NULL OR "work_items"."actual_start" IS NULL OR "work_items"."actual_end" >= "work_items"."actual_start")
);
--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_release_fk" FOREIGN KEY ("project_id","release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_certificate_document_fk" FOREIGN KEY ("project_id","certificate_document_id") REFERENCES "public"."documents"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_reference_values_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_mode_id_reference_values_id_fk" FOREIGN KEY ("mode_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_prepared_by_user_id_users_id_fk" FOREIGN KEY ("prepared_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_minutes_document_fk" FOREIGN KEY ("project_id","minutes_document_id") REFERENCES "public"."documents"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_related_requirement_fk" FOREIGN KEY ("project_id","related_requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_previous_activity_fk" FOREIGN KEY ("project_id","previous_activity_id") REFERENCES "public"."activities"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_severity_id_reference_values_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_retest_result_id_reference_values_id_fk" FOREIGN KEY ("retest_result_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_test_case_fk" FOREIGN KEY ("project_id","test_case_id") REFERENCES "public"."test_cases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_target_fix_release_fk" FOREIGN KEY ("project_id","target_fix_release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_phase_id_reference_values_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_reference_values_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_related_requirement_fk" FOREIGN KEY ("project_id","related_requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_related_activity_fk" FOREIGN KEY ("project_id","related_activity_id") REFERENCES "public"."activities"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_related_release_fk" FOREIGN KEY ("project_id","related_release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_related_work_item_fk" FOREIGN KEY ("project_id","related_work_item_id") REFERENCES "public"."work_items"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_phase_id_reference_values_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_health_id_reference_values_id_fk" FOREIGN KEY ("health_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_type_id_reference_values_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_probability_id_reference_values_id_fk" FOREIGN KEY ("probability_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_priority_id_reference_values_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_source_activity_fk" FOREIGN KEY ("project_id","source_activity_id") REFERENCES "public"."activities"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_requirement_fk" FOREIGN KEY ("project_id","requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_items" ADD CONSTRAINT "raid_items_release_fk" FOREIGN KEY ("project_id","release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_counters" ADD CONSTRAINT "record_counters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_defects" ADD CONSTRAINT "release_defects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_defects" ADD CONSTRAINT "release_defects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_defects" ADD CONSTRAINT "release_defects_release_fk" FOREIGN KEY ("project_id","release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_defects" ADD CONSTRAINT "release_defects_defect_fk" FOREIGN KEY ("project_id","defect_id") REFERENCES "public"."defects"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_requirements" ADD CONSTRAINT "release_requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_requirements" ADD CONSTRAINT "release_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_requirements" ADD CONSTRAINT "release_requirements_release_fk" FOREIGN KEY ("project_id","release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_requirements" ADD CONSTRAINT "release_requirements_requirement_fk" FOREIGN KEY ("project_id","requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_environment_id_reference_values_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_deployment_status_id_reference_values_id_fk" FOREIGN KEY ("deployment_status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_uat_result_id_reference_values_id_fk" FOREIGN KEY ("uat_result_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_work_items" ADD CONSTRAINT "requirement_work_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_work_items" ADD CONSTRAINT "requirement_work_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_work_items" ADD CONSTRAINT "requirement_work_items_requirement_fk" FOREIGN KEY ("project_id","requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_work_items" ADD CONSTRAINT "requirement_work_items_work_item_fk" FOREIGN KEY ("project_id","work_item_id") REFERENCES "public"."work_items"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_type_id_reference_values_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_priority_id_reference_values_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_target_release_fk" FOREIGN KEY ("project_id","target_release_id") REFERENCES "public"."releases"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_change_request_raid_fk" FOREIGN KEY ("project_id","change_request_raid_id") REFERENCES "public"."raid_items"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_stage_id_reference_values_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_result_id_reference_values_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_requirement_fk" FOREIGN KEY ("project_id","requirement_id") REFERENCES "public"."requirements"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_phase_id_reference_values_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_status_id_reference_values_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_priority_id_reference_values_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."reference_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_evidence_document_fk" FOREIGN KEY ("project_id","evidence_document_id") REFERENCES "public"."documents"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "reference_values_category_sort_idx" ON "reference_values" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "acceptances_project_updated_idx" ON "acceptances" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "acceptances_project_release_created_idx" ON "acceptances" USING btree ("project_id","release_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activities_project_updated_idx" ON "activities" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activities_project_date_idx" ON "activities" USING btree ("project_id","activity_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activities_project_status_idx" ON "activities" USING btree ("project_id","status_id");--> statement-breakpoint
CREATE INDEX "attachments_parent_active_idx" ON "attachments" USING btree ("project_id","parent_type","parent_id") WHERE "attachments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "attachments_deleted_purge_idx" ON "attachments" USING btree ("deleted_at") WHERE "attachments"."deleted_at" IS NOT NULL AND "attachments"."purged_at" IS NULL;--> statement-breakpoint
CREATE INDEX "defects_project_updated_idx" ON "defects" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "defects_project_test_case_idx" ON "defects" USING btree ("project_id","test_case_id");--> statement-breakpoint
CREATE INDEX "defects_project_status_idx" ON "defects" USING btree ("project_id","status_id");--> statement-breakpoint
CREATE INDEX "documents_project_updated_idx" ON "documents" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "documents_project_type_idx" ON "documents" USING btree ("project_id","document_type_id");--> statement-breakpoint
CREATE INDEX "projects_owner_archived_idx" ON "projects" USING btree ("owner_user_id","archived_at");--> statement-breakpoint
CREATE INDEX "projects_updated_idx" ON "projects" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "raid_items_project_updated_idx" ON "raid_items" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "raid_items_project_type_status_idx" ON "raid_items" USING btree ("project_id","type_id","status_id");--> statement-breakpoint
CREATE INDEX "raid_items_project_due_idx" ON "raid_items" USING btree ("project_id","due_date");--> statement-breakpoint
CREATE INDEX "raid_items_project_source_activity_idx" ON "raid_items" USING btree ("project_id","source_activity_id");--> statement-breakpoint
CREATE INDEX "release_defects_defect_idx" ON "release_defects" USING btree ("defect_id");--> statement-breakpoint
CREATE INDEX "release_requirements_requirement_idx" ON "release_requirements" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "releases_project_updated_idx" ON "releases" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "releases_project_release_date_idx" ON "releases" USING btree ("project_id","release_date");--> statement-breakpoint
CREATE INDEX "requirement_work_items_work_item_idx" ON "requirement_work_items" USING btree ("work_item_id");--> statement-breakpoint
CREATE INDEX "requirements_project_updated_idx" ON "requirements" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "requirements_project_status_idx" ON "requirements" USING btree ("project_id","status_id");--> statement-breakpoint
CREATE INDEX "requirements_project_target_release_idx" ON "requirements" USING btree ("project_id","target_release_id");--> statement-breakpoint
CREATE INDEX "test_cases_project_updated_idx" ON "test_cases" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "test_cases_project_requirement_idx" ON "test_cases" USING btree ("project_id","requirement_id");--> statement-breakpoint
CREATE INDEX "test_cases_project_result_idx" ON "test_cases" USING btree ("project_id","result_id");--> statement-breakpoint
CREATE INDEX "work_items_project_updated_idx" ON "work_items" USING btree ("project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "work_items_project_status_idx" ON "work_items" USING btree ("project_id","status_id");--> statement-breakpoint
CREATE INDEX "work_items_project_planned_end_idx" ON "work_items" USING btree ("project_id","planned_end");
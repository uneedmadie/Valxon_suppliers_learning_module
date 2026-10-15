/**
 * Počáteční schéma databáze (vygenerováno TypeORM CLI z entit, needitovat ručně).
 */
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792090957101 implements MigrationInterface {
    name = 'InitialSchema1792090957101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chapter_answers" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar(64) NOT NULL, "supplierId" varchar(36) NOT NULL, "chapterId" varchar(36) NOT NULL, "chapterNumber" integer NOT NULL, "questionId" varchar(36) NOT NULL, "questionVersion" integer NOT NULL, "selectedIndex" integer NOT NULL, "isCorrect" boolean NOT NULL, "attempts" integer NOT NULL DEFAULT (1), "answeredAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d31effe223d1701f0f04e27f283" UNIQUE ("userId", "chapterId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0efd1d552690e4f923a4eb0396" ON "chapter_answers" ("userId", "supplierId") `);
        await queryRunner.query(`CREATE TABLE "chapters" ("id" varchar PRIMARY KEY NOT NULL, "supplierId" varchar(36) NOT NULL, "number" integer NOT NULL, "title" varchar(160) NOT NULL, "lead" text NOT NULL DEFAULT (''), "body" text NOT NULL DEFAULT (''), "highlight" text, "status" varchar(16) NOT NULL DEFAULT ('draft'), "isGeneratedDraft" boolean NOT NULL DEFAULT (1), "version" integer NOT NULL DEFAULT (1), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_f92f8c1518bc785451d578e3846" UNIQUE ("supplierId", "number"))`);
        await queryRunner.query(`CREATE TABLE "facts" ("id" varchar PRIMARY KEY NOT NULL, "supplierId" varchar(36) NOT NULL, "chapter" integer NOT NULL, "kind" varchar(32) NOT NULL, "label" varchar(160) NOT NULL, "value" text NOT NULL, "quote" text, "sourceId" varchar(36), "location" varchar(400), "origin" varchar(16) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('proposed'), "confidence" varchar(8) NOT NULL DEFAULT ('medium'), "verifiedBy" varchar(64), "verifiedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_d2e3979d1aa597594dec6d14fe" ON "facts" ("supplierId", "chapter") `);
        await queryRunner.query(`CREATE TABLE "import_jobs" ("id" varchar PRIMARY KEY NOT NULL, "supplierId" varchar(36) NOT NULL, "status" varchar(24) NOT NULL DEFAULT ('queued'), "log" text NOT NULL, "report" text, "startedAt" datetime, "finishedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_ab37eaa328bfa33a1e5153bd46" ON "import_jobs" ("supplierId") `);
        await queryRunner.query(`CREATE TABLE "products" ("id" varchar PRIMARY KEY NOT NULL, "supplierId" varchar(36) NOT NULL, "listType" varchar(16) NOT NULL, "position" integer NOT NULL DEFAULT (0), "inputName" varchar(300), "inputSku" varchar(120), "inputUrl" varchar(2048), "name" varchar(300) NOT NULL, "sku" varchar(120), "productUrl" varchar(2048), "imageUrl" varchar(2048), "imageSourceUrl" varchar(2048), "description" text, "material" varchar(300), "category" varchar(300), "matchStatus" varchar(16) NOT NULL DEFAULT ('pending'), "candidates" text, "showInLesson" boolean NOT NULL DEFAULT (0), "sourceId" varchar(36), "location" varchar(400), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_c143cbc0299e1f9220c4b5debd" ON "products" ("supplierId") `);
        await queryRunner.query(`CREATE TABLE "questions" ("id" varchar PRIMARY KEY NOT NULL, "chapterId" varchar(36) NOT NULL, "prompt" text NOT NULL, "options" text NOT NULL, "correctIndex" integer NOT NULL, "explanation" text NOT NULL, "factId" varchar(36), "origin" varchar(16) NOT NULL DEFAULT ('generated'), "status" varchar(16) NOT NULL DEFAULT ('draft'), "version" integer NOT NULL DEFAULT (1), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_cfe58fac0630926da6ec28417a6" UNIQUE ("chapterId"))`);
        await queryRunner.query(`CREATE TABLE "source_segments" ("id" varchar PRIMARY KEY NOT NULL, "sourceId" varchar(36) NOT NULL, "ordinal" integer NOT NULL, "location" varchar(400) NOT NULL, "text" text NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_b53bbca7ad46a0375e22363435" ON "source_segments" ("sourceId") `);
        await queryRunner.query(`CREATE TABLE "sources" ("id" varchar PRIMARY KEY NOT NULL, "supplierId" varchar(36) NOT NULL, "kind" varchar(16) NOT NULL, "origin" varchar(16) NOT NULL DEFAULT ('official'), "title" varchar(300) NOT NULL, "url" varchar(2048), "originalFileName" varchar(260), "storedFileName" varchar(120), "sizeBytes" integer, "status" varchar(16) NOT NULL DEFAULT ('pending'), "error" text, "warnings" text, "parentSourceId" varchar(36), "textLength" integer NOT NULL DEFAULT (0), "retrievedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_71c4d97aafd51d6bd7da2aa192" ON "sources" ("supplierId") `);
        await queryRunner.query(`CREATE TABLE "suppliers" ("id" varchar PRIMARY KEY NOT NULL, "slug" varchar(120) NOT NULL, "name" varchar(160) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('draft'), "supplierType" varchar(16) NOT NULL DEFAULT ('unknown'), "websiteUrl" varchar(2048), "tagline" varchar(240), "hqCity" varchar(120), "hqCountryCode" varchar(2), "adminNotes" text, "contentVersion" integer NOT NULL DEFAULT (0), "publishedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_2ab512720a1b9de8624a3dcf207" UNIQUE ("slug"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" varchar(64) PRIMARY KEY NOT NULL, "name" varchar(120) NOT NULL, "role" varchar(16) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`DROP INDEX "IDX_71c4d97aafd51d6bd7da2aa192"`);
        await queryRunner.query(`DROP TABLE "sources"`);
        await queryRunner.query(`DROP INDEX "IDX_b53bbca7ad46a0375e22363435"`);
        await queryRunner.query(`DROP TABLE "source_segments"`);
        await queryRunner.query(`DROP TABLE "questions"`);
        await queryRunner.query(`DROP INDEX "IDX_c143cbc0299e1f9220c4b5debd"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP INDEX "IDX_ab37eaa328bfa33a1e5153bd46"`);
        await queryRunner.query(`DROP TABLE "import_jobs"`);
        await queryRunner.query(`DROP INDEX "IDX_d2e3979d1aa597594dec6d14fe"`);
        await queryRunner.query(`DROP TABLE "facts"`);
        await queryRunner.query(`DROP TABLE "chapters"`);
        await queryRunner.query(`DROP INDEX "IDX_0efd1d552690e4f923a4eb0396"`);
        await queryRunner.query(`DROP TABLE "chapter_answers"`);
    }

}

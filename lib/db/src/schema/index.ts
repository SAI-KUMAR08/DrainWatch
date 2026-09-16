import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    hazardType: text("hazard_type").notNull(),
    severity: text("severity").notNull(),
    verificationStatus: text("verification_status").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    locationName: text("location_name").notNull(),
    description: text("description").notNull(),
    reporterEmail: text("reporter_email"),
    photoUrl: text("photo_url"),
    riskScore: integer("risk_score").notNull(),
    riskComponents: jsonb("risk_components")
      .$type<{
        severity: number;
        recent_density: number;
        historical_frequency: number;
        rainfall: number;
        recency: number;
      }>()
      .notNull(),
    status: text("status").notNull().default("reported"),
    source: text("source").notNull().default("citizen"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reports_created_at_idx").on(table.createdAt),
    index("reports_status_idx").on(table.status),
    index("reports_severity_idx").on(table.severity),
  ],
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    actor: text("actor").notNull(),
    reportId: text("report_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_created_at_idx").on(table.createdAt)],
);

export const insertReportSchema = createInsertSchema(reportsTable);
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
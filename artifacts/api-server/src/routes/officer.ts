import { Router, type IRouter } from "express";
import {
  GetOfficerDashboardResponse,
  GetOfficerReportParams,
  GetOfficerReportResponse,
  GetOfficerWeatherResponse,
  ListOfficerActivityResponse,
  ListOfficerAuditLogsResponse,
  ListOfficerReportsQueryParams,
  ListOfficerReportsResponse,
  UpdateOfficerReportStatusBody,
  UpdateOfficerReportStatusParams,
  UpdateOfficerReportStatusResponse,
} from "@workspace/api-zod";
import { desc } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import {
  getAuditLogs,
  getDashboardStats,
  getReport,
  getReports,
  toReportResponse,
  updateReportStatus,
} from "../lib/drainwatch";

const router: IRouter = Router();
router.use("/officer", requireRole("officer"));

router.get("/officer/dashboard", async (_req, res): Promise<void> => {
  res.json(GetOfficerDashboardResponse.parse(await getDashboardStats()));
});

router.get("/officer/reports", async (req, res): Promise<void> => {
  const parsed = ListOfficerReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reports = await getReports({ ...parsed.data, limit: 100 });
  res.json(ListOfficerReportsResponse.parse(reports.map(toReportResponse)));
});

router.get("/officer/reports/:id", async (req, res): Promise<void> => {
  const params = GetOfficerReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const report = await getReport(params.data.id);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(GetOfficerReportResponse.parse(toReportResponse(report)));
});

router.patch("/officer/reports/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOfficerReportStatusParams.safeParse(req.params);
  const body = UpdateOfficerReportStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid report status update" });
    return;
  }
  const updated = await updateReportStatus(params.data.id, body.data.status, req.auth!.email);
  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(UpdateOfficerReportStatusResponse.parse(toReportResponse(updated)));
});

router.get("/officer/activity", async (_req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.updatedAt)).limit(20);
  res.json(
    ListOfficerActivityResponse.parse(
      reports.map((report) => ({
        id: `activity-${report.id}`,
        text: `${report.hazardType.replaceAll("_", " ")} at ${report.locationName}`,
        severity: report.severity,
        status: report.status,
        created_at: report.updatedAt,
      })),
    ),
  );
});

router.get("/officer/audit-logs", async (_req, res): Promise<void> => {
  const logs = await getAuditLogs();
  res.json(
    ListOfficerAuditLogsResponse.parse(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        report_id: log.reportId,
        created_at: log.createdAt,
      })),
    ),
  );
});

router.get("/officer/weather", (_req, res): void => {
  res.json(
    GetOfficerWeatherResponse.parse({
      status: "unavailable",
      rainfall_mm: null,
      source: null,
      observed_at: null,
    }),
  );
});

export default router;
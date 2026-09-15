import { Router, type IRouter } from "express";
import {
  CreateCitizenReportBody,
  CreateCitizenReportResponse,
  GetCitizenReportParams,
  GetCitizenReportResponse,
  ListCitizenReportsResponse,
} from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";
import { getReport, insertCitizenReport, toReportResponse } from "../lib/drainwatch";
import { db, reportsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();
router.use("/citizen", requireRole("citizen"));

router.get("/citizen/reports", async (req, res): Promise<void> => {
  const reports = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.reporterEmail, req.auth!.email))
    .orderBy(desc(reportsTable.createdAt));
  res.json(ListCitizenReportsResponse.parse(reports.map(toReportResponse)));
});

router.post("/citizen/reports", async (req, res): Promise<void> => {
  const parsed = CreateCitizenReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const report = await insertCitizenReport({
    ...parsed.data,
    reporter_email: req.auth!.email,
  });
  res.status(201).json(CreateCitizenReportResponse.parse(toReportResponse(report)));
});

router.get("/citizen/reports/:id", async (req, res): Promise<void> => {
  const params = GetCitizenReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const report = await getReport(params.data.id);
  if (!report || report.reporterEmail !== req.auth!.email) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(GetCitizenReportResponse.parse(toReportResponse(report)));
});

export default router;
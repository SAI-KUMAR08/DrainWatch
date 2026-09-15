import { Router, type IRouter } from "express";
import { ListPublicAlertsResponse, ListPublicReportsResponse } from "@workspace/api-zod";
import { getReports, toReportResponse } from "../lib/drainwatch";

const router: IRouter = Router();

router.get("/public/alerts", (_req, res): void => {
  res.json(
    ListPublicAlertsResponse.parse([
      {
        id: "alert-hyd-monsoon",
        title: "Monsoon readiness update",
        message: "Avoid standing water near underpasses and report blocked drains before travelling.",
        severity: "watch",
        issued_at: new Date().toISOString(),
      },
    ]),
  );
});

router.get("/public/reports", async (_req, res): Promise<void> => {
  const reports = await getReports({ limit: 100 });
  res.json(
    ListPublicReportsResponse.parse(
      reports.map((report) => ({
        ...toReportResponse(report),
        description: report.description,
      })),
    ),
  );
});

export default router;
// Re-export the drainwatch DB operations so API routes import from one place.
// The actual implementation lives in the shared api-server lib.
import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, auditLogsTable, reportsTable, type Report } from '@workspace/db';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
type ReportStatus = 'reported' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';

const severityValue: Record<Severity, number> = {
  critical: 100,
  high: 80,
  medium: 55,
  low: 30,
  unknown: 20,
};

export function riskLevel(score: number) {
  if (score >= 75) return 'critical' as const;
  if (score >= 50) return 'high' as const;
  if (score >= 25) return 'moderate' as const;
  return 'low' as const;
}

export function calculateRisk(
  severity: Severity,
  recentReports: number,
  historicalReports: number,
  createdAt = new Date(),
) {
  const components = {
    severity: severityValue[severity],
    recent_density: Math.min(recentReports * 18, 100),
    historical_frequency: Math.min(historicalReports * 12, 100),
    rainfall: 0,
    recency: Math.max(
      0,
      100 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000) * 20,
    ),
  };
  const score = Math.round(
    components.severity * 0.3 +
      components.recent_density * 0.25 +
      components.historical_frequency * 0.2 +
      components.rainfall * 0.15 +
      components.recency * 0.1,
  );
  return { score: Math.max(0, Math.min(100, score)), components };
}

export function toReportResponse(report: Report) {
  return {
    id: report.id,
    hazard_type: report.hazardType,
    severity: report.severity,
    risk_score: report.riskScore,
    risk_level: riskLevel(report.riskScore),
    risk_components: report.riskComponents,
    status: report.status,
    verification_status: report.verificationStatus,
    latitude: report.latitude,
    longitude: report.longitude,
    location_name: report.locationName,
    description: report.description,
    source: report.source,
    is_demo: report.isDemo,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  };
}

export async function seedDemoReports() {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(reportsTable);
  if (Number(existing?.count ?? 0) > 0) return;

  const seed = [
    { id: 'demo-hyd-001', hazardType: 'waterlogging', severity: 'critical', latitude: 17.4239, longitude: 78.4738, locationName: 'Tank Bund Road, Hyderabad', description: 'Water has reached the edge of the carriageway near the public promenade. Vehicles are being diverted.', status: 'verified', verificationStatus: 'officer_verified', source: 'verified' },
    { id: 'demo-hyd-002', hazardType: 'blocked_drain', severity: 'high', latitude: 17.4126, longitude: 78.4483, locationName: 'Banjara Hills Road No. 12', description: 'Drain grate completely blocked with silt and plastic waste after overnight heavy rain.', status: 'assigned', verificationStatus: 'pending_review', source: 'citizen' },
    { id: 'demo-hyd-003', hazardType: 'open_manhole', severity: 'high', latitude: 17.4948, longitude: 78.3996, locationName: 'Kukatpally Housing Board Colony', description: 'Open manhole cover beside the service road near KPHB bus stop — safety hazard for pedestrians.', status: 'in_progress', verificationStatus: 'officer_verified', source: 'citizen' },
    { id: 'demo-hyd-004', hazardType: 'sewage_overflow', severity: 'medium', latitude: 17.385, longitude: 78.4867, locationName: 'Mehdipatnam Ring Road', description: 'Sewage overflow affecting pedestrian lane outside the market entrance. Strong odour reported.', status: 'reported', verificationStatus: 'pending_review', source: 'news' },
    { id: 'demo-hyd-005', hazardType: 'waterlogging', severity: 'high', latitude: 17.4401, longitude: 78.3489, locationName: 'Miyapur Metro Station Road', description: 'Underpass near Miyapur metro flooded knee-deep. Auto-rickshaws stranded. Residents requesting pumps.', status: 'verified', verificationStatus: 'officer_verified', source: 'citizen' },
    { id: 'demo-hyd-006', hazardType: 'blocked_drain', severity: 'medium', latitude: 17.3616, longitude: 78.4747, locationName: 'Attapur Bridge, Rajendra Nagar', description: 'Drain running alongside the bridge is 80% silted. Flow is heavily restricted before next rain.', status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen' },
    { id: 'demo-hyd-007', hazardType: 'open_manhole', severity: 'critical', latitude: 17.4484, longitude: 78.3915, locationName: 'HITEC City Main Road', description: 'Two consecutive manhole covers missing on the main IT corridor road. Night-time accident risk is very high.', status: 'in_progress', verificationStatus: 'officer_verified', source: 'citizen' },
    { id: 'demo-hyd-008', hazardType: 'sewage_overflow', severity: 'high', latitude: 17.3753, longitude: 78.4744, locationName: 'Tolichowki Junction', description: 'Sewage line burst under the road. Slick surface and health risk across a 50-metre stretch.', status: 'assigned', verificationStatus: 'officer_verified', source: 'news' },
    { id: 'demo-hyd-009', hazardType: 'waterlogging', severity: 'low', latitude: 17.4065, longitude: 78.5068, locationName: 'LB Nagar Circle', description: 'Shallow pooling near the footpath. Likely to clear within 4 hours without intervention.', status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen' },
    { id: 'demo-hyd-010', hazardType: 'blocked_drain', severity: 'critical', latitude: 17.4597, longitude: 78.3723, locationName: 'Gachibowli Stadium Road', description: 'Main storm drain serving three colonies is fully blocked. Predicted flooding if rain exceeds 20mm tonight.', status: 'verified', verificationStatus: 'officer_verified', source: 'verified' },
    { id: 'demo-hyd-011', hazardType: 'sewage_overflow', severity: 'low', latitude: 17.4271, longitude: 78.5015, locationName: 'Uppal Bus Depot Road', description: 'Minor overflow near the GHMC pipe junction. Self-limiting — monitoring requested.', status: 'reported', verificationStatus: 'pending_review', source: 'citizen' },
    { id: 'demo-hyd-012', hazardType: 'open_manhole', severity: 'medium', latitude: 17.4339, longitude: 78.5004, locationName: 'Nagole Flyover Service Lane', description: 'Manhole cover partially lifted by passing heavy vehicle. Loose cover rattles under traffic.', status: 'assigned', verificationStatus: 'pending_review', source: 'citizen' },
    { id: 'demo-hyd-013', hazardType: 'waterlogging', severity: 'high', latitude: 17.3493, longitude: 78.5527, locationName: 'Dilsukhnagar Bus Terminal', description: 'Bus bay and pedestrian island underwater. Several buses re-routed. Passengers stranded.', status: 'in_progress', verificationStatus: 'officer_verified', source: 'news' },
    { id: 'demo-hyd-014', hazardType: 'blocked_drain', severity: 'medium', latitude: 17.4144, longitude: 78.4804, locationName: 'Himayat Nagar Main Road', description: 'Drain inlet near the Himayat Nagar crossroads choked with construction debris dumped overnight.', status: 'reported', verificationStatus: 'pending_review', source: 'citizen' },
  ] as const;

  const now = new Date();
  await db.insert(reportsTable).values(
    seed.map((item, index) => {
      const risk = calculateRisk(item.severity as Severity, Math.max(1, 5 - index % 5), 6, now);
      return {
        ...item,
        riskScore: risk.score,
        riskComponents: risk.components,
        isDemo: true,
        createdAt: new Date(now.getTime() - index * 50 * 60 * 1000),
        updatedAt: new Date(now.getTime() - index * 20 * 60 * 1000),
      };
    }),
  );
}


export async function insertCitizenReport(input: { hazard_type: string; description: string; location_name: string; latitude: number; longitude: number; reporter_email: string; }) {
  const [recentCount] = await db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(sql`${reportsTable.createdAt} > now() - interval '24 hours'`);
  const [historicalCount] = await db.select({ count: sql<number>`count(*)` }).from(reportsTable);
  const severity: Severity = input.hazard_type === 'open_manhole' ? 'high' : input.hazard_type === 'waterlogging' ? 'medium' : 'low';
  const risk = calculateRisk(severity, Number(recentCount?.count ?? 0) + 1, Number(historicalCount?.count ?? 0) + 1);
  const now = new Date();
  const [created] = await db.insert(reportsTable).values({ id: randomUUID(), hazardType: input.hazard_type, severity, verificationStatus: 'pending_review', latitude: input.latitude, longitude: input.longitude, locationName: input.location_name, description: input.description, reporterEmail: input.reporter_email, riskScore: risk.score, riskComponents: risk.components, status: 'reported', source: 'citizen', isDemo: false, createdAt: now, updatedAt: now }).returning();
  return created;
}

export async function getReports(filters?: { status?: string; severity?: string; limit?: number }) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(reportsTable.status, filters.status));
  if (filters?.severity) conditions.push(eq(reportsTable.severity, filters.severity));
  return db.select().from(reportsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(reportsTable.riskScore), desc(reportsTable.createdAt)).limit(filters?.limit ?? 100);
}

export async function getReport(id: string) {
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id)).limit(1);
  return report;
}

export async function updateReportStatus(id: string, status: ReportStatus, actor: string) {
  const [updated] = await db.update(reportsTable).set({ status, updatedAt: new Date() }).where(eq(reportsTable.id, id)).returning();
  if (updated) {
    await db.insert(auditLogsTable).values({ id: randomUUID(), action: `status_changed_to_${status}`, actor, reportId: id });
  }
  return updated;
}

export async function getDashboardStats() {
  const reports = await db.select().from(reportsTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    active_reports: reports.filter((r) => !['resolved', 'rejected'].includes(r.status)).length,
    critical_reports: reports.filter((r) => r.riskScore >= 75).length,
    verified_today: reports.filter((r) => r.verificationStatus === 'officer_verified' && r.updatedAt >= today).length,
    resolved_today: reports.filter((r) => r.status === 'resolved' && r.updatedAt >= today).length,
    total_reports: reports.length,
    rainfall_status: 'unavailable',
    is_demo: reports.some((r) => r.isDemo),
  };
}

export async function getAuditLogs() {
  return db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(50);
}

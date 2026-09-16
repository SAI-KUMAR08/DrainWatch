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

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  // 35 real-world inspired Hyderabad drain / hazard reports
  const seed: Array<{
    id: string; hazardType: string; severity: Severity;
    latitude: number; longitude: number; locationName: string;
    description: string; status: string; verificationStatus: string;
    source: string; createdAt: Date; updatedAt: Date;
  }> = [
    // ── Critical / active ──────────────────────────────────────────────────
    {
      id: 'demo-hyd-001', hazardType: 'waterlogging', severity: 'critical',
      latitude: 17.4239, longitude: 78.4738, locationName: 'Tank Bund Road, Hyderabad',
      description: 'Water level 45 cm above normal on the carriageway near the promenade gates. Three vehicles stalled. GHMC pump installed but not yet operational. Traffic diverted via Necklace Road.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(3), updatedAt: hoursAgo(1),
    },
    {
      id: 'demo-hyd-002', hazardType: 'open_manhole', severity: 'critical',
      latitude: 17.4484, longitude: 78.3915, locationName: 'HITEC City Main Road, near Cyber Towers',
      description: 'Two consecutive manhole covers dislodged by a heavy truck late last night. Covers lying on the road surface creating a 60 cm open pit. Night-time collision risk extremely high. Temporary barrier requested.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(8), updatedAt: hoursAgo(2),
    },
    {
      id: 'demo-hyd-003', hazardType: 'blocked_drain', severity: 'critical',
      latitude: 17.4597, longitude: 78.3723, locationName: 'Gachibowli Stadium Road, near DLF building',
      description: 'Primary storm drain serving Gachibowli colony and Financial District sectors 1–3 is completely sealed with compacted silt and polythene. IMD forecasts 30 mm rainfall tonight — controlled flooding likely within 2 hours of rain onset.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(6), updatedAt: hoursAgo(3),
    },
    {
      id: 'demo-hyd-004', hazardType: 'sewage_overflow', severity: 'critical',
      latitude: 17.3753, longitude: 78.4744, locationName: 'Tolichowki Junction, near Santosh Nagar',
      description: 'Pressurised sewage main burst beneath the road surface. Approximately 3,000 litres per hour escaping. Slick road surface, strong H₂S odour. Two shops closed by residents. Pipe diameter 400 mm — replacement needed.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'news',
      createdAt: hoursAgo(5), updatedAt: hoursAgo(1),
    },
    {
      id: 'demo-hyd-005', hazardType: 'waterlogging', severity: 'critical',
      latitude: 17.3493, longitude: 78.5527, locationName: 'Dilsukhnagar Bus Terminal, Platform 4',
      description: 'Bus bay and pedestrian island 50 cm underwater. APSRTC re-routed 11 services. Approximately 200 passengers stranded under shelter. GHMC team on site but pump capacity insufficient — second pump requested.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'news',
      createdAt: hoursAgo(4), updatedAt: hoursAgo(0.5),
    },
    // ── High severity ──────────────────────────────────────────────────────
    {
      id: 'demo-hyd-006', hazardType: 'blocked_drain', severity: 'high',
      latitude: 17.4126, longitude: 78.4483, locationName: 'Banjara Hills Road No. 12, near GVK One',
      description: 'Drain grate fully choked with silt, leaves, and plastic carry bags after 22 mm overnight rain. Water backing up into the adjacent lane. Businesses report water entering ground floors.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(12), updatedAt: hoursAgo(5),
    },
    {
      id: 'demo-hyd-007', hazardType: 'open_manhole', severity: 'high',
      latitude: 17.4948, longitude: 78.3996, locationName: 'Kukatpally Housing Board Colony, Sector 5 Road',
      description: 'Manhole lid missing near KPHB bus stop bus bay. 70 cm drop — serious injury risk for pedestrians who step off the pavement. Roped off by residents using stones but rope has been removed by unknown persons.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(18), updatedAt: hoursAgo(6),
    },
    {
      id: 'demo-hyd-008', hazardType: 'waterlogging', severity: 'high',
      latitude: 17.4401, longitude: 78.3489, locationName: 'Miyapur Metro Station underpass',
      description: 'Underpass below ORR flooded knee-deep (approx 55 cm at centre). 12 two-wheelers and 3 auto-rickshaws stranded. Residents say this spot floods every monsoon and pumps are never pre-positioned.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(10), updatedAt: hoursAgo(4),
    },
    {
      id: 'demo-hyd-009', hazardType: 'sewage_overflow', severity: 'high',
      latitude: 17.3850, longitude: 78.4867, locationName: 'Mehdipatnam Circle, Old Mumbai Highway',
      description: 'Sewage overflow from overloaded trunk main affecting a 30-metre stretch of pedestrian pavement. Strong odour, health risk for market vendors. Reported to HMWSSB on three prior occasions — no action taken.',
      status: 'reported', verificationStatus: 'pending_review', source: 'news',
      createdAt: hoursAgo(36), updatedAt: hoursAgo(36),
    },
    {
      id: 'demo-hyd-010', hazardType: 'waterlogging', severity: 'high',
      latitude: 17.4820, longitude: 78.3120, locationName: 'Patancheru Industrial Area, Gate Road 3',
      description: 'Access road to APCPDCL substation flooded to 40 cm. Power utility vehicles unable to access the transformer yard. Risk to power supply for 4,000 households if maintenance needed tonight.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(7), updatedAt: hoursAgo(2),
    },
    {
      id: 'demo-hyd-011', hazardType: 'blocked_drain', severity: 'high',
      latitude: 17.4144, longitude: 78.4804, locationName: 'Himayat Nagar Crossroads, near Shilparamam lane',
      description: 'Construction contractor dumped excavation soil directly over three drain inlets overnight. Entire section of storm drain now blocked for approximately 80 metres. Contractor site visible — flagged to enforcement.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(24), updatedAt: hoursAgo(24),
    },
    {
      id: 'demo-hyd-012', hazardType: 'waterlogging', severity: 'high',
      latitude: 17.3680, longitude: 78.4980, locationName: 'Vanasthalipuram Main Road, near RTO office',
      description: 'Low-lying road section floods to 35 cm with any rain above 15 mm. Residents say GHMC drainage survey conducted in 2024 but no work executed. School bus unable to complete route today.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(14), updatedAt: hoursAgo(8),
    },
    {
      id: 'demo-hyd-013', hazardType: 'damaged_road', severity: 'high',
      latitude: 17.4560, longitude: 78.4620, locationName: 'Begumpet Airport Road, near Prakash Nagar signal',
      description: 'Large pothole (approx 1.2 m × 0.8 m × 25 cm deep) opened after a water pipe leak eroded the sub-base. Road markings now invisible. Two motorbike falls reported in 48 hours. Temporary tarpaulin placed by residents.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(48), updatedAt: hoursAgo(20),
    },
    // ── Medium severity ────────────────────────────────────────────────────
    {
      id: 'demo-hyd-014', hazardType: 'blocked_drain', severity: 'medium',
      latitude: 17.3616, longitude: 78.4747, locationName: 'Attapur Bridge footpath, Rajendra Nagar',
      description: 'Drain running alongside the bridge 75% silted. Reduced capacity before the next heavy rain event. Last de-silted 14 months ago. Residents\' welfare association has submitted a written request to GHMC.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(72), updatedAt: hoursAgo(24),
    },
    {
      id: 'demo-hyd-015', hazardType: 'sewage_overflow', severity: 'medium',
      latitude: 17.4271, longitude: 78.5015, locationName: 'Uppal Bus Depot approach road',
      description: 'Minor overflow at GHMC junction chamber near the bus depot gate. Approximately 200 litres per hour seeping — self-limiting if rainfall does not increase. Monitoring checkpoint set up by local ward officer.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(20), updatedAt: hoursAgo(20),
    },
    {
      id: 'demo-hyd-016', hazardType: 'open_manhole', severity: 'medium',
      latitude: 17.4339, longitude: 78.5004, locationName: 'Nagole Flyover service lane, eastbound',
      description: 'Manhole cover partially dislodged by a cement truck using the service lane. Cover rocks under traffic and creates a loud metallic clank. No open pit but cover could slip with heavy axle load.',
      status: 'assigned', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(30), updatedAt: hoursAgo(12),
    },
    {
      id: 'demo-hyd-017', hazardType: 'waterlogging', severity: 'medium',
      latitude: 17.4065, longitude: 78.5068, locationName: 'LB Nagar Circle, near Padmavathi theatre',
      description: 'Shallow pooling (10–15 cm) on the footpath and one lane. Expected to drain naturally within 3–4 hours without rain. Footpath users currently walking on the road carriageway.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(48), updatedAt: hoursAgo(40),
    },
    {
      id: 'demo-hyd-018', hazardType: 'blocked_drain', severity: 'medium',
      latitude: 17.3990, longitude: 78.4750, locationName: 'Masab Tank Road, near Jupiter Hospital',
      description: 'Plastic bags and food waste blocking drain inlet opposite the hospital entrance. Pedestrian footpath becomes impassable after moderate rain. Hospital administration has complained to the local councillor.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(15), updatedAt: hoursAgo(5),
    },
    {
      id: 'demo-hyd-019', hazardType: 'damaged_road', severity: 'medium',
      latitude: 17.4450, longitude: 78.3700, locationName: 'Kondapur Main Road, near Botanical Garden signal',
      description: 'Series of potholes opened along a 200 m stretch due to repeated waterlogging. Road surface peeling. Several office commuters report tyre damage. Road was last resurfaced in 2022.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(60), updatedAt: hoursAgo(60),
    },
    {
      id: 'demo-hyd-020', hazardType: 'sewage_overflow', severity: 'medium',
      latitude: 17.4700, longitude: 78.4200, locationName: 'Ameerpet Metro Junction underpass',
      description: 'Overflow from an overloaded chamber below the metro stanchion. Smell entering the metro station ventilation. HMWSSB has been informed but no crew dispatched in 48 hours.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'news',
      createdAt: hoursAgo(50), updatedAt: hoursAgo(22),
    },
    {
      id: 'demo-hyd-021', hazardType: 'waterlogging', severity: 'medium',
      latitude: 17.5050, longitude: 78.3800, locationName: 'Bachupally Road, near BHEL Colony gate',
      description: 'Puddle of depth 20–25 cm forming near the BHEL colony entrance on account of a broken kerb stone. Children and the elderly at particular risk. Reported repeatedly since July.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(40), updatedAt: hoursAgo(15),
    },
    {
      id: 'demo-hyd-022', hazardType: 'blocked_drain', severity: 'medium',
      latitude: 17.3780, longitude: 78.5500, locationName: 'Hayathnagar Cross Roads',
      description: 'Drain outlet on the highway shoulder blocked by illegal dumping of building rubble. Roadside flooding now affecting the TSRTC bus shelter. Flagged to Hayathnagar municipality.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(28), updatedAt: hoursAgo(28),
    },
    // ── Low severity / resolved ────────────────────────────────────────────
    {
      id: 'demo-hyd-023', hazardType: 'waterlogging', severity: 'low',
      latitude: 17.4800, longitude: 78.4900, locationName: 'Malkajgiri Railway Station Road',
      description: 'Light pooling on footpath near Station Road junction. Drains slowly over 2 hours after rain stops. No immediate danger but footpath needs re-grading for permanent fix.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(96), updatedAt: hoursAgo(72),
    },
    {
      id: 'demo-hyd-024', hazardType: 'blocked_drain', severity: 'low',
      latitude: 17.4320, longitude: 78.4560, locationName: 'Somajiguda Roundabout, near Raj Bhavan Road',
      description: 'Single drain inlet partially blocked by dried leaves. Likely to clear with next moderate rain or street sweeping. Street sweeper supervisor notified.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(120), updatedAt: hoursAgo(84),
    },
    {
      id: 'demo-hyd-025', hazardType: 'sewage_overflow', severity: 'low',
      latitude: 17.3870, longitude: 78.5200, locationName: 'Kothapet Main Road, near SBI branch',
      description: 'Trace sewage seeping from a hairline crack in the road surface. Less than 5 litres per hour — no immediate public health risk. Marked for inclusion in the next routine pipe inspection cycle.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(144), updatedAt: hoursAgo(100),
    },
    {
      id: 'demo-hyd-026', hazardType: 'open_manhole', severity: 'low',
      latitude: 17.4600, longitude: 78.4100, locationName: 'Panjagutta Circle, near Krishna Oberoi',
      description: 'Manhole lid slightly raised but still in position. No gap above 2 cm. Marked with paint by a citizen. Low urgency — included in scheduled maintenance round.',
      status: 'resolved', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(168), updatedAt: hoursAgo(120),
    },
    // ── Recent reports (last 2 hours) ─────────────────────────────────────
    {
      id: 'demo-hyd-027', hazardType: 'waterlogging', severity: 'high',
      latitude: 17.4380, longitude: 78.4980, locationName: 'Nacharam Industrial Road, ECIL flyover approach',
      description: 'New report: 40 cm water at the ECIL flyover approach road. Heavy truck traffic has churned up the surface. Concrete pipe visible — may have cracked under traffic. Flagged as urgent.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(1), updatedAt: hoursAgo(1),
    },
    {
      id: 'demo-hyd-028', hazardType: 'open_manhole', severity: 'critical',
      latitude: 17.4250, longitude: 78.4300, locationName: 'Khairatabad Flyover, left slip road',
      description: 'Manhole cover completely absent on the flyover slip road. Drop estimated 90 cm. Night-time fatal accident risk. Reported by motorbike rider who narrowly avoided it. IMMEDIATE ATTENTION REQUIRED.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(0.5), updatedAt: hoursAgo(0.5),
    },
    {
      id: 'demo-hyd-029', hazardType: 'sewage_overflow', severity: 'high',
      latitude: 17.4900, longitude: 78.4600, locationName: 'Secunderabad Station Road, near Rashtrapati Road junction',
      description: 'Sewage bursting through road surface at a road repair joint near the station entrance. Spreading across all lanes. Heavy commuter traffic. Reported 45 minutes ago — crew not yet arrived.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(0.75), updatedAt: hoursAgo(0.75),
    },
    {
      id: 'demo-hyd-030', hazardType: 'blocked_drain', severity: 'medium',
      latitude: 17.4180, longitude: 78.3600, locationName: 'Madhapur Main Road, Phase 2 junction',
      description: 'Street vendors\' waste blocking the drain in front of the evening market. Puddle forming on the pedestrian crossing. Market closes at 22:00 — drain clearing easier after that.',
      status: 'reported', verificationStatus: 'pending_review', source: 'citizen',
      createdAt: hoursAgo(1.5), updatedAt: hoursAgo(1.5),
    },
    // ── News-sourced / verified source ────────────────────────────────────
    {
      id: 'demo-hyd-031', hazardType: 'waterlogging', severity: 'critical',
      latitude: 17.3620, longitude: 78.4760, locationName: 'Attapur Underpass, NH-65',
      description: 'National highway underpass flooded to 80 cm per Telangana Roads & Buildings Dept advisory. NH-65 alternate route operational via Rajendra Nagar. Pump deployment commenced 90 minutes ago.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(2), updatedAt: hoursAgo(0.25),
    },
    {
      id: 'demo-hyd-032', hazardType: 'waterlogging', severity: 'high',
      latitude: 17.4480, longitude: 78.3810, locationName: 'Nanakramguda Financial District, Road 2',
      description: 'Per Telangana Today report: Financial District access road submerged after 35 mm rainfall in 2 hours. IT companies issued advisory to allow WFH. Water receding slowly — drain outlet believed to be blocked upstream.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'news',
      createdAt: hoursAgo(9), updatedAt: hoursAgo(4),
    },
    {
      id: 'demo-hyd-033', hazardType: 'damaged_road', severity: 'critical',
      latitude: 17.3950, longitude: 78.4500, locationName: 'Shamshabad Airport Road, near Rajiv Gandhi statue',
      description: 'Per HIAL advisory: Sinkhole 2 m × 1.5 m opened on the airport access road at the 4 km marker following pipe leak. Airport traffic diverted via NH-44. NHAI and GHMC teams on-site.',
      status: 'in_progress', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(6), updatedAt: hoursAgo(1),
    },
    {
      id: 'demo-hyd-034', hazardType: 'sewage_overflow', severity: 'medium',
      latitude: 17.5100, longitude: 78.3600, locationName: 'Kompally Municipality Road 7',
      description: 'Sewage overflow from ageing GHMC main serving Kompally Phase 3. Pipe laid in 2001 — beyond design life. Issue raised at last ward meeting. Interim patch applied; permanent replacement budgeted for Q1 2027.',
      status: 'assigned', verificationStatus: 'officer_verified', source: 'citizen',
      createdAt: hoursAgo(55), updatedAt: hoursAgo(30),
    },
    {
      id: 'demo-hyd-035', hazardType: 'blocked_drain', severity: 'high',
      latitude: 17.4030, longitude: 78.4640, locationName: 'Mehdipatnam Flyover, south approach',
      description: 'Storm drain on the flyover approach road sealed by accumulated road-marking paint and rubberised debris from resurfacing work. Three drain inlets affected over 150 m. Heavy rain could back-water onto the flyover deck.',
      status: 'verified', verificationStatus: 'officer_verified', source: 'verified',
      createdAt: hoursAgo(16), updatedAt: hoursAgo(7),
    },
  ];

  await db.insert(reportsTable).values(
    seed.map((item) => {
      const recentIdx = seed.filter(
        (s) => s.createdAt > hoursAgo(24) && s.hazardType === item.hazardType,
      ).length;
      const risk = calculateRisk(item.severity, recentIdx + 1, seed.length, item.createdAt);
      return {
        ...item,
        riskScore: risk.score,
        riskComponents: risk.components,
        isDemo: true,
        updatedAt: item.updatedAt,
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

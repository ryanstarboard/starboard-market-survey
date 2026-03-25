// ── Property ─────────────────────────────────────────────────────────────────

export interface CompConfig {
  compId: string;
  name: string;
  address: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  lastSurveyDate: string | null;
  compsConfig: CompConfig[];
}

// ── Rent Roll ────────────────────────────────────────────────────────────────

export interface RentRollRow {
  unit: string;
  unitType: string;
  bdBa: string;
  status: string;
  sqft: number | null;
  marketRent: number | null;
  rent: number | null;
  leaseFrom: string | null;
  leaseTo: string | null;
  moveIn: string | null;
}

export interface RentRollSummary {
  byType: {
    type: string;
    count: number;
    avgRent: number;
    low: number;
    high: number;
    avgMoveInDate: string;
    avgTenureMonths: number;
    avgSqft: number | null;
    leasedPct: number;
  }[];
  recentCutoff: number;
  recent: RentRollRow[];
}

// ── Comps ────────────────────────────────────────────────────────────────────

export interface OtherFee {
  name: string;
  amount: number | null;
  type: 'move-in' | 'monthly';
}

export interface FloorPlan {
  type: string;
  sqft: number | null;
  unitCount: number | null;
  leasedPct: number | null;
  rent: number | null;
  adRent: number | null;
  psf: number | null;
}

export interface Comp {
  id: string;
  name: string;
  address: string;
  cityState: string;
  distanceFromSubject: string;
  phone: string;

  totalUnits: number;
  yearBuilt: string | null;
  leasedPct: number | null;
  occupancyPct: number | null;
  applicationFee: number | null;
  adminFee: number | null;
  securityDeposit: number | null;
  mtmFee: number | null;
  corporateUnits: boolean | null;
  furnished: boolean | null;
  residentReferrals: boolean | null;
  referralAmount: number | null;
  leaseTerms: string;
  utilitiesIncluded: string;
  otherFees: OtherFee[];
  communityAmenities: string[];
  unitAmenities: string[];

  petLimit: string;
  petDeposit: number | null;
  petRent: number | null;
  petFee: number | null;
  petRules: string;

  renovated: boolean | null;
  renoDate: string | null;
  concessions: string;
  otherNotes: string;

  floorPlans: FloorPlan[];

  called: boolean;
  toured: boolean;

  excluded: boolean;
  excludeReasons: string[];

  source: string;
}

// ── Subject Property ─────────────────────────────────────────────────────────

export interface SubjectProperty {
  yearBuilt: string | null;
  renovated: boolean | null;
  renoDate: string | null;
  furnished: boolean | null;
  leasedPct: number | null;
  occupancyPct: number | null;
  applicationFee: number | null;
  adminFee: number | null;
  securityDeposit: number | null;
  mtmFee: number | null;
  leaseTerms: string;
  utilitiesIncluded: string;
  otherFees: OtherFee[];
  concessions: string;
  residentReferrals: boolean | null;
  referralAmount: number | null;
  communityAmenities: string[];
  unitAmenities: string[];
  petLimit: string;
  petDeposit: number | null;
  petRent: number | null;
  petFee: number | null;
  petRules: string;
  otherNotes: string;
  floorPlans: FloorPlan[];
}

// ── Survey State ─────────────────────────────────────────────────────────────

export interface SurveyState {
  propertyId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  rentRoll: RentRollSummary | null;
  rrTab: "all" | "avgMI" | "recent" | "recentAvgMI";
  comps: Comp[];
  subjectProperty: SubjectProperty | null;
  preparedBy: string;
  surveyDate: string;
  comments: string;
}

// ── Export Layout ────────────────────────────────────────────────────────────
// Column offsets for the market survey template.
// Subject property starts in column B (index 1).
// Each comp occupies 7 columns, starting at column I (index 8).

export const TEMPLATE_COLUMNS = {
  subject: 1, // col B
  comps: [8, 15, 22, 29, 36, 43] as const, // cols I, P, W, AD, AK, AR
} as const;

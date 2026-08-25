export type Channel = "UPI" | "Mobile Banking" | "Credit Card" | "Internet Banking";
export type DeviceTrust = "trusted" | "new";
export type LocationMatch = "match" | "mismatch";
export type TimeBand = "day" | "night";
export type RiskLevel = "Low" | "Medium" | "High";
export type Prediction = "Legitimate" | "Suspicious" | "Fraudulent";
export type AlertLevel = "Monitor" | "Review" | "Critical";
export type UserRole = "Administrator" | "Fraud Analyst" | "Bank Officer";

export interface TransactionRecord {
  id: string;
  customer: string;
  amount: number;
  channel: Channel;
  deviceTrust: DeviceTrust;
  locationMatch: LocationMatch;
  velocityLastHour: number;
  priorFlags: number;
  timeBand: TimeBand;
}

export interface ScoredTransaction extends TransactionRecord {
  riskScore: number;
  riskLevel: RiskLevel;
  prediction: Prediction;
  alertLevel: AlertLevel;
  reasons: string[];
}

export interface DashboardMetrics {
  totalTransactions: number;
  suspiciousTransactions: number;
  highRiskAlerts: number;
  fraudRate: number;
  accuracy: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface ChannelSummaryItem {
  channel: Channel;
  suspicious: number;
}

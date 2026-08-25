import type {
  AlertLevel,
  Channel,
  ChannelSummaryItem,
  DashboardMetrics,
  Prediction,
  RiskDistribution,
  RiskLevel,
  ScoredTransaction,
  TransactionRecord
} from "@/types/fraud";

const channelRiskWeights: Record<Channel, number> = {
  UPI: 12,
  "Mobile Banking": 15,
  "Credit Card": 10,
  "Internet Banking": 14
};

export function computeRiskScore(transaction: TransactionRecord): ScoredTransaction {
  let score = 8;
  const reasons: string[] = [];

  if (transaction.amount >= 80000) {
    score += 30;
    reasons.push("large transaction amount");
  } else if (transaction.amount >= 40000) {
    score += 18;
    reasons.push("unusually high amount");
  }

  if (transaction.velocityLastHour >= 5) {
    score += 18;
    reasons.push("high transaction velocity");
  } else if (transaction.velocityLastHour >= 3) {
    score += 10;
    reasons.push("repeated activity in short time");
  }

  score += channelRiskWeights[transaction.channel];

  if (transaction.deviceTrust === "new") {
    score += 16;
    reasons.push("new or unrecognized device");
  }

  if (transaction.locationMatch === "mismatch") {
    score += 14;
    reasons.push("location mismatch detected");
  }

  if (transaction.priorFlags >= 2) {
    score += 14;
    reasons.push("customer has prior fraud flags");
  } else if (transaction.priorFlags === 1) {
    score += 7;
    reasons.push("customer has a previous review flag");
  }

  if (transaction.timeBand === "night") {
    score += 8;
    reasons.push("transaction occurred during risky hours");
  }

  score = Math.min(99, Math.round(score));

  let riskLevel: RiskLevel = "Low";
  let prediction: Prediction = "Legitimate";
  let alertLevel: AlertLevel = "Monitor";

  if (score >= 70) {
    riskLevel = "High";
    prediction = "Fraudulent";
    alertLevel = "Critical";
  } else if (score >= 45) {
    riskLevel = "Medium";
    prediction = "Suspicious";
    alertLevel = "Review";
  }

  return {
    ...transaction,
    riskScore: score,
    riskLevel,
    prediction,
    alertLevel,
    reasons
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function getDashboardMetrics(transactions: ScoredTransaction[]): DashboardMetrics {
  const suspiciousTransactions = transactions.filter((transaction) => transaction.riskScore >= 45).length;
  const highRiskAlerts = transactions.filter((transaction) => transaction.riskScore >= 70).length;

  return {
    totalTransactions: transactions.length,
    suspiciousTransactions,
    highRiskAlerts,
    fraudRate: transactions.length ? Math.round((suspiciousTransactions / transactions.length) * 100) : 0,
    accuracy: 96.4
  };
}

export function getRiskDistribution(transactions: ScoredTransaction[]): RiskDistribution {
  return {
    low: transactions.filter((transaction) => transaction.riskLevel === "Low").length,
    medium: transactions.filter((transaction) => transaction.riskLevel === "Medium").length,
    high: transactions.filter((transaction) => transaction.riskLevel === "High").length
  };
}

export function getPriorityAlerts(transactions: ScoredTransaction[]): ScoredTransaction[] {
  return [...transactions]
    .filter((transaction) => transaction.riskScore >= 70)
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, 5);
}

export function getChannelSummary(transactions: ScoredTransaction[]): ChannelSummaryItem[] {
  const channels: Channel[] = ["UPI", "Mobile Banking", "Credit Card", "Internet Banking"];

  return channels.map((channel) => ({
    channel,
    suspicious: transactions.filter(
      (transaction) => transaction.channel === channel && transaction.riskScore >= 45
    ).length
  }));
}

export function getPillClass(level: RiskLevel | AlertLevel): string {
  if (level === "High" || level === "Critical") {
    return "pill pill-high";
  }

  if (level === "Medium" || level === "Review") {
    return "pill pill-medium";
  }

  return "pill pill-low";
}

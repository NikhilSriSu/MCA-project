"use client";

import { useEffect, useState } from "react";
import {
  computeRiskScore,
  formatCurrency,
  getChannelSummary,
  getDashboardMetrics,
  getPillClass,
  getPriorityAlerts,
  getRiskDistribution
} from "@/lib/fraud";
import { roleKeyToRole, roleRoutes, type RoleKey } from "@/lib/role-routes";
import type {
  DeviceTrust,
  LocationMatch,
  ScoredTransaction,
  TransactionRecord
} from "@/types/fraud";

interface FraudDashboardProps {
  currentPath: string;
  initialTransactions: TransactionRecord[];
  roleKey: RoleKey;
}

interface PredictionFormState {
  id: string;
  customer: string;
  amount: string;
  channel: TransactionRecord["channel"];
  deviceTrust: DeviceTrust;
  locationMatch: LocationMatch;
  velocityLastHour: string;
  priorFlags: string;
}

interface NewTransactionFormState {
  id: string;
  customer: string;
  amount: string;
  channel: TransactionRecord["channel"];
  deviceTrust: DeviceTrust;
  locationMatch: LocationMatch;
  velocityLastHour: string;
  priorFlags: string;
  timeBand: TransactionRecord["timeBand"];
}

type OfficerDecision =
  | "Pending Review"
  | "Temporarily Held"
  | "Escalated to Analyst"
  | "Approved";

const defaultFormState: PredictionFormState = {
  id: "TXN-2026-9001",
  customer: "Nikhil Sharma",
  amount: "98000",
  channel: "UPI",
  deviceTrust: "new",
  locationMatch: "mismatch",
  velocityLastHour: "5",
  priorFlags: "2"
};

const systemAccessMatrix = [
  {
    role: "Administrator",
    access: "Full dashboard, audit controls, user visibility",
    scope: "Oversight and reporting"
  },
  {
    role: "Fraud Analyst",
    access: "Monitoring, prediction, high-risk alerts",
    scope: "Fraud investigation"
  },
  {
    role: "Bank Officer",
    access: "Verification queue and customer action center",
    scope: "Operational handling"
  }
];

const customTransactionsStorageKey = "fraud-demo-custom-transactions";
const caseDecisionsStorageKey = "fraud-demo-case-decisions";

function getSuggestedTransactionId(transactions: TransactionRecord[]): string {
  const highestSequence = transactions.reduce((maxValue, transaction) => {
    const match = transaction.id.match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(maxValue, value);
  }, 1000);

  return `TXN-2026-${String(highestSequence + 1)}`;
}

function getDecisionClass(decision: OfficerDecision): string {
  if (decision === "Temporarily Held") {
    return "pill pill-medium";
  }

  if (decision === "Escalated to Analyst") {
    return "pill pill-high";
  }

  if (decision === "Approved") {
    return "pill pill-low";
  }

  return "pill pill-medium";
}

export default function FraudDashboard({
  currentPath,
  initialTransactions,
  roleKey
}: FraudDashboardProps) {
  const [customTransactions, setCustomTransactions] = useState<TransactionRecord[]>([]);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [predictionForm, setPredictionForm] = useState<PredictionFormState>(defaultFormState);
  const [predictionResult, setPredictionResult] = useState<ScoredTransaction | null>(null);
  const [lastAddedTransaction, setLastAddedTransaction] = useState<ScoredTransaction | null>(null);
  const [newTransactionMessage, setNewTransactionMessage] = useState("");
  const [newTransactionError, setNewTransactionError] = useState("");
  const [search, setSearch] = useState("");
  const [caseDecisions, setCaseDecisions] = useState<Record<string, OfficerDecision>>({});
  const [newTransactionForm, setNewTransactionForm] = useState<NewTransactionFormState>(() => ({
    id: getSuggestedTransactionId(initialTransactions),
    customer: "",
    amount: "",
    channel: "UPI",
    deviceTrust: "trusted",
    locationMatch: "match",
    velocityLastHour: "1",
    priorFlags: "0",
    timeBand: "day"
  }));

  const role = roleKeyToRole[roleKey];
  const navigationItems = roleRoutes[roleKey];
  const activeNavigation =
    navigationItems.find((item) => item.path === currentPath) ?? navigationItems[0];
  const allTransactions = [...initialTransactions, ...customTransactions];
  const scoredTransactions = allTransactions.map(computeRiskScore);
  const suspiciousTransactions = scoredTransactions.filter((transaction) => transaction.riskScore >= 45);
  const highRiskTransactions = scoredTransactions.filter((transaction) => transaction.riskScore >= 70);
  const customerRiskProfiles = suspiciousTransactions.slice(0, 4);
  const officerQueue = suspiciousTransactions.slice(0, 6);
  const filteredTransactions = scoredTransactions.filter((transaction) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [transaction.id, transaction.customer, transaction.channel].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  const metrics = getDashboardMetrics(scoredTransactions);
  const alerts = getPriorityAlerts(scoredTransactions);
  const riskDistribution = getRiskDistribution(scoredTransactions);
  const channelSummary = getChannelSummary(scoredTransactions);
  const totalDistribution =
    riskDistribution.low + riskDistribution.medium + riskDistribution.high || 1;
  const lowDegrees = Math.round((riskDistribution.low / totalDistribution) * 360);
  const mediumDegrees = Math.round((riskDistribution.medium / totalDistribution) * 360);
  const analystEscalations = Object.values(caseDecisions).filter(
    (decision) => decision === "Escalated to Analyst"
  ).length;
  const officerApproved = Object.values(caseDecisions).filter(
    (decision) => decision === "Approved"
  ).length;
  const officerHeld = Object.values(caseDecisions).filter(
    (decision) => decision === "Temporarily Held"
  ).length;
  const officerPending = Math.max(
    0,
    officerQueue.length - officerApproved - officerHeld - analystEscalations
  );

  useEffect(() => {
    let parsedTransactions: TransactionRecord[] = [];
    let parsedDecisions: Record<string, OfficerDecision> = {};

    const savedTransactions = window.localStorage.getItem(customTransactionsStorageKey);
    const savedDecisions = window.localStorage.getItem(caseDecisionsStorageKey);

    if (savedTransactions) {
      try {
        parsedTransactions = JSON.parse(savedTransactions) as TransactionRecord[];
      } catch {
        parsedTransactions = [];
      }
    }

    if (savedDecisions) {
      try {
        parsedDecisions = JSON.parse(savedDecisions) as Record<string, OfficerDecision>;
      } catch {
        parsedDecisions = {};
      }
    }

    const mergedTransactions = [...initialTransactions, ...parsedTransactions];
    const fallbackDecisions = Object.fromEntries(
      mergedTransactions
        .map(computeRiskScore)
        .filter((transaction) => transaction.riskScore >= 45)
        .map((transaction) => [transaction.id, "Pending Review" as OfficerDecision])
    );

    setCustomTransactions(parsedTransactions);
    setCaseDecisions({ ...fallbackDecisions, ...parsedDecisions });
    setNewTransactionForm((current) => ({
      ...current,
      id: getSuggestedTransactionId(mergedTransactions)
    }));
    setStorageHydrated(true);
  }, [initialTransactions]);

  useEffect(() => {
    if (storageHydrated) {
      window.localStorage.setItem(customTransactionsStorageKey, JSON.stringify(customTransactions));
    }
  }, [customTransactions, storageHydrated]);

  useEffect(() => {
    if (storageHydrated) {
      window.localStorage.setItem(caseDecisionsStorageKey, JSON.stringify(caseDecisions));
    }
  }, [caseDecisions, storageHydrated]);

  function updateFormField<Key extends keyof PredictionFormState>(
    key: Key,
    value: PredictionFormState[Key]
  ) {
    setPredictionForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateOfficerDecision(transactionId: string, decision: OfficerDecision) {
    setCaseDecisions((current) => ({
      ...current,
      [transactionId]: decision
    }));
  }

  function updateNewTransactionField<Key extends keyof NewTransactionFormState>(
    key: Key,
    value: NewTransactionFormState[Key]
  ) {
    setNewTransactionForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handlePredictionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPredictionResult(
      computeRiskScore({
        id: predictionForm.id,
        customer: predictionForm.customer,
        amount: Number(predictionForm.amount),
        channel: predictionForm.channel,
        deviceTrust: predictionForm.deviceTrust,
        locationMatch: predictionForm.locationMatch,
        velocityLastHour: Number(predictionForm.velocityLastHour),
        priorFlags: Number(predictionForm.priorFlags),
        timeBand: "night"
      })
    );
  }

  function handleAddTransactionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = newTransactionForm.id.trim();
    const customer = newTransactionForm.customer.trim();

    if (!id || !customer) {
      setNewTransactionError("Transaction ID and customer name are required.");
      setNewTransactionMessage("");
      return;
    }

    if (allTransactions.some((transaction) => transaction.id.toLowerCase() === id.toLowerCase())) {
      setNewTransactionError("This transaction ID already exists. Please use a unique ID.");
      setNewTransactionMessage("");
      return;
    }

    const newTransaction: TransactionRecord = {
      id,
      customer,
      amount: Number(newTransactionForm.amount),
      channel: newTransactionForm.channel,
      deviceTrust: newTransactionForm.deviceTrust,
      locationMatch: newTransactionForm.locationMatch,
      velocityLastHour: Number(newTransactionForm.velocityLastHour),
      priorFlags: Number(newTransactionForm.priorFlags),
      timeBand: newTransactionForm.timeBand
    };
    const scoredTransaction = computeRiskScore(newTransaction);
    const updatedTransactions = [...allTransactions, newTransaction];

    setCustomTransactions((current) => [...current, newTransaction]);
    setLastAddedTransaction(scoredTransaction);
    setNewTransactionError("");
    setNewTransactionMessage(
      `Transaction ${newTransaction.id} was added successfully and will remain after refresh on this browser.`
    );

    if (scoredTransaction.riskScore >= 45) {
      setCaseDecisions((current) => ({
        ...current,
        [newTransaction.id]: "Pending Review"
      }));
    }

    setNewTransactionForm({
      id: getSuggestedTransactionId(updatedTransactions),
      customer: "",
      amount: "",
      channel: "UPI",
      deviceTrust: "trusted",
      locationMatch: "match",
      velocityLastHour: "1",
      priorFlags: "0",
      timeBand: "day"
    });
  }

  function renderAdministratorView() {
    if (currentPath === "/admin/analytics") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>Fraud Analytics Command View</h3>
              <p>
                This view summarizes how risk is distributed across the digital transaction
                channels monitored by the institution.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>High Risk Cases</span>
                <strong>{metrics.highRiskAlerts}</strong>
              </div>
              <div className="mini-stat">
                <span>Suspicious Rate</span>
                <strong>{metrics.fraudRate}%</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel chart-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Risk Analytics</p>
                  <h3>Risk Level Distribution</h3>
                </div>
              </div>
              <div className="risk-visual">
                <div
                  className="donut"
                  style={{
                    background: `conic-gradient(
                      #2f8f63 0deg ${lowDegrees}deg,
                      #df9c1f ${lowDegrees}deg ${lowDegrees + mediumDegrees}deg,
                      #d94141 ${lowDegrees + mediumDegrees}deg 360deg
                    )`
                  }}
                />
                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "#2f8f63" }} />
                    Low Risk: {riskDistribution.low}
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "#df9c1f" }} />
                    Medium Risk: {riskDistribution.medium}
                  </div>
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "#d94141" }} />
                    High Risk: {riskDistribution.high}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Channel Analytics</p>
                  <h3>Suspicion Overview by Channel</h3>
                </div>
              </div>
              <div className="bars">
                {channelSummary.map((item) => (
                  <div className="bar-column" key={item.channel}>
                    <div className="bar-value">{item.suspicious} flagged</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: `${Math.max(18, item.suspicious * 32)}px` }}
                      />
                    </div>
                    <div className="bar-label">{item.channel}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Trend Summary</p>
                  <h3>Critical Fraud Events</h3>
                </div>
              </div>
              <div className="alert-list">
                {alerts.map((transaction) => (
                  <article className="alert-item" key={transaction.id}>
                    <h4>{transaction.id} requires executive visibility</h4>
                    <p>
                      {transaction.customer} produced a {transaction.riskScore}% score through{" "}
                      {transaction.channel}, driven by {transaction.reasons.join(", ")}.
                    </p>
                    <div className="alert-meta">
                      <span>{formatCurrency(transaction.amount)}</span>
                      <span>{transaction.alertLevel}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (currentPath === "/admin/governance") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>Governance and Audit Control</h3>
              <p>
                The administrator supervises model governance, role access, and compliance
                readiness for fraud-handling workflows.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Roles Managed</span>
                <strong>3</strong>
              </div>
              <div className="mini-stat">
                <span>Audit Status</span>
                <strong>Ready</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Access Matrix</p>
                  <h3>Role Permission Summary</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table className="wide-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Access Permission</th>
                      <th>Primary Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemAccessMatrix.map((item) => (
                      <tr key={item.role}>
                        <td>{item.role}</td>
                        <td>{item.access}</td>
                        <td>{item.scope}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel prediction-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Model Governance</p>
                  <h3>Scoring Logic Snapshot</h3>
                </div>
              </div>
              <div className="info-list">
                <div className="info-row">
                  <strong>High amount</strong>
                  <span>Weighted more heavily above INR 80,000</span>
                </div>
                <div className="info-row">
                  <strong>Velocity</strong>
                  <span>Flags repeated transactions within one hour</span>
                </div>
                <div className="info-row">
                  <strong>Location mismatch</strong>
                  <span>Raises score when transaction geography breaks history</span>
                </div>
                <div className="info-row">
                  <strong>Prior flags</strong>
                  <span>Increases review priority for risky accounts</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="content-stack">
        <section className="hero-panel hero-panel-grid">
          <div className="hero-content">
            <h3>Administrative Control Center</h3>
            <p>
              Monitor total transaction volume, suspicious activity, and operational readiness
              across the fraud detection platform.
            </p>
          </div>
          <div className="hero-stats">
            <div className="mini-stat">
              <span>Detection Accuracy</span>
              <strong>{metrics.accuracy}%</strong>
            </div>
            <div className="mini-stat">
              <span>System Mode</span>
              <strong>Real-Time Demo</strong>
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <article className="metric-card">
            <span>Total Transactions</span>
            <strong>{metrics.totalTransactions}</strong>
          </article>
          <article className="metric-card">
            <span>Suspicious Transactions</span>
            <strong>{metrics.suspiciousTransactions}</strong>
          </article>
          <article className="metric-card">
            <span>High Risk Alerts</span>
            <strong>{metrics.highRiskAlerts}</strong>
          </article>
          <article className="metric-card">
            <span>Fraud Rate</span>
            <strong>{metrics.fraudRate}%</strong>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Operations Status</p>
                <h3>Live Monitoring Snapshot</h3>
              </div>
            </div>
            <div className="info-list">
              <div className="info-row">
                <strong>Transactions processed</strong>
                <span>{metrics.totalTransactions} local demo records</span>
              </div>
              <div className="info-row">
                <strong>Critical queue</strong>
                <span>{highRiskTransactions.length} urgent cases waiting for review</span>
              </div>
              <div className="info-row">
                <strong>Escalations from officers</strong>
                <span>{analystEscalations} cases currently forwarded</span>
              </div>
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Workflow Health</p>
                <h3>Role Workload Summary</h3>
              </div>
            </div>
            <div className="info-list">
              <div className="info-row">
                <strong>Analyst queue</strong>
                <span>{suspiciousTransactions.length} transactions under scrutiny</span>
              </div>
              <div className="info-row">
                <strong>Bank officer pending</strong>
                <span>{officerQueue.length} verification-ready cases</span>
              </div>
              <div className="info-row">
                <strong>Approvals recorded</strong>
                <span>{officerApproved} officer decisions marked approved</span>
              </div>
            </div>
          </section>

          <section className="panel monitoring-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Management Notes</p>
                <h3>Why This Matches the Synopsis</h3>
              </div>
            </div>
            <div className="note-grid">
              <article className="note-card">
                <h4>Login module</h4>
                <p>Three user roles now enter dedicated routed workspaces after sign-in.</p>
              </article>
              <article className="note-card">
                <h4>Fraud monitoring</h4>
                <p>Analyst and officer views handle live queues rather than one shared panel.</p>
              </article>
              <article className="note-card">
                <h4>Decision flow</h4>
                <p>Officer actions feed back into the administrative and analyst workflow summary.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderAnalystView() {
    if (currentPath === "/analyst/prediction") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>Fraud Prediction Engine</h3>
              <p>
                Analysts can score a new digital transaction using the same lightweight ML-style
                logic that powers the transaction monitoring view.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Model Accuracy</span>
                <strong>{metrics.accuracy}%</strong>
              </div>
              <div className="mini-stat">
                <span>Inputs Used</span>
                <strong>6 Risk Factors</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Prediction Inputs</p>
                  <h3>Evaluate New Transaction</h3>
                </div>
              </div>

              <form className="prediction-form" onSubmit={handlePredictionSubmit}>
                <label>
                  <span>Transaction ID</span>
                  <input
                    required
                    value={predictionForm.id}
                    onChange={(event) => updateFormField("id", event.target.value)}
                  />
                </label>
                <label>
                  <span>Customer Name</span>
                  <input
                    required
                    value={predictionForm.customer}
                    onChange={(event) => updateFormField("customer", event.target.value)}
                  />
                </label>
                <label>
                  <span>Amount (INR)</span>
                  <input
                    min="0"
                    required
                    type="number"
                    value={predictionForm.amount}
                    onChange={(event) => updateFormField("amount", event.target.value)}
                  />
                </label>
                <label>
                  <span>Channel</span>
                  <select
                    value={predictionForm.channel}
                    onChange={(event) =>
                      updateFormField("channel", event.target.value as TransactionRecord["channel"])
                    }
                  >
                    <option value="UPI">UPI</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Internet Banking">Internet Banking</option>
                  </select>
                </label>
                <label>
                  <span>Device Trust</span>
                  <select
                    value={predictionForm.deviceTrust}
                    onChange={(event) =>
                      updateFormField("deviceTrust", event.target.value as DeviceTrust)
                    }
                  >
                    <option value="trusted">Trusted Device</option>
                    <option value="new">New Device</option>
                  </select>
                </label>
                <label>
                  <span>Location Match</span>
                  <select
                    value={predictionForm.locationMatch}
                    onChange={(event) =>
                      updateFormField("locationMatch", event.target.value as LocationMatch)
                    }
                  >
                    <option value="match">Matches History</option>
                    <option value="mismatch">Location Mismatch</option>
                  </select>
                </label>
                <label>
                  <span>Transactions in 1 Hour</span>
                  <input
                    max="12"
                    min="1"
                    required
                    type="number"
                    value={predictionForm.velocityLastHour}
                    onChange={(event) => updateFormField("velocityLastHour", event.target.value)}
                  />
                </label>
                <label>
                  <span>Past Fraud Flags</span>
                  <input
                    max="10"
                    min="0"
                    required
                    type="number"
                    value={predictionForm.priorFlags}
                    onChange={(event) => updateFormField("priorFlags", event.target.value)}
                  />
                </label>

                <button className="btn btn-primary" type="submit">
                  Run Fraud Prediction
                </button>
              </form>
            </section>

            <section className="panel prediction-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Prediction Output</p>
                  <h3>Result Summary</h3>
                </div>
              </div>
              <div className="prediction-result embedded-result">
                <div className="result-grid">
                  <div>
                    <span>Risk Score</span>
                    <strong>{predictionResult ? `${predictionResult.riskScore}%` : "--"}</strong>
                  </div>
                  <div>
                    <span>Prediction</span>
                    <strong>{predictionResult?.prediction ?? "--"}</strong>
                  </div>
                  <div>
                    <span>Alert Level</span>
                    <strong>{predictionResult?.alertLevel ?? "--"}</strong>
                  </div>
                </div>
                <p>
                  {predictionResult
                    ? `The transaction was marked ${predictionResult.prediction.toLowerCase()} because of ${predictionResult.reasons.join(", ")}.`
                    : "Submit the form to generate the fraud probability and reason summary."}
                </p>
              </div>
              <div className="info-list">
                <div className="info-row">
                  <strong>Amount risk</strong>
                  <span>Higher score when transaction amount is abnormally large</span>
                </div>
                <div className="info-row">
                  <strong>Velocity risk</strong>
                  <span>Repeated transactions within an hour raise suspicion</span>
                </div>
                <div className="info-row">
                  <strong>Context risk</strong>
                  <span>New devices and location mismatch increase fraud probability</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (currentPath === "/analyst/alerts") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>High-Risk Alert Queue</h3>
              <p>
                Analysts focus on the most severe transactions, especially cases escalated by
                officers or automatically classified as critical.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Critical Alerts</span>
                <strong>{highRiskTransactions.length}</strong>
              </div>
              <div className="mini-stat">
                <span>Officer Escalations</span>
                <strong>{analystEscalations}</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Critical Cases</p>
                  <h3>Alert Investigation Queue</h3>
                </div>
              </div>
              <div className="alert-list">
                {alerts.map((transaction) => (
                  <article className="alert-item" key={transaction.id}>
                    <h4>{transaction.id} flagged for analyst action</h4>
                    <p>
                      {transaction.customer} triggered a {transaction.riskScore}% fraud
                      probability because of {transaction.reasons.join(", ")}.
                    </p>
                    <div className="alert-meta">
                      <span>{transaction.channel}</span>
                      <span>{formatCurrency(transaction.amount)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel prediction-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Escalation Feed</p>
                  <h3>Cases Received from Officers</h3>
                </div>
              </div>
              <div className="info-list">
                {officerQueue.map((transaction) => (
                  <div className="info-row" key={transaction.id}>
                    <strong>{transaction.id}</strong>
                    <span>{caseDecisions[transaction.id] ?? "Pending Review"}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="content-stack">
        <section className="hero-panel hero-panel-grid">
          <div className="hero-content">
            <h3>Analyst Monitoring Workspace</h3>
            <p>
              This role is focused on transaction-level investigation, searching flagged records,
              and interpreting fraud probability scores.
            </p>
          </div>
          <div className="hero-stats">
            <div className="mini-stat">
              <span>Suspicious Queue</span>
              <strong>{suspiciousTransactions.length}</strong>
            </div>
            <div className="mini-stat">
              <span>High Risk Cases</span>
              <strong>{highRiskTransactions.length}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel monitoring-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Transaction Monitoring</p>
                <h3>Recent Transactions</h3>
              </div>
              <div className="filter-wrap">
                <input
                  placeholder="Search by transaction ID, customer, or channel"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table className="wide-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Channel</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length ? (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.id}</td>
                        <td>{transaction.customer}</td>
                        <td>{formatCurrency(transaction.amount)}</td>
                        <td>{transaction.channel}</td>
                        <td>
                          <strong>{transaction.riskScore}</strong>
                        </td>
                        <td>
                          <span className={getPillClass(transaction.riskLevel)}>
                            {transaction.prediction}
                          </span>
                        </td>
                        <td>
                          <span className={getPillClass(transaction.alertLevel)}>
                            {transaction.alertLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No transactions matched the current search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel prediction-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Analyst Notes</p>
                <h3>Current Investigation Focus</h3>
              </div>
            </div>
            <div className="info-list">
              <div className="info-row">
                <strong>Location mismatch</strong>
                <span>Present in many high-risk transactions</span>
              </div>
              <div className="info-row">
                <strong>Device anomaly</strong>
                <span>New devices are contributing strongly to score spikes</span>
              </div>
              <div className="info-row">
                <strong>Velocity cluster</strong>
                <span>Repeated transfers remain a strong fraud signal</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderOfficerView() {
    if (currentPath === "/officer/customers") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>Customer Risk Review</h3>
              <p>
                Bank officers inspect flagged customers before contacting them or placing a
                temporary hold on suspicious transactions.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Profiles in Review</span>
                <strong>{customerRiskProfiles.length}</strong>
              </div>
              <div className="mini-stat">
                <span>Temporary Holds</span>
                <strong>{officerHeld}</strong>
              </div>
            </div>
          </section>

          <div className="customer-grid">
            {customerRiskProfiles.map((transaction) => (
              <article className="panel customer-card" key={transaction.id}>
                <p className="eyebrow">Customer Profile</p>
                <h3>{transaction.customer}</h3>
                <p className="card-copy">
                  Recent transaction {transaction.id} was flagged due to{" "}
                  {transaction.reasons.join(", ")}.
                </p>
                <div className="info-list">
                  <div className="info-row">
                    <strong>Transaction Amount</strong>
                    <span>{formatCurrency(transaction.amount)}</span>
                  </div>
                  <div className="info-row">
                    <strong>Channel</strong>
                    <span>{transaction.channel}</span>
                  </div>
                  <div className="info-row">
                    <strong>Current Risk Score</strong>
                    <span>{transaction.riskScore}%</span>
                  </div>
                </div>
                <div className={getDecisionClass(caseDecisions[transaction.id] ?? "Pending Review")}>
                  {caseDecisions[transaction.id] ?? "Pending Review"}
                </div>
              </article>
            ))}
          </div>
        </div>
      );
    }

    if (currentPath === "/officer/new-transaction") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>New Transaction Entry</h3>
              <p>
                Bank officers can add a new demo transaction here. Once saved, it stays available
                after refresh on this browser and immediately appears in monitoring and alerts.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Custom Transactions</span>
                <strong>{customTransactions.length}</strong>
              </div>
              <div className="mini-stat">
                <span>Stored Mode</span>
                <strong>Local Persistent</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Officer Entry Form</p>
                  <h3>Add New Transaction</h3>
                </div>
              </div>

              {newTransactionMessage ? (
                <div className="status-banner status-success">{newTransactionMessage}</div>
              ) : null}
              {newTransactionError ? (
                <div className="status-banner status-error">{newTransactionError}</div>
              ) : null}

              <form className="prediction-form" onSubmit={handleAddTransactionSubmit}>
                <label>
                  <span>Transaction ID</span>
                  <input
                    required
                    value={newTransactionForm.id}
                    onChange={(event) => updateNewTransactionField("id", event.target.value)}
                  />
                </label>
                <label>
                  <span>Customer Name</span>
                  <input
                    required
                    value={newTransactionForm.customer}
                    onChange={(event) => updateNewTransactionField("customer", event.target.value)}
                  />
                </label>
                <label>
                  <span>Amount (INR)</span>
                  <input
                    min="0"
                    required
                    type="number"
                    value={newTransactionForm.amount}
                    onChange={(event) => updateNewTransactionField("amount", event.target.value)}
                  />
                </label>
                <label>
                  <span>Channel</span>
                  <select
                    value={newTransactionForm.channel}
                    onChange={(event) =>
                      updateNewTransactionField(
                        "channel",
                        event.target.value as TransactionRecord["channel"]
                      )
                    }
                  >
                    <option value="UPI">UPI</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Internet Banking">Internet Banking</option>
                  </select>
                </label>
                <label>
                  <span>Device Trust</span>
                  <select
                    value={newTransactionForm.deviceTrust}
                    onChange={(event) =>
                      updateNewTransactionField("deviceTrust", event.target.value as DeviceTrust)
                    }
                  >
                    <option value="trusted">Trusted Device</option>
                    <option value="new">New Device</option>
                  </select>
                </label>
                <label>
                  <span>Location Match</span>
                  <select
                    value={newTransactionForm.locationMatch}
                    onChange={(event) =>
                      updateNewTransactionField(
                        "locationMatch",
                        event.target.value as LocationMatch
                      )
                    }
                  >
                    <option value="match">Matches History</option>
                    <option value="mismatch">Location Mismatch</option>
                  </select>
                </label>
                <label>
                  <span>Transactions in 1 Hour</span>
                  <input
                    max="12"
                    min="1"
                    required
                    type="number"
                    value={newTransactionForm.velocityLastHour}
                    onChange={(event) =>
                      updateNewTransactionField("velocityLastHour", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Past Fraud Flags</span>
                  <input
                    max="10"
                    min="0"
                    required
                    type="number"
                    value={newTransactionForm.priorFlags}
                    onChange={(event) =>
                      updateNewTransactionField("priorFlags", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Transaction Time Band</span>
                  <select
                    value={newTransactionForm.timeBand}
                    onChange={(event) =>
                      updateNewTransactionField(
                        "timeBand",
                        event.target.value as TransactionRecord["timeBand"]
                      )
                    }
                  >
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                  </select>
                </label>

                <button className="btn btn-primary" type="submit">
                  Save New Transaction
                </button>
              </form>
            </section>

            <section className="panel prediction-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Latest Saved Record</p>
                  <h3>Stored Transaction Outcome</h3>
                </div>
              </div>

              <div className="prediction-result embedded-result">
                <div className="result-grid">
                  <div>
                    <span>Risk Score</span>
                    <strong>{lastAddedTransaction ? `${lastAddedTransaction.riskScore}%` : "--"}</strong>
                  </div>
                  <div>
                    <span>Prediction</span>
                    <strong>{lastAddedTransaction?.prediction ?? "--"}</strong>
                  </div>
                  <div>
                    <span>Alert Level</span>
                    <strong>{lastAddedTransaction?.alertLevel ?? "--"}</strong>
                  </div>
                </div>
                <p>
                  {lastAddedTransaction
                    ? `The stored transaction ${lastAddedTransaction.id} was marked ${lastAddedTransaction.prediction.toLowerCase()} because of ${lastAddedTransaction.reasons.join(", ")}.`
                    : "Save a transaction to see its fraud score and storage confirmation here."}
                </p>
              </div>

              <div className="info-list">
                <div className="info-row">
                  <strong>Persistence</strong>
                  <span>Saved in local browser storage for this demo</span>
                </div>
                <div className="info-row">
                  <strong>Monitoring Impact</strong>
                  <span>Added records are included in all dashboard counts after save</span>
                </div>
                <div className="info-row">
                  <strong>Officer Flow</strong>
                  <span>Suspicious new records enter the verification queue automatically</span>
                </div>
              </div>
            </section>

            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Stored Demo Records</p>
                  <h3>Officer Added Transactions</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table className="wide-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Channel</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customTransactions.length ? (
                      [...customTransactions]
                        .slice()
                        .reverse()
                        .map((transaction) => {
                          const scored = computeRiskScore(transaction);

                          return (
                            <tr key={transaction.id}>
                              <td>{transaction.id}</td>
                              <td>{transaction.customer}</td>
                              <td>{formatCurrency(transaction.amount)}</td>
                              <td>{transaction.channel}</td>
                              <td>{scored.riskScore}%</td>
                              <td>
                                <span className={getPillClass(scored.riskLevel)}>
                                  {scored.prediction}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={6}>No officer-added transactions have been saved yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (currentPath === "/officer/actions") {
      return (
        <div className="content-stack">
          <section className="hero-panel hero-panel-grid">
            <div className="hero-content">
              <h3>Officer Action Center</h3>
              <p>
                This screen records case handling decisions such as temporary hold, approval, or
                escalation to the fraud analyst.
              </p>
            </div>
            <div className="hero-stats">
              <div className="mini-stat">
                <span>Approved</span>
                <strong>{officerApproved}</strong>
              </div>
              <div className="mini-stat">
                <span>Escalated</span>
                <strong>{analystEscalations}</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel monitoring-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Decision Log</p>
                  <h3>Case Handling Summary</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table className="wide-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Customer</th>
                      <th>Risk Score</th>
                      <th>Officer Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officerQueue.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.id}</td>
                        <td>{transaction.customer}</td>
                        <td>{transaction.riskScore}%</td>
                        <td>
                          <span className={getDecisionClass(caseDecisions[transaction.id] ?? "Pending Review")}>
                            {caseDecisions[transaction.id] ?? "Pending Review"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel prediction-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Action Outcome</p>
                  <h3>Workflow Totals</h3>
                </div>
              </div>
              <div className="info-list">
                <div className="info-row">
                  <strong>Pending Review</strong>
                  <span>{officerPending}</span>
                </div>
                <div className="info-row">
                  <strong>Approved</strong>
                  <span>{officerApproved}</span>
                </div>
                <div className="info-row">
                  <strong>Temporarily Held</strong>
                  <span>{officerHeld}</span>
                </div>
                <div className="info-row">
                  <strong>Escalated to Analyst</strong>
                  <span>{analystEscalations}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="content-stack">
        <section className="hero-panel hero-panel-grid">
          <div className="hero-content">
            <h3>Bank Officer Verification Queue</h3>
            <p>
              Officers validate suspicious transactions and decide whether to approve, hold, or
              escalate each case.
            </p>
          </div>
          <div className="hero-stats">
            <div className="mini-stat">
              <span>Queue Size</span>
              <strong>{officerQueue.length}</strong>
            </div>
            <div className="mini-stat">
              <span>Awaiting Decision</span>
              <strong>{officerPending}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel monitoring-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Verification Table</p>
                <h3>Flagged Transactions for Officer Review</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table className="wide-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Risk Score</th>
                    <th>Decision</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {officerQueue.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.id}</td>
                      <td>{transaction.customer}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td>{transaction.riskScore}%</td>
                      <td>
                        <span className={getDecisionClass(caseDecisions[transaction.id] ?? "Pending Review")}>
                          {caseDecisions[transaction.id] ?? "Pending Review"}
                        </span>
                      </td>
                      <td>
                        <div className="action-group action-stack">
                          <button
                            className="btn btn-secondary btn-small"
                            type="button"
                            onClick={() => updateOfficerDecision(transaction.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary btn-small"
                            type="button"
                            onClick={() => updateOfficerDecision(transaction.id, "Temporarily Held")}
                          >
                            Hold
                          </button>
                          <button
                            className="btn btn-primary btn-small"
                            type="button"
                            onClick={() => updateOfficerDecision(transaction.id, "Escalated to Analyst")}
                          >
                            Escalate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel prediction-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Officer Guidance</p>
                <h3>Recommended Handling Rules</h3>
              </div>
            </div>
            <div className="info-list">
              <div className="info-row">
                <strong>Approve</strong>
                <span>Use when customer details and transaction history look consistent</span>
              </div>
              <div className="info-row">
                <strong>Hold</strong>
                <span>Use when temporary review is needed before releasing the transaction</span>
              </div>
              <div className="info-row">
                <strong>Escalate</strong>
                <span>Use when the case needs full fraud analyst investigation</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderRoleWorkspace() {
    if (roleKey === "admin") {
      return renderAdministratorView();
    }

    if (roleKey === "analyst") {
      return renderAnalystView();
    }

    return renderOfficerView();
  }

  return (
    <div className="app-shell">
      <section className="workspace">
        <aside className="workspace-sidebar">
          <div className="sidebar-brand">
            <p className="eyebrow">FraudShield ML</p>
            <h2>{role}</h2>
            <p className="sidebar-copy">
              {roleKey === "admin" && "Platform supervision, analytics, and governance controls."}
              {roleKey === "analyst" && "Fraud detection, alert handling, and prediction review."}
              {roleKey === "officer" && "Customer verification, case handling, and operational action logging."}
            </p>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <a
                key={item.path}
                className={`nav-button ${currentPath === item.path ? "nav-button-active" : ""}`}
                href={item.path}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </a>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="badge">Role-Based Prototype</div>
            <a className="btn btn-secondary full-width" href="/login">
              Logout
            </a>
          </div>
        </aside>

        <main className="workspace-main">
          <header className="topbar">
            <div>
              <p className="eyebrow">Current Module</p>
              <h2>{activeNavigation.label}</h2>
              <p className="topbar-copy">{activeNavigation.description}</p>
            </div>

            <div className="topbar-actions">
              <div className="badge">{role}</div>
            </div>
          </header>

          {renderRoleWorkspace()}
        </main>
      </section>
    </div>
  );
}

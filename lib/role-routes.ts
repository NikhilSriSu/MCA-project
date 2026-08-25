import type { UserRole } from "@/types/fraud";

export type RoleKey = "admin" | "analyst" | "officer";

export interface RoleRouteItem {
  description: string;
  label: string;
  path: string;
}

export const roleKeyToRole: Record<RoleKey, UserRole> = {
  admin: "Administrator",
  analyst: "Fraud Analyst",
  officer: "Bank Officer"
};

export const roleRoutes: Record<RoleKey, RoleRouteItem[]> = {
  admin: [
    {
      path: "/admin",
      label: "System Overview",
      description: "Monitor platform performance, total fraud exposure, and operations health."
    },
    {
      path: "/admin/analytics",
      label: "Analytics View",
      description: "Review fraud trends, risk distribution, and suspicious activity by channel."
    },
    {
      path: "/admin/governance",
      label: "Governance",
      description: "Track user access, audit readiness, and model control policies."
    }
  ],
  analyst: [
    {
      path: "/analyst",
      label: "Transaction Monitoring",
      description: "Inspect incoming transactions and filter suspicious activity."
    },
    {
      path: "/analyst/prediction",
      label: "Prediction Engine",
      description: "Run fraud scoring on a new transaction and inspect model reasoning."
    },
    {
      path: "/analyst/alerts",
      label: "Alert Queue",
      description: "Review critical fraud alerts and escalate high-risk cases."
    }
  ],
  officer: [
    {
      path: "/officer",
      label: "Case Verification",
      description: "Verify flagged transactions before approval, hold, or escalation."
    },
    {
      path: "/officer/customers",
      label: "Customer Review",
      description: "Check customer-level risk history and recommended follow-up action."
    },
    {
      path: "/officer/actions",
      label: "Action Center",
      description: "Record approval decisions and case-handling outcomes."
    },
    {
      path: "/officer/new-transaction",
      label: "New Transaction",
      description: "Add a new demo transaction and persist it for later review."
    }
  ]
};

export function resolveRoleRoute(
  roleParam: string,
  section: string[] | undefined
): { currentPath: string; roleKey: RoleKey } | null {
  if (!(roleParam in roleRoutes)) {
    return null;
  }

  const roleKey = roleParam as RoleKey;
  const path = `/${roleParam}${section?.length ? `/${section.join("/")}` : ""}`;

  if (!roleRoutes[roleKey].some((route) => route.path === path)) {
    return null;
  }

  return { currentPath: path, roleKey };
}

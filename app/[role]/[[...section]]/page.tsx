import FraudDashboard from "@/components/fraud-dashboard";
import transactionData from "@/data/transactions.json";
import { resolveRoleRoute } from "@/lib/role-routes";
import type { TransactionRecord } from "@/types/fraud";
import { notFound } from "next/navigation";

interface RolePageProps {
  params: Promise<{
    role: string;
    section?: string[];
  }>;
}

export default async function RolePage({ params }: RolePageProps) {
  const resolvedParams = await params;
  const route = resolveRoleRoute(resolvedParams.role, resolvedParams.section);

  if (!route) {
    notFound();
  }

  return (
    <FraudDashboard
      currentPath={route.currentPath}
      initialTransactions={transactionData as TransactionRecord[]}
      roleKey={route.roleKey}
    />
  );
}

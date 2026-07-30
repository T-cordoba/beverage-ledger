import { PermissionGate } from '@/features/auth';
import { ConsumptionReportView } from '@/features/reports';

export const metadata = { title: 'Reports · Beverage Ledger' };

export default function ReportsPage() {
  return (
    <PermissionGate permission="report:read" title="You cannot see reports.">
      <ConsumptionReportView />
    </PermissionGate>
  );
}

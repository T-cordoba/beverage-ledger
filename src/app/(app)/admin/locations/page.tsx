import { PermissionGate } from '@/features/auth';
import { LocationsView } from '@/features/locations';

export const metadata = { title: 'Locations · Beverage Ledger' };

export default function AdminLocationsPage() {
  return (
    <PermissionGate permission="catalog:manage">
      <LocationsView />
    </PermissionGate>
  );
}

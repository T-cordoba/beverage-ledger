import { Card } from '@/components/ui';
import { RegisterForm } from '@/features/auth';

export const metadata = { title: 'Create an account · Beverage Ledger' };

export default function RegisterPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-6 text-xl font-light text-foreground">Create an account</h1>
      <RegisterForm />
    </Card>
  );
}

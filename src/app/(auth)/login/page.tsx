import { Suspense } from 'react';
import { Card, Spinner } from '@/components/ui';
import { LoginForm } from '@/features/auth';

export const metadata = { title: 'Sign in · Beverage Ledger' };

export default function LoginPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-6 text-xl font-light text-foreground">Sign in</h1>
      {/* The form reads ?next= to return the user where they were headed. */}
      <Suspense fallback={<Spinner label="Loading the form" />}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}

'use client';

import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileDetailsForm } from './ProfileDetailsForm';

export function ProfileView() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-light text-foreground sm:text-3xl">Your profile</h1>
        <p className="text-sm text-contrast/60">
          What the rest of the organization sees of you, and the password you sign in with.
        </p>
      </header>

      <ProfileDetailsForm />

      <section className="space-y-3">
        <h2 className="text-lg font-light text-foreground">Password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

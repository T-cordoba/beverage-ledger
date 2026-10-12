// Values already set in the shell win: loadEnvFile never overrides them, which
// is what lets one run point NEXT_PUBLIC_API_URL at Render without editing .env.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env: everything has to come from the shell.
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env (see .env.example).`);
  }
  return value;
}

export const environment = {
  /** The front the actor browses. */
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  /** The API the actor calls directly, which has to be the one the front talks to. */
  apiUrl: process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  credentials: () => ({
    email: required('TEST_USER_EMAIL'),
    password: required('TEST_USER_PASSWORD'),
  }),
  headless: process.env.HEADLESS !== 'false',
};

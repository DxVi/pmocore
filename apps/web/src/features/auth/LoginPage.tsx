import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginRequestSchema, type LoginRequest } from '@pmocore/shared';
import { Field } from '@/components/form/Field';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';

/** Only same-app relative paths are accepted as post-login destinations. */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 429)
      return 'Too many sign-in attempts. Please wait a few minutes and try again.';
    return error.message;
  }
  return 'Unable to sign in right now. Please try again.';
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string>();
  const next = safeNext(searchParams.get('next'));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({ resolver: zodResolver(LoginRequestSchema) });

  if (user) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(undefined);
    try {
      await login(email, password);
      void navigate(next, { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  });

  return (
    <main className="container d-flex align-items-center justify-content-center min-vh-100 py-4">
      <div className="card shadow-sm w-100 pmo-login-card">
        <div className="card-body p-4">
          <p className="text-uppercase text-secondary fw-semibold small mb-1">
            Project Management &amp; Operations
          </p>
          <h1 className="h3 mb-4">Sign in to PMOCore</h1>
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}
          <form noValidate onSubmit={(event) => void onSubmit(event)}>
            <Field id="login-email" label="Email" error={errors.email}>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`}
                {...register('email')}
              />
            </Field>
            <Field id="login-password" label="Password" error={errors.password}>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className={`form-control form-control-lg ${errors.password ? 'is-invalid' : ''}`}
                {...register('password')}
              />
            </Field>
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={isSubmitting}>
              {isSubmitting && (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              )}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

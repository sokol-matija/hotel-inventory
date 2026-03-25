import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        You don&apos;t have permission to view this page. Contact your administrator if you believe
        this is a mistake.
      </p>
      <button
        onClick={() => navigate({ to: '/hotel/module-selector' })}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
      >
        Go to Home
      </button>
    </div>
  );
}

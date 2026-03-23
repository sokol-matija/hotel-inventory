import { useRouter } from '@tanstack/react-router';

interface Props {
  error: Error;
  reset: () => void;
}

export function RouteErrorFallback({ error, reset }: Props) {
  const router = useRouter();
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-destructive text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-center text-sm">{error.message}</p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
        >
          Try again
        </button>
        <button
          onClick={() => router.navigate({ to: '/hotel/front-desk' })}
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm"
        >
          Go to Front Desk
        </button>
      </div>
    </div>
  );
}

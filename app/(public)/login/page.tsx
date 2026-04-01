export default function LoginPage() {
  return (
    <section className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-neutral-900 text-center">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-neutral-600 text-center">
          Sign in to your MakersMark account
        </p>
        <div className="mt-8 p-6 rounded-xl shadow-card border border-neutral-200 bg-white">
          <p className="text-sm text-neutral-500 text-center">
            Login form — coming soon
          </p>
        </div>
        <p className="mt-4 text-sm text-neutral-600 text-center">
          No account?{" "}
          <a href="/signup" className="text-primary-600 hover:underline font-medium">
            Sign up for free
          </a>
        </p>
      </div>
    </section>
  );
}

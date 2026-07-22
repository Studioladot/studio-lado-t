import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-16 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Prueba de conexión a Supabase
      </h1>
      {error ? (
        <pre className="max-w-xl whitespace-pre-wrap rounded bg-red-100 p-4 text-sm text-red-800">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : (
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Filas visibles en &quot;organizations&quot;: {count}
        </p>
      )}
    </div>
  );
}

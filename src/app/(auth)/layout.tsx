export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* barra de cor no topo */}
      <div className="h-1.5 w-full bg-primary" />
      <main className="flex flex-1 flex-col justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}

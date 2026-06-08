interface PlaceholderPageProps {
  title: string;
  desc?: string;
}

export function PlaceholderPage({ title, desc }: PlaceholderPageProps) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      {desc && <p className="text-sm text-gray-400 max-w-xs">{desc}</p>}
      <p className="text-xs text-orange-400 mt-3">Fáza 2</p>
    </div>
  );
}

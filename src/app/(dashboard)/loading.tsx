export default function DashboardLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-slate-900 border border-slate-800/60 rounded-2xl h-24" />
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl h-52" />
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl h-36" />
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl h-28" />
    </div>
  )
}

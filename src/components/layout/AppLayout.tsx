import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
  alertCount?: number
}

export default function AppLayout({ children, alertCount = 0 }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar — solo desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header alertCount={alertCount} />

        <main className="flex-1 overflow-auto pb-20 lg:pb-6 px-4 lg:px-6 pt-4">
          {children}
        </main>
      </div>

      {/* Bottom nav — solo mobile */}
      <BottomNav />
    </div>
  )
}

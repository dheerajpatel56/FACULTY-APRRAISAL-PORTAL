import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  BarChart2, FileText, BookOpen, User, Users, Settings, LayoutDashboard, Mail, Activity, Menu, X,
} from 'lucide-react';
import BrandHeader from './BrandHeader';
import Footer from './Footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isHodOrReviewer } = useAuthStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const navLink = (to: string, label: string, Icon: any) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
          active
            ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-600 -ml-px'
            : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
        }`}
      >
        <Icon size={15} className={active ? 'text-primary-600' : 'text-ink-muted'} />
        {label}
      </Link>
    );
  };

  const navItems = (
    <>
      {isAdmin() ? (
        <>
          {navLink('/admin/dashboard', 'Dashboard', LayoutDashboard)}
          {navLink('/admin/users', 'Users', Users)}
          {navLink('/admin/departments', 'Departments', Settings)}
          {navLink('/admin/academic-years', 'Academic Years', BookOpen)}
          {navLink('/admin/appraisals', 'All Appraisals', FileText)}
          {navLink('/admin/reports', 'Reports', BarChart2)}
          {navLink('/admin/emails', 'Emails', Mail)}
          {navLink('/admin/audit', 'Audit Log', Activity)}
        </>
      ) : isHodOrReviewer() ? (
        <>
          {navLink('/dashboard', 'Dashboard', LayoutDashboard)}
          {navLink('/reviews', 'Review Queue', FileText)}
          {navLink('/fpgp/department', 'Dept FPGP', BookOpen)}
          {navLink('/reports/department', 'Reports', BarChart2)}
        </>
      ) : (
        <>
          {navLink('/dashboard', 'Dashboard', LayoutDashboard)}
          {navLink('/appraisal', 'Appraisals', FileText)}
          {navLink('/fpgp', 'FPGP', BookOpen)}
          {navLink('/profile', 'Profile', User)}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-surface-base">
      {/* Mobile hamburger row above BrandHeader */}
      <div className="lg:hidden flex items-center justify-between bg-primary-800 px-3 py-2 border-b border-primary-700">
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-white p-1.5 rounded hover:bg-primary-700"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="text-xs font-bold text-accent-400 tracking-wide">VNRVJIET PORTAL</div>
        <div className="w-7" />
      </div>

      <BrandHeader />

      <div className="flex flex-1 relative">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-52 bg-surface-card border-r border-surface-border flex-col shrink-0">
          <div className="px-4 py-3 border-b border-surface-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Navigation</span>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">{navItems}</nav>
          <div className="px-3 py-2 border-t border-surface-border">
            <div className="text-[10px] text-ink-subtle">Faculty Appraisal System</div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-surface-card border-r border-surface-border flex flex-col z-50 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-primary-700 text-white">
                <span className="text-xs font-semibold uppercase tracking-wider">Navigation</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-primary-600 rounded" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">{navItems}</nav>
              <div className="px-3 py-2 border-t border-surface-border">
                <div className="text-[10px] text-ink-subtle">Faculty Appraisal System</div>
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className="p-4 sm:p-6 max-w-7xl">{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

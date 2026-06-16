import { useAuthStore } from '../store/authStore';
import { LogOut, ChevronDown } from 'lucide-react';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function BrandHeader() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-primary-700 text-white">
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 gap-2">
        {/* Institute branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent-500 flex items-center justify-center text-primary-800 font-bold text-xs sm:text-sm font-serif shrink-0">
            VJ
          </div>
          <div className="border-l border-accent-500/40 pl-2 sm:pl-3 min-w-0">
            <div className="text-xs sm:text-sm font-bold tracking-wide leading-tight">VNRVJIET</div>
            <div className="hidden sm:block text-[10px] text-primary-200 leading-tight truncate">
              VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI
            </div>
            <div className="hidden sm:block text-[10px] text-primary-200 leading-tight truncate">
              INSTITUTE OF ENGINEERING & TECHNOLOGY
            </div>
            <div className="sm:hidden text-[9px] text-primary-200 leading-tight truncate">
              Faculty Appraisal Portal
            </div>
          </div>
        </div>

        {/* Accreditation chips + user */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-500/20 text-accent-200 border border-accent-500/30">
            NAAC A++
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-500/20 text-accent-200 border border-accent-500/30">
            NBA
          </span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-500/20 text-accent-200 border border-accent-500/30">
            AUTONOMOUS
          </span>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 text-xs text-primary-100 hover:text-white ml-2"
              >
                <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-[10px] font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                <ChevronDown size={12} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-surface-border z-50 py-1">
                  <div className="px-3 py-2 border-b border-surface-border">
                    <div className="text-xs font-medium text-ink-primary truncate">{user.name}</div>
                    <div className="text-[10px] text-ink-muted truncate">{user.employeeCode}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger-500 hover:bg-surface-muted"
                  >
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

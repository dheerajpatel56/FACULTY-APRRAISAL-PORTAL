import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { GraduationCap } from 'lucide-react';

const schema = z.object({
  employeeCode: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.employeeCode, data.password);
      login(res.accessToken, res.refreshToken, res.user);
      const isAdmin = res.user.roles.some((r: any) => r.role === 'ADMIN');
      const isHodOrReviewer = res.user.roles.some((r: any) => r.role === 'HOD' || r.role === 'REVIEWER');
      if (isAdmin) navigate('/admin/dashboard');
      else if (isHodOrReviewer) navigate('/reviews');
      else navigate('/dashboard');
    } catch {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left pane — institute hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent-500/10" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-accent-500/5" />

        <div className="relative z-10 text-center max-w-md">
          {/* Monogram */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-500/20 border-2 border-accent-500/40 flex items-center justify-center">
            <span className="text-2xl font-bold font-serif text-accent-400">VJ</span>
          </div>

          <h1 className="text-3xl font-bold font-serif leading-tight mb-2" style={{ color: '#f5d680' }}>
            VALLURUPALLI NAGESWARA RAO<br />VIGNANA JYOTHI
          </h1>
          <h2 className="text-base font-semibold tracking-wide mb-6" style={{ color: '#ffffff' }}>
            INSTITUTE OF ENGINEERING & TECHNOLOGY
          </h2>

          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="px-3 py-1 rounded text-[11px] font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30">
              NAAC A++
            </span>
            <span className="px-3 py-1 rounded text-[11px] font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30">
              NBA Accredited
            </span>
            <span className="px-3 py-1 rounded text-[11px] font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30">
              Autonomous
            </span>
          </div>

          <p className="text-xs text-primary-300 italic font-serif">
            TAMASOMA JYOTIRGAMAYA
          </p>
          <p className="text-[10px] text-primary-400 mt-1">
            "Lead me from darkness to light"
          </p>
        </div>
      </div>

      {/* Right pane — sign-in form */}
      <div className="flex-1 flex items-center justify-center bg-surface-base p-6">
        <div className="w-full max-w-sm">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary-700 flex items-center justify-center">
              <span className="text-lg font-bold font-serif text-accent-400">VJ</span>
            </div>
            <div className="text-sm font-bold text-ink-primary">VNRVJIET</div>
            <div className="text-xs text-ink-muted">Faculty Appraisal Portal</div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-md shadow-sm overflow-hidden">
            {/* Gold top accent */}
            <div className="h-1 bg-accent-500" />

            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={20} className="text-primary-600" />
                <h2 className="text-lg font-bold text-ink-primary">Faculty Portal</h2>
              </div>
              <p className="text-xs text-ink-muted mb-5">Sign in with your employee credentials</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Employee Code</label>
                  <input
                    {...register('employeeCode')}
                    className="w-full border border-surface-border rounded px-3 py-2 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. FAC001"
                  />
                  {errors.employeeCode && <p className="text-danger-500 text-xs mt-1">{errors.employeeCode.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Password</label>
                  <input
                    type="password"
                    {...register('password')}
                    className="w-full border border-surface-border rounded px-3 py-2 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded text-sm transition-colors"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="text-center">
                  <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </div>
          </div>

          <p className="text-center text-[10px] text-ink-subtle mt-4">
            &copy; {new Date().getFullYear()} VNRVJIET — Faculty Appraisal System
          </p>
        </div>
      </div>
    </div>
  );
}

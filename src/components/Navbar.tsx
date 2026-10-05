import { useState, useEffect } from 'react';
import { Heart, MoreVertical, X, LayoutDashboard, LogOut, User, Shield } from 'lucide-react';
import { useRoute, useNavigate, type Route } from '../router';
import { useAuth } from '../context/AuthContext';

const mainItems: { label: string; route: Route }[] = [
  { label: 'Home', route: 'home' },
  { label: 'About Us', route: 'about' },
  { label: 'Apply', route: 'apply' },
  { label: 'Donate', route: 'donate' },
  { label: 'Contact Us', route: 'contact' },
];

// Items that don't navigate but do something (open chat, open external link)
type ActionItem = {
  label: string;
  action: 'chat-update' | 'ccic';
};

const applicantActions: ActionItem[] = [
  { label: 'New update', action: 'chat-update' },
  { label: 'Generate CCIC', action: 'ccic' },
];

const CCIC_URL = '/ccic/index.html';

export default function Navbar() {
  const route = useRoute();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (r: Route) => {
    navigate(r);
    setMobileOpen(false);
  };

  const handleChatUpdate = () => {
    const w = window as unknown as {
      smartsupp?: (...args: unknown[]) => void;
    };
    if (typeof w.smartsupp === 'function') {
      try {
        w.smartsupp('chat:open');
        w.smartsupp(
          'chat:message:send',
          'Hello, I would like to receive an update regarding my application.',
        );
      } catch {
        // ignore
      }
    }
    setMobileOpen(false);
  };

  const handleCcic = () => {
    window.open(CCIC_URL, '_blank', 'noopener,noreferrer');
    setMobileOpen(false);
  };

  const handleAction = (action: ActionItem['action']) => {
    if (action === 'chat-update') handleChatUpdate();
    else if (action === 'ccic') handleCcic();
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 shadow-md backdrop-blur-sm'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <nav className="container-max flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => go('home')}
          className="flex items-center gap-2.5 transition-transform hover:scale-105"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="text-left">
            <span className="font-serif text-lg font-bold leading-none text-neutral-900">
              Hope
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-primary-600">
              Charity Foundation
            </span>
          </div>
        </button>

        {/* Desktop nav — unchanged: inline links */}
        <div className="hidden items-center gap-1 lg:flex">
          {mainItems.map((item) => (
            <button
              key={item.route}
              onClick={() => go(item.route)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                route === item.route
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => go('tracker')}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              route === 'tracker'
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Track my application
          </button>
          <button
            onClick={handleChatUpdate}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900"
          >
            New update
          </button>
          <button
            onClick={handleCcic}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900"
          >
            Generate CCIC
          </button>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {isAdmin && (
            <button
              onClick={() => go('admin')}
              className="btn-ghost"
              title="Admin Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </button>
          )}
          <button
            onClick={() => go('admin-login')}
            className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 transition-colors hover:border-primary-300 hover:text-primary-600"
            aria-label="Admin access"
            title="Admin Access"
          >
            <Shield className="h-4.5 w-4.5" />
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => go('tracker')}
                className="btn-ghost"
                title="My Applications"
              >
                <User className="h-4 w-4" />
                {profile?.full_name?.split(' ')[0] ?? 'Account'}
              </button>
              <button
                onClick={signOut}
                className="btn-ghost"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => go('auth')} className="btn-primary">
              Sign In
            </button>
          )}
          <button onClick={() => go('donate')} className="btn-accent">
            Donate Now
          </button>
        </div>

        {/* Mobile: 3-dot opens the 3-section dropdown */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => go('admin-login')}
            className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 transition-colors hover:border-primary-300 hover:text-primary-600"
            aria-label="Admin access"
            title="Admin Access"
          >
            <Shield className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-neutral-700"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <MoreVertical className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown — 3 sections */}
      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white lg:hidden">
          <div className="px-4 py-4">
            {/* Section 1 — Main */}
            <div className="space-y-1">
              {mainItems.map((item) => (
                <button
                  key={item.route}
                  onClick={() => go(item.route)}
                  className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    route === item.route
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="my-3 border-t border-neutral-200" />

            {/* Section 2 — Applicant */}
            <div className="space-y-1">
              <button
                onClick={() => go('tracker')}
                className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  route === 'tracker'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Track my application
              </button>
              {applicantActions.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleAction(item.action)}
                  className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="my-3 border-t border-neutral-200" />

            {/* Section 3 — Admin */}
            <div className="space-y-1">
              {isAdmin && (
                <button
                  onClick={() => go('admin')}
                  className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                >
                  Admin Dashboard
                </button>
              )}
              {user ? (
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => go('auth')}
                  className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>

            <button
              onClick={() => go('donate')}
              className="btn-accent mt-4 w-full"
            >
              Donate Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

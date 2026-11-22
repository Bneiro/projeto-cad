import type { User } from 'firebase/auth';
import { LogOut, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../utils/theme';

export type ActiveTab = 'explorer' | 'mural' | 'chat' | 'sessions' | 'curator';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  hasWorkspaceToken: boolean;
  isLoggingIn: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'explorer', label: 'Rede de Músicos' },
  { id: 'mural', label: 'Mural' },
  { id: 'chat', label: 'Chat ao Vivo' },
  { id: 'sessions', label: 'Sessões' },
  { id: 'curator', label: 'Curadoria' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  user,
  hasWorkspaceToken,
  isLoggingIn,
  theme,
  onToggleTheme,
  onSignIn,
  onSignOut,
}: TopBarProps) {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('explorer')}
          className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 rounded-sm"
        >
          Elo Sonoro
        </button>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'border-blue-700 dark:border-blue-400 text-slate-950 dark:text-white'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme toggle + primary account action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
          </button>

          {user && hasWorkspaceToken ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label={`Sair da conta ${user.displayName || user.email || ''}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span className="max-w-36 truncate">{user.displayName || user.email}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-1 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-blue-700 dark:border-blue-400 text-slate-950 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

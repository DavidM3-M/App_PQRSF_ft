import { Link, useNavigate, useLocation } from 'react-router';
import {
  LogOut, LayoutDashboard, Search, Home,
  Settings, ChevronRight, User, Shield,
  UserPlus, FileText, BarChart2, Bell
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import logoImage from 'figma:asset/cb5da2e8f40c7190e19e43b001cd00d6fa11e3e2.png';

/* ─── Hamburger animado ────────────────────────────── */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-6 h-5 flex flex-col justify-between cursor-pointer">
      <motion.span
        animate={open ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="block h-[2.5px] w-full bg-white rounded-full origin-center"
      />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
        className="block h-[2.5px] w-4/5 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
      />
      <motion.span
        animate={open ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="block h-[2.5px] w-full bg-white rounded-full origin-center"
      />
    </div>
  );
}

/* ─── Link desktop con indicador activo ────────────── */
interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  active?: boolean;
}

function NavLink({ to, children, icon, highlight, active }: NavLinkProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors select-none overflow-hidden ${
        highlight
          ? 'bg-[#ff9800] hover:bg-[#f57c00] text-white font-semibold shadow-md'
          : active
          ? 'text-[#ffc107]'
          : 'text-white/80 hover:text-white'
      }`}
    >
      {!highlight && (
        <motion.span
          animate={{ opacity: hovered || active ? 1 : 0, scaleX: hovered || active ? 1 : 0.6 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 rounded-md origin-left"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        />
      )}
      <span className="relative flex items-center gap-1.5">
        <motion.span animate={{ rotate: hovered ? 10 : 0 }} transition={{ duration: 0.2 }}>
          {icon}
        </motion.span>
        {children}
      </span>
      {!highlight && (
        <motion.span
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#ffc107] rounded-full origin-left"
        />
      )}
    </Link>
  );
}

/* ─── Link del panel lateral mobile ────────────────── */
interface MobileItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
  badge?: string;
  index: number;
}

function MobileItem({ to, label, icon, onClick, highlight, badge, index }: MobileItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: 'easeOut' }}
    >
      <Link
        to={to}
        onClick={onClick}
        className={`group flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all ${
          highlight
            ? 'bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white shadow-lg shadow-orange-500/20'
            : 'text-white/85 hover:text-white hover:bg-white/10'
        }`}
      >
        <motion.span
          whileHover={{ scale: 1.2, rotate: 8 }}
          className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
          style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}
        >
          {icon}
        </motion.span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffc107] text-[#1e3a5f]">
            {badge}
          </span>
        )}
        <motion.span
          initial={{ x: -4, opacity: 0 }}
          whileHover={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-white/40"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.span>
      </Link>
    </motion.div>
  );
}

/* ─── Componente principal ─────────────────────────── */
export function InstitutionalNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // 'usuario' es el nombre en AuthContext; alias local 'user' para no tocar el resto del componente
  const { usuario: user, logout } = useAuth();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const initials = user?.nombre
    ? user.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  /* Opciones por rol */
  const panelPath = user?.rol === 'admin' ? '/admin' : user?.rol === 'area' ? '/area' : '/dashboard';
  const isPanelActive = isActive('/admin') || isActive('/area') || isActive('/dashboard');

  return (
    <header className="relative z-50">
      <div className="h-1 w-full bg-gradient-to-r from-[#ff9800] via-[#ffc107] to-[#ff9800]" />

      <nav className="bg-[#1e3a5f] text-white shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[76px]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="bg-white rounded-md flex items-center justify-center shadow-md p-1.5 flex-shrink-0" style={{ width: 52, height: 52 }}>
                <img src={logoImage} alt="Logo Institucional" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-[19px] font-bold tracking-tight text-white">Sistema PQRS</p>
                <p className="text-[13px] text-[#ffc107] font-semibold tracking-wider uppercase">Institución Educativa</p>
              </div>
            </Link>

            {/* ── Desktop nav ── */}
            <div className="hidden lg:flex items-center gap-1">

              {/* Anónimo */}
              {!user && (
                <>
                  <NavLink to="/" icon={<Home className="w-3.5 h-3.5" />} active={isActive('/')}>Inicio</NavLink>
                  <NavLink to="/consulta" icon={<Search className="w-3.5 h-3.5" />} active={isActive('/consulta')}>Consultar</NavLink>
                  <NavLink to="/registro" icon={<UserPlus className="w-3.5 h-3.5" />} active={isActive('/registro')}>Registrarse</NavLink>
                </>
              )}

              {/* Usuario registrado */}
              {user && user.rol === 'usuario' && (
                <>
                  <NavLink to="/" icon={<Home className="w-3.5 h-3.5" />} active={isActive('/')}>Inicio</NavLink>
                  <NavLink to="/dashboard" icon={<LayoutDashboard className="w-3.5 h-3.5" />} active={isActive('/dashboard')}>Mi Panel</NavLink>
                  <NavLink to="/consulta" icon={<Search className="w-3.5 h-3.5" />} active={isActive('/consulta')}>Consultar</NavLink>
                  <NavLink to="/dashboard" icon={<FileText className="w-3.5 h-3.5" />} highlight>Mis PQRS</NavLink>
                </>
              )}

              {/* Área */}
              {user && user.rol === 'area' && (
                <>
                  <NavLink to="/area" icon={<LayoutDashboard className="w-3.5 h-3.5" />} active={isActive('/area')}>Mi Panel</NavLink>
                  <NavLink to="/consulta" icon={<Search className="w-3.5 h-3.5" />} active={isActive('/consulta')}>Consultar</NavLink>
                  {user.is_staff && (
                    <NavLink to="/admin" icon={<Shield className="w-3.5 h-3.5" />} active={isActive('/admin')}>Admin</NavLink>
                  )}
                  <NavLink to="/area" icon={<Bell className="w-3.5 h-3.5" />} highlight>Asignadas</NavLink>
                </>
              )}

              {/* Admin */}
              {user && user.rol === 'admin' && (
                <>
                  <NavLink to="/admin" icon={<LayoutDashboard className="w-3.5 h-3.5" />} active={isActive('/admin')}>Dashboard</NavLink>
                  <NavLink to="/gestion-areas" icon={<Settings className="w-3.5 h-3.5" />} active={isActive('/gestion-areas')}>Áreas</NavLink>
                  <NavLink to="/gestion-roles" icon={<Shield className="w-3.5 h-3.5" />} active={isActive('/gestion-roles')}>Roles</NavLink>
                  <NavLink to="/gestion-sla" icon={<BarChart2 className="w-3.5 h-3.5" />} active={isActive('/gestion-sla')}>SLA</NavLink>
                  <NavLink to="/consulta" icon={<Search className="w-3.5 h-3.5" />} active={isActive('/consulta')}>Consultar</NavLink>
                </>
              )}
            </div>

            {/* Auth desktop */}
            <div className="hidden lg:flex items-center">
              {user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff9800] to-[#ffc107] flex items-center justify-center shadow-sm">
                      <span className="text-[#1e3a5f] font-bold text-xs">{initials}</span>
                    </div>
                    <div className="text-right leading-tight">
                      <p className="text-sm font-semibold text-white">{user.nombre}</p>
                      <p className="text-[11px] text-[#ffc107] uppercase tracking-wider">{user.rol}</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-red-500/80 rounded-md text-sm font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Salir</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/login')}
                  className="ml-4 flex items-center gap-2 px-5 py-2.5 bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-md text-sm font-bold tracking-wide transition-colors shadow-md"
                >
                  Ingresar
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>

            {/* Hamburguesa mobile */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(v => !v)}
              className="lg:hidden p-2.5 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Menú"
            >
              <HamburgerIcon open={menuOpen} />
            </motion.button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </nav>

      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#ffc107] to-transparent opacity-80" />

      {/* ─── Panel lateral mobile ─── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 z-50 h-full w-[300px] max-w-[85vw] flex flex-col overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #0f2440 0%, #1e3a5f 50%, #162d4a 100%)' }}
            >
              {/* Decoraciones */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #ff9800, transparent 70%)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #ffc107, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

              {/* Header drawer */}
              <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-md p-1 shadow-md" style={{ width: 38, height: 38 }}>
                    <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Sistema PQRS</p>
                    <p className="text-[10px] text-[#ffc107] uppercase tracking-widest">Menú Principal</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  ✕
                </motion.button>
              </div>

              {/* Tarjeta de usuario */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mx-4 mt-4 p-4 rounded-xl border border-white/10 flex items-center gap-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ff9800] to-[#ffc107] flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-[#1e3a5f] font-bold text-sm">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user.nombre}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <p className="text-[11px] text-[#ffc107] uppercase tracking-widest font-semibold">{user.rol}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Links */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/35"
                >
                  Navegación
                </motion.p>

                {/* Sin sesión */}
                {!user && (
                  <>
                    <MobileItem index={0} to="/" label="Inicio" icon={<Home className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={1} to="/consulta" label="Consultar Radicado" icon={<Search className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={2} to="/registro" label="Crear cuenta" icon={<UserPlus className="w-4 h-4" />} onClick={() => setMenuOpen(false)} highlight badge="Gratis" />
                  </>
                )}

                {/* Usuario registrado */}
                {user && user.rol === 'usuario' && (
                  <>
                    <MobileItem index={0} to="/" label="Inicio" icon={<Home className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={1} to="/dashboard" label="Mi Panel" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={2} to="/consulta" label="Consultar Radicado" icon={<Search className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={3} to="/dashboard" label="Mis PQRS" icon={<FileText className="w-4 h-4" />} onClick={() => setMenuOpen(false)} highlight />
                  </>
                )}

                {/* Área */}
                {user && user.rol === 'area' && (
                  <>
                    <MobileItem index={0} to="/area" label="Mi Panel" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={1} to="/consulta" label="Consultar Radicado" icon={<Search className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={2} to="/area" label="PQRS Asignadas" icon={<Bell className="w-4 h-4" />} onClick={() => setMenuOpen(false)} highlight />
                    {user.is_staff && (
                      <MobileItem index={3} to="/admin" label="Panel Administración" icon={<Shield className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    )}
                  </>
                )}

                {/* Admin */}
                {user && user.rol === 'admin' && (
                  <>
                    <MobileItem index={0} to="/admin" label="Dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={1} to="/gestion-areas" label="Gestión de Áreas" icon={<Settings className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={2} to="/consulta" label="Consultar Radicado" icon={<Search className="w-4 h-4" />} onClick={() => setMenuOpen(false)} />
                    <MobileItem index={3} to="/admin" label="Estadísticas" icon={<BarChart2 className="w-4 h-4" />} onClick={() => setMenuOpen(false)} highlight />
                  </>
                )}

                {/* Separador */}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="my-3 h-px origin-left"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/35"
                >
                  Cuenta
                </motion.p>

                {!user ? (
                  <MobileItem
                    index={5}
                    to="/login"
                    label="Ingresar al sistema"
                    icon={<User className="w-4 h-4" />}
                    onClick={() => setMenuOpen(false)}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    transition={{ duration: 0.28, delay: 0.3 }}
                  >
                    <button
                      onClick={handleLogout}
                      className="group w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium text-red-300 hover:text-white hover:bg-red-500/30 transition-all"
                    >
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/20 group-hover:bg-red-500/40 flex-shrink-0">
                        <LogOut className="w-4 h-4" />
                      </span>
                      <span className="flex-1 text-left">Cerrar sesión</span>
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Footer drawer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="px-5 py-4 border-t border-white/10"
              >
                <div className="flex items-center gap-2 text-white/25">
                  <Shield className="w-3.5 h-3.5" />
                  <p className="text-[11px]">Sistema seguro · PQRS Institucional</p>
                </div>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
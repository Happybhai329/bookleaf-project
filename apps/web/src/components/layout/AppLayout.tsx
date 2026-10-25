import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@bookleaf/shared';
import {
  BookOpen,
  LayoutDashboard,
  Ticket,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
  Inbox,
  Users,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  const authorNav = [
    { to: '/author/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/author/books', label: 'My Books', icon: BookOpen },
    { to: '/author/tickets', label: 'My Tickets', icon: Ticket },
    { to: '/author/tickets/new', label: 'Submit Query', icon: PlusCircle },
  ];

  const adminNav = [
    { to: '/admin/dashboard', label: 'Operations Overview', icon: LayoutDashboard },
    { to: '/admin/tickets', label: 'Global Ticket Queue', icon: Inbox },
    { to: '/admin/authors', label: 'Authors Directory', icon: Users },
    { to: '/admin/books', label: 'Master Book Catalog', icon: BookOpen },
  ];

  const navItems = isAdmin ? adminNav : authorNav;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-navy-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🍃</span>
          <span className="font-bold text-lg tracking-tight">BookLeaf</span>
          <span className="text-xs px-2 py-0.5 rounded bg-navy-800 text-slate-300">
            {isAdmin ? 'Admin' : 'Author'}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-300 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950 text-white px-4 py-3 border-b border-navy-800">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-navy-900 hover:text-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-900 text-white border-r border-navy-800 shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-navy-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🍃</span>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">
                BookLeaf
              </h1>
              <p className="text-xs text-slate-400 mt-1">Author Support Portal</p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                isAdmin
                  ? 'bg-amber-900/60 text-amber-200 border border-amber-700/60'
                  : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/60'
              }`}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Staff Operations
                </>
              ) : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Author Workspace
                </>
              )}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-navy-800 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-navy-800/60 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 text-slate-400" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/50">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-navy-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-gray-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isAdmin ? 'Staff Operations Console' : 'Author Workspace'}
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-gray-700">Supabase Connected</span>
            </div>
            <div className="flex items-center space-x-1.5 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Gemini 2.5 Flash Online</span>
            </div>
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-xs">
                {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="font-bold text-gray-900">{user?.display_name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

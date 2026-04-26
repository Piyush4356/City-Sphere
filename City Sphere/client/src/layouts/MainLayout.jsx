import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Map as MapIcon, Phone, LogIn, User as UserIcon, LogOut, Compass, MessageSquare, Menu, X, CheckCircle, Moon, Sun } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useContext, useState } from 'react';
import ChatBot from '../features/chatbot/ChatBot';

// ─── Custom City Sphere Logo ────────────────────────────────
const CitySphereLogo = ({ className }) => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Globe circle */}
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none"/>
        {/* Horizontal lines */}
        <ellipse cx="16" cy="16" rx="14" ry="5.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.2"/>
        {/* Vertical meridian */}
        <ellipse cx="16" cy="16" rx="5.5" ry="14" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        {/* City buildings on top */}
        <rect x="11" y="6" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.9"/>
        <rect x="15" y="4" width="3" height="9" rx="0.5" fill="currentColor" opacity="0.9"/>
        <rect x="19" y="7" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.9"/>
        {/* Small antenna on tallest building */}
        <line x1="16.5" y1="2" x2="16.5" y2="4" stroke="currentColor" strokeWidth="1"/>
        <circle cx="16.5" cy="1.8" r="0.8" fill="currentColor"/>
    </svg>
);

// ─── Nav Link Component ─────────────────────────────────────
const NavLink = ({ to, icon: Icon, children, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors py-1 ${
                isActive
                    ? 'text-civic-500 dark:text-civic-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
        >
            <Icon className="w-4 h-4" />
            {children}
        </Link>
    );
};

// ─── Header Navigation ──────────────────────────────────────
const HeaderNav = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = (
        <>
            <NavLink to="/" icon={Home} onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/map" icon={MapIcon} onClick={() => setMobileMenuOpen(false)}>Map</NavLink>
            <NavLink to="/explore" icon={Compass} onClick={() => setMobileMenuOpen(false)}>Explore</NavLink>
            <NavLink to="/feedback" icon={MessageSquare} onClick={() => setMobileMenuOpen(false)}>Feedback</NavLink>
            <NavLink to="/emergency" icon={Phone} onClick={() => setMobileMenuOpen(false)}>Emergency</NavLink>
            {user?.role === 'admin' && (
                <NavLink to="/admin/review" icon={CheckCircle} onClick={() => setMobileMenuOpen(false)}>Moderation</NavLink>
            )}
        </>
    );

    const authSection = user ? (
        <div className="flex items-center gap-3">
            <Link
                to="/profile"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-civic-500 dark:hover:text-civic-300 flex items-center gap-1.5 transition-colors"
            >
                <UserIcon className="w-4 h-4 text-civic-500 dark:text-civic-300" /> {user.name}
            </Link>
            <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
            >
                <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
        </div>
    ) : (
        <Link
            to="/login"
            className="bg-civic-500 hover:bg-civic-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
        >
            <LogIn className="w-3.5 h-3.5" /> Sign In
        </Link>
    );

    return (
        <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
                {navItems}
                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="border-l border-border dark:border-gray-700 pl-4 ml-2">
                    {authSection}
                </div>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#181a2a] border-b border-border dark:border-gray-700 shadow-md md:hidden z-50">
                    <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
                        {navItems}
                        <div className="border-t border-border dark:border-gray-700 pt-3 mt-1">
                            {authSection}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── Main Layout ─────────────────────────────────────────────
const MainLayout = () => {
    return (
        <div className="min-h-screen bg-surface dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-[#181a2a] border-b border-border dark:border-gray-800 sticky top-0 z-10 w-full relative">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="bg-civic-500 p-1.5 rounded-lg">
                            <CitySphereLogo className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">City Sphere</h1>
                    </Link>

                    <HeaderNav />
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 flex-grow">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-[#181a2a] border-t border-border dark:border-gray-800 mt-auto">
                <div className="container mx-auto px-4 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                    &copy; {new Date().getFullYear()} City Sphere · Smart City Portal
                </div>
            </footer>

            {/* ChatBot Floating UI */}
            <ChatBot />
        </div>
    );
};

export default MainLayout;

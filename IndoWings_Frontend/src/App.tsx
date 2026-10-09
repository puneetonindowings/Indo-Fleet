import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { PlatformPage } from './pages/PlatformPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { GcsPage } from './pages/GcsPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { VersionsPage } from './pages/VersionsPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { DroneDispatchModule } from './pages/DroneDispatchModule';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { SupportPage } from './pages/SupportPage';
import { DocsPage } from './pages/DocsPage';
import { CompanyPage } from './pages/CompanyPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { LegalPage } from './pages/LegalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { FleetManagerPage } from './pages/FleetManagerPage';
import { SupportDeskPage } from './pages/SupportDeskPage';
import { StorePage } from './pages/StorePage';
import { CommandCenterModal } from './components/CommandCenterModal';
import { DemoBookingModal } from './components/DemoBookingModal';
import { API_BASE_URL } from './config/api';
import { SEOHead } from './components/SEOHead';
import { DeliveryTrackingModule } from './pages/DeliveryTrackingModule';
import { DeliveryAppPage } from './pages/DeliveryAppPage';
import { Chatbot } from './components/Chatbot';
import { UserProfile, DeliveryUser } from './types';

type Page = 'home' | 'platform' | 'command-center' | 'gcs' | 'downloads' | 'versions' | 'track' | 'dispatch' | 'drone-dispatch' | 'delivery-tracking' | 'delivery-app' | 'login' | 'profile' | 'orders' | 'support' | 'docs' | 'company' | 'feedback' | 'legal' | 'admin' | 'fleet' | 'support-desk' | 'shop' | 'store' | 'cart';

const getInitialPage = (): Page => {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.includes('/admin')) return 'admin';
  if (p.includes('/fleet')) return 'fleet';
  if (p.includes('/support-desk') || p.includes('/support_desk')) return 'support-desk';
  if (p.includes('/drone-dispatch')) return 'drone-dispatch';
  if (p.includes('/delivery-tracking')) return 'delivery-tracking';
  if (p.includes('/delivery-app') || p.includes('/pilot-app')) return 'delivery-app';
  if (p.includes('/cart')) return 'cart';
  if (p.includes('/shop') || p.includes('/store')) return 'shop';
  if (p.includes('/command-center')) return 'command-center';
  if (p.includes('/platform')) return 'platform';
  if (p.includes('/gcs')) return 'gcs';
  if (p.includes('/downloads')) return 'downloads';
  if (p.includes('/versions') || p.includes('/release-notes') || p.includes('/release_notes')) return 'versions';
  if (p.includes('/order') || p.includes('/track')) return 'track';
  if (p.includes('/dispatch')) return 'dispatch';
  if (p.includes('/login')) return 'login';
  if (p.includes('/orders')) return 'orders';
  if (p.includes('/profile')) return 'profile';
  if (p.includes('/docs') || p.includes('/documentation')) return 'docs';
  if (p.includes('/company')) return 'company';
  if (p.includes('/feedback')) return 'feedback';
  if (p.includes('/legal') || p.includes('/privacy') || p.includes('/terms') || p.includes('/security-disclosure') || p.includes('/data-protection')) return 'legal';
  if (p.includes('/support') || p.includes('/guide') || p.includes('/fix')) return 'support';
  return 'home';
};

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload || typeof payload !== 'object') return false;
    if (payload.exp && typeof payload.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp < nowInSeconds) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedDroneForDemo, setSelectedDroneForDemo] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  // Restore delivery session on load with expiration and integrity validation
  useEffect(() => {
    const token = localStorage.getItem('iw_delivery_token');
    const userStr = localStorage.getItem('iw_delivery_user');
    if (token && userStr) {
      if (!isTokenValid(token)) {
        console.warn('[auth] Invalid or expired JWT token on application startup. Clearing session.');
        localStorage.removeItem('iw_delivery_token');
        localStorage.removeItem('iw_delivery_user');
        setDeliveryUser(null);
        return;
      }
      try {
        const user = JSON.parse(userStr) as DeliveryUser;
        setDeliveryUser(user);
      } catch {
        localStorage.removeItem('iw_delivery_token');
        localStorage.removeItem('iw_delivery_user');
      }
    }
  }, []);

  // Route Protection & Role Governance for Enterprise Dashboards & Fleet Store
  useEffect(() => {
    const protectedPages: Page[] = ['admin', 'fleet', 'support-desk', 'dispatch', 'drone-dispatch', 'delivery-tracking', 'shop', 'store', 'cart'];
    if (protectedPages.includes(currentPage)) {
      const token = localStorage.getItem('iw_delivery_token');
      const userStr = localStorage.getItem('iw_delivery_user');
      if (!token || !userStr || !isTokenValid(token)) {
        localStorage.removeItem('iw_delivery_token');
        localStorage.removeItem('iw_delivery_user');
        setDeliveryUser(null);
        setCurrentPage('login');
        window.history.pushState({}, '', '/login');
        return;
      }
      try {
        const user = JSON.parse(userStr) as DeliveryUser;
        const role = user.role;

        const routeToDesk = (targetPage: Page, path: string) => {
          setCurrentPage(targetPage);
          window.history.pushState({}, '', path);
        };

        const getAuthorizedFallback = (r?: string): { page: Page; path: string } => {
          switch (r) {
            case 'admin':
              return { page: 'admin', path: '/admin' };
            case 'fleet_manager':
              return { page: 'fleet', path: '/fleet' };
            case 'dispatcher':
              return { page: 'dispatch', path: '/dispatch' };
            case 'support':
              return { page: 'support-desk', path: '/support-desk' };
            case 'delivery_partner':
            case 'pilot':
              return { page: 'delivery-app', path: '/delivery-app' };
            default:
              return { page: 'shop', path: '/store' };
          }
        };

        const fallback = getAuthorizedFallback(role);

        if (currentPage === 'admin' && role !== 'admin') {
          routeToDesk(fallback.page, fallback.path);
        } else if (currentPage === 'delivery-tracking' && !['admin', 'dispatcher', 'fleet_manager'].includes(role)) {
          routeToDesk(fallback.page, fallback.path);
        } else if ((currentPage === 'dispatch' || currentPage === 'drone-dispatch') && !['dispatcher', 'admin', 'fleet_manager'].includes(role)) {
          routeToDesk(fallback.page, fallback.path);
        } else if (currentPage === 'fleet' && !['fleet_manager', 'admin'].includes(role)) {
          routeToDesk(fallback.page, fallback.path);
        } else if (currentPage === 'support-desk' && !['support', 'admin', 'fleet_manager'].includes(role)) {
          routeToDesk(fallback.page, fallback.path);
        }
      } catch {
        setCurrentPage('login');
        window.history.pushState({}, '', '/login');
      }
    }
  }, [currentPage, deliveryUser]);

  // Browser back/forward
  useEffect(() => {
    const handlePopState = () => setCurrentPage(getInitialPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Old GCS session restore
  useEffect(() => {
    const token = localStorage.getItem('iw_token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.user) setCurrentUser(data.user); })
        .catch(() => localStorage.removeItem('iw_token'));
    }
  }, []);

  const handleNavigate = (page: string) => {
    if (page === 'store' || page === 'shop' || page === 'cart') {
      const token = localStorage.getItem('iw_delivery_token');
      const userStr = localStorage.getItem('iw_delivery_user');
      if (!token || !userStr || !deliveryUser) {
        setCurrentPage('login');
        window.history.pushState({}, '', '/login');
        return;
      }
      setCurrentPage(page as Page);
      return;
    }
    setCurrentPage(page as Page);
  };

  const handleDeliveryLogin = (user: DeliveryUser, token: string) => {
    setDeliveryUser(user);
    localStorage.setItem('iw_delivery_token', token);
    localStorage.setItem('iw_delivery_user', JSON.stringify(user));
  };

  const handleDeliveryLogout = () => {
    setDeliveryUser(null);
    localStorage.removeItem('iw_delivery_token');
    localStorage.removeItem('iw_delivery_user');
    const protectedPages: Page[] = ['admin', 'fleet', 'support-desk', 'dispatch', 'drone-dispatch', 'delivery-tracking', 'shop', 'store'];
    if (protectedPages.includes(currentPage)) {
      setCurrentPage('login');
      window.history.pushState({}, '', '/login');
    }
  };

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('iw_token', token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iw_token');
  };

  const handleOpenDemoBooking = (droneName?: string) => {
    setSelectedDroneForDemo(droneName);
    setIsDemoModalOpen(true);
  };



  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4fb] text-[#171222] font-sans antialiased w-full max-w-full">
      <SEOHead currentPage={currentPage} />
      {currentPage !== 'login' && (
        <Header
          currentUser={deliveryUser}
          onOpenCommandCenter={() => setIsCommandCenterOpen(true)}
          onOpenDemoBooking={() => handleOpenDemoBooking()}
          onNavigate={handleNavigate}
          onOpenAuth={() => { handleNavigate('login'); window.history.pushState({}, '', '/login'); }}
          onLogout={handleDeliveryLogout}
        />
      )}

      <main className="flex-1 w-full max-w-full min-w-0">
        {currentPage === 'login' ? (
          <LoginPage onNavigate={handleNavigate} onSuccess={handleDeliveryLogin} />
        ) : currentPage === 'admin' ? (
          <AdminDashboardPage currentUser={deliveryUser} onUpdateUser={setDeliveryUser} onNavigate={handleNavigate} onLogout={handleDeliveryLogout} />
        ) : currentPage === 'fleet' ? (
          <FleetManagerPage currentUser={deliveryUser} onNavigate={handleNavigate} onLogout={handleDeliveryLogout} />
        ) : currentPage === 'support-desk' ? (
          <SupportDeskPage currentUser={deliveryUser} onNavigate={handleNavigate} onLogout={handleDeliveryLogout} />
        ) : (currentPage === 'shop' || currentPage === 'store' || currentPage === 'cart') ? (
          <StorePage key={currentPage + (typeof window !== 'undefined' ? window.location.pathname : '')} currentUser={deliveryUser} onNavigate={handleNavigate} />
        ) : currentPage === 'profile' ? (
          <ProfilePage onNavigate={handleNavigate} currentUser={deliveryUser} onUpdateUser={setDeliveryUser} />
        ) : currentPage === 'orders' ? (
          <ProfilePage onNavigate={handleNavigate} currentUser={deliveryUser} onUpdateUser={setDeliveryUser} initialTab="orders" />
        ) : currentPage === 'platform' ? (
          <PlatformPage onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'command-center' ? (
          <CommandCenterPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'gcs' ? (
          <GcsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'downloads' ? (
          <DownloadsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'versions' ? (
          <VersionsPage onNavigate={handleNavigate} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'track' ? (
          <TrackOrderPage onNavigate={handleNavigate} />
        ) : (currentPage === 'dispatch' || currentPage === 'drone-dispatch') ? (
          <DroneDispatchModule
            currentUser={deliveryUser}
            onNavigate={handleNavigate}
            onLogout={handleDeliveryLogout}
          />
        ) : currentPage === 'delivery-tracking' ? (
          <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <DeliveryTrackingModule currentUser={deliveryUser} onNavigate={handleNavigate} />
          </div>
        ) : currentPage === 'delivery-app' ? (
          <DeliveryAppPage
            user={deliveryUser}
            onLogout={handleDeliveryLogout}
            onNavigate={handleNavigate}
          />
        ) : currentPage === 'support' ? (
          <SupportPage onNavigate={handleNavigate} currentUser={deliveryUser} />
        ) : currentPage === 'docs' ? (
          <DocsPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'company' ? (
          <CompanyPage onNavigate={handleNavigate} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} />
        ) : currentPage === 'feedback' ? (
          <FeedbackPage onNavigate={handleNavigate} currentUser={deliveryUser} />
        ) : currentPage === 'legal' ? (
          <LegalPage onNavigate={handleNavigate} section={window.location.hash.replace('#', '') || undefined} />
        ) : (
          <>
            <Hero currentUser={deliveryUser} onOpenCommandCenter={() => setIsCommandCenterOpen(true)} onOpenDemoBooking={() => handleOpenDemoBooking()} onNavigate={handleNavigate} />
          </>
        )}
      </main>

      {currentPage !== 'login' && (
        <Footer onNavigate={handleNavigate} currentUser={deliveryUser} />
      )}

      <CommandCenterModal isOpen={isCommandCenterOpen} onClose={() => setIsCommandCenterOpen(false)} currentUser={currentUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />
      <DemoBookingModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} preselectedDrone={selectedDroneForDemo} />
      <Chatbot onNavigate={handleNavigate} />
    </div>
  );
};

export default App;

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
import { Chatbot } from './components/Chatbot';
import { UserProfile, DeliveryUser } from './types';

type Page = 'home' | 'platform' | 'command-center' | 'gcs' | 'downloads' | 'versions' | 'track' | 'dispatch' | 'drone-dispatch' | 'delivery-tracking' | 'login' | 'profile' | 'orders' | 'support' | 'docs' | 'company' | 'feedback' | 'legal' | 'admin' | 'fleet' | 'support-desk' | 'shop' | 'store';

const getInitialPage = (): Page => {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname;
  if (p.includes('/admin')) return 'admin';
  if (p.includes('/fleet')) return 'fleet';
  if (p.includes('/support-desk') || p.includes('/support_desk')) return 'support-desk';
  if (p.includes('/drone-dispatch')) return 'drone-dispatch';
  if (p.includes('/delivery-tracking')) return 'delivery-tracking';
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

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedDroneForDemo, setSelectedDroneForDemo] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  // Restore delivery session on load
  useEffect(() => {
    const token = localStorage.getItem('iw_delivery_token');
    const userStr = localStorage.getItem('iw_delivery_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as DeliveryUser;
        setDeliveryUser(user);
      } catch {}
    }
  }, []);

  // Route Protection & Role Governance for Enterprise Dashboards
  useEffect(() => {
    const protectedPages: Page[] = ['admin', 'fleet', 'support-desk', 'dispatch', 'drone-dispatch', 'delivery-tracking'];
    if (protectedPages.includes(currentPage)) {
      const token = localStorage.getItem('iw_delivery_token');
      const userStr = localStorage.getItem('iw_delivery_user');
      if (!token || !userStr) {
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

        if (currentPage === 'admin' && role !== 'admin') {
          if (role === 'fleet_manager') routeToDesk('fleet', '/fleet');
          else if (role === 'dispatcher') routeToDesk('dispatch', '/dispatch');
          else if (role === 'support') routeToDesk('support-desk', '/support-desk');
          else routeToDesk('login', '/login');
        } else if (currentPage === 'delivery-tracking' && !['admin', 'dispatcher', 'fleet_manager'].includes(role)) {
          if (role === 'support') routeToDesk('support-desk', '/support-desk');
          else routeToDesk('login', '/login');
        } else if ((currentPage === 'dispatch' || currentPage === 'drone-dispatch') && role !== 'dispatcher' && role !== 'admin') {
          if (role === 'fleet_manager') routeToDesk('fleet', '/fleet');
          else if (role === 'support') routeToDesk('support-desk', '/support-desk');
          else routeToDesk('login', '/login');
        } else if (currentPage === 'fleet' && role !== 'fleet_manager' && role !== 'admin') {
          if (role === 'dispatcher') routeToDesk('dispatch', '/dispatch');
          else if (role === 'support') routeToDesk('support-desk', '/support-desk');
          else routeToDesk('login', '/login');
        } else if (currentPage === 'support-desk' && role !== 'support' && role !== 'admin') {
          if (role === 'fleet_manager') routeToDesk('fleet', '/fleet');
          else if (role === 'dispatcher') routeToDesk('dispatch', '/dispatch');
          else routeToDesk('login', '/login');
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
    if (page === 'store' || page === 'shop') {
      setCurrentPage('shop');
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
    const protectedPages: Page[] = ['admin', 'fleet', 'support-desk', 'dispatch', 'drone-dispatch', 'delivery-tracking'];
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
        ) : currentPage === 'shop' ? (
          <StorePage currentUser={deliveryUser} onNavigate={handleNavigate} />
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
          <DeliveryTrackingModule currentUser={deliveryUser} onNavigate={handleNavigate} />
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

import { useState } from 'react';
import { Header } from './components/Header';
import { CarCardList } from './components/CarCardList';
import { ComparisonControls } from './components/ComparisonControls';
import { ComparisonDashboard } from './components/ComparisonDashboard';
import { Footer } from './components/Footer';
import { GlobalSettingsPanel } from './components/GlobalSettingsPanel';
import { IntroModal } from './components/IntroModal';
import { MobileNav, type MobileView } from './components/MobileNav';
import { ResetAllButton } from './components/ui/ResetAllButton';
import { useApp } from './state/AppContext';
import { useCarCalculations } from './hooks/useCarCalculations';
import { useIsDesktop } from './hooks/useMediaQuery';
import { hasSeenIntro, markIntroSeen } from './utils/introStorage';

function App() {
  const { state } = useApp();
  const results = useCarCalculations(state.cars, state.comparisonYears, state.globalDefaults);
  const isDesktop = useIsDesktop();
  // Returning users with a comparison ready land on their results.
  const [view, setView] = useState<MobileView>(state.cars.length >= 2 ? 'compare' : 'cars');

  const [introOpen, setIntroOpen] = useState(() => !hasSeenIntro());

  function closeIntro() {
    markIntroSeen();
    setIntroOpen(false);
  }

  function changeView(next: MobileView) {
    setView(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col px-[env(safe-area-inset-left)] touch-manipulation">
      <Header onShowIntro={() => setIntroOpen(true)} />
      {isDesktop && <GlobalSettingsPanel />}

      <main className="flex-1 flex flex-col gap-8 pb-24 md:py-6">
        {/* Zone 1: Car Configuration. Kept mounted on phones so the open car survives tab switches. */}
        <section className={isDesktop || view === 'cars' ? '' : 'hidden'}>
          <CarCardList />
        </section>

        {/* Zone 2: Comparison Dashboard */}
        {(isDesktop || view === 'compare') && (
          <section className="md:px-6">
            {!isDesktop && (
              <div className="sticky top-14 z-10 bg-gray-50 border-b border-gray-200 px-4 py-1 mb-4">
                <ComparisonControls />
              </div>
            )}
            <div className="px-4 md:px-0">
              <ComparisonDashboard
                results={results}
                years={state.comparisonYears}
                onAddCars={isDesktop ? undefined : () => changeView('cars')}
              />
            </div>
          </section>
        )}

        {!isDesktop && view === 'settings' && (
          <section className="flex flex-col gap-4 px-4 pt-4">
            <GlobalSettingsPanel />
            <button
              onClick={() => setIntroOpen(true)}
              className="min-h-11 px-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg"
            >
              How this app works
            </button>
            <ResetAllButton className="min-h-11 bg-white text-sm" />
            <Footer />
          </section>
        )}
      </main>

      {isDesktop ? <Footer /> : <MobileNav view={view} onChange={changeView} />}
      {introOpen && <IntroModal onClose={closeIntro} />}
    </div>
  );
}

export default App;

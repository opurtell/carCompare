import { Header } from './components/Header';
import { CarCardList } from './components/CarCardList';
import { ComparisonDashboard } from './components/ComparisonDashboard';
import { Footer } from './components/Footer';
import { useApp } from './state/AppContext';
import { useCarCalculations } from './hooks/useCarCalculations';

function App() {
  const { state } = useApp();
  const results = useCarCalculations(state.cars, state.comparisonYears);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col gap-8 py-6">
        {/* Zone 1: Car Configuration */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 px-6 mb-3">Configure Cars</h2>
          <CarCardList />
        </section>

        {/* Zone 2: Comparison Dashboard */}
        <section className="px-6">
          <ComparisonDashboard results={results} years={state.comparisonYears} />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { CarCard } from './CarCard';
import { LibraryModal } from './LibraryModal';
import { AddCarModal } from './AddCarModal';
import { isAiAvailable } from '../api/carResearchApi';
import { getCarColor } from '../utils/colors';

export function CarCardList() {
  const { state, updateCar, removeCar } = useApp();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [addCarModal, setAddCarModal] = useState<'choose' | 'input' | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [activeCarId, setActiveCarId] = useState<string | null>(null);
  const [prevCarCount, setPrevCarCount] = useState(state.cars.length);

  // Phones show one car at a time: jump to a newly added car however it was added.
  if (state.cars.length !== prevCarCount) {
    setPrevCarCount(state.cars.length);
    if (state.cars.length > prevCarCount) setActiveCarId(state.cars[state.cars.length - 1].id);
  }
  const visibleCarId = state.cars.some(c => c.id === activeCarId) ? activeCarId : state.cars[0]?.id;
  // Add Car asks first: pick from the list, or enter details yourself.
  const openAddCar = () => setAddCarModal('choose');

  useEffect(() => {
    const controller = new AbortController();
    isAiAvailable(controller.signal).then(available => {
      if (!controller.signal.aborted) setAiAvailable(available);
    });
    return () => controller.abort();
  }, []);

  return (
    <>
      {/* Heading with Library and AI Add buttons */}
      <div className="flex items-center justify-between gap-2 px-4 md:pl-6 pt-3 md:pt-0 pb-2">
        <h2 className="text-lg font-semibold text-gray-700">Configure Cars</h2>
        <div className="flex gap-2">
        <button
          onClick={() => setAddCarModal('input')}
          disabled={state.cars.length >= 5}
          className="text-xs px-3 py-1.5 min-h-10 md:min-h-0 whitespace-nowrap rounded-md bg-purple-50 text-purple-700
                     hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5
                     disabled:opacity-40 disabled:cursor-not-allowed"
          title={state.cars.length >= 5 ? 'Comparison is full (5 cars max)' : 'Pick a popular car, or look one up'}
        >
          <span>🔎</span>
          <span>Pick a car</span>
        </button>
        <button
          onClick={() => setLibraryOpen(true)}
          className="text-xs px-3 py-1.5 min-h-10 md:min-h-0 whitespace-nowrap rounded-md bg-gray-100 text-gray-600
                     hover:bg-gray-200 border border-gray-200 flex items-center gap-1.5"
        >
          <span>📚</span>
          <span>Library</span>
          {state.library.length > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs leading-none">
              {state.library.length}
            </span>
          )}
        </button>
        </div>
      </div>

      {/* Phone car switcher */}
      {state.cars.length > 0 && (
        <div className="md:hidden sticky top-14 z-10 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto px-4 py-2">
            {state.cars.map((car, index) => {
              const active = car.id === visibleCarId;
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => setActiveCarId(car.id)}
                  aria-pressed={active}
                  className={`min-h-10 max-w-[10rem] shrink-0 flex items-center gap-2 px-3 rounded-full border-2
                              text-sm font-medium bg-white ${active ? 'text-gray-800' : 'text-gray-500'}`}
                  style={{
                    borderColor: active ? getCarColor(index).hex : '#e5e7eb',
                    backgroundColor: active ? getCarColor(index).bg : undefined,
                  }}
                >
                  <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCarColor(index).hex }} />
                  <span className="truncate">{car.name || `Car ${index + 1}`}</span>
                </button>
              );
            })}
            {state.cars.length < 5 && (
              <button
                type="button"
                onClick={openAddCar}
                className="min-h-10 shrink-0 px-3 rounded-full border-2 border-dashed border-gray-300
                           text-sm font-medium text-gray-500"
              >
                + Add
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4 px-4 pt-1 md:pt-0">
        {state.cars.map((car, index) => (
          <CarCard
            key={car.id}
            car={car}
            index={index}
            isActive={car.id === visibleCarId}
            comparisonYears={state.comparisonYears}
            globalDefaults={state.globalDefaults}
            onUpdate={updateCar}
            onRemove={removeCar}
          />
        ))}

        {state.cars.length < 5 && (
          <button
            onClick={openAddCar}
            className={`${state.cars.length === 0 ? 'flex' : 'hidden'} md:flex w-full md:w-80 shrink-0 rounded-xl
                       border-2 border-dashed border-gray-300
                       flex-col items-center justify-center gap-2 text-gray-400
                       hover:border-blue-400 hover:text-blue-500 transition-colors
                       min-h-[200px] cursor-pointer`}
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium">Add Car</span>
          </button>
        )}
      </div>

      {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} />}
      {addCarModal && (
        <AddCarModal startAt={addCarModal} aiAvailable={aiAvailable} onClose={() => setAddCarModal(null)} />
      )}
    </>
  );
}

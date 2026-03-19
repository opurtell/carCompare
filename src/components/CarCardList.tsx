import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { CarCard } from './CarCard';
import { createDefaultCarConfig } from '../data/defaults';
import { LibraryModal } from './LibraryModal';
import { AddCarModal } from './AddCarModal';

export function CarCardList() {
  const { state, addCar, updateCar, removeCar } = useApp();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);

  return (
    <>
      {/* Library and AI Add button row */}
      <div className="flex justify-end px-4 pb-2 gap-2">
        <button
          onClick={() => setAddCarModalOpen(true)}
          disabled={state.cars.length >= 5}
          className="text-xs px-3 py-1.5 rounded-md bg-purple-50 text-purple-700
                     hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5
                     disabled:opacity-40 disabled:cursor-not-allowed"
          title={state.cars.length >= 5 ? 'Comparison is full (5 cars max)' : 'AI-powered car research'}
        >
          <span>✨</span>
          <span>AI Add</span>
        </button>
        <button
          onClick={() => setLibraryOpen(true)}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600
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

      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {state.cars.map((car, index) => (
          <CarCard
            key={car.id}
            car={car}
            index={index}
            comparisonYears={state.comparisonYears}
            globalDefaults={state.globalDefaults}
            onUpdate={updateCar}
            onRemove={removeCar}
          />
        ))}

        {state.cars.length < 5 && (
          <button
            onClick={() => addCar(createDefaultCarConfig(state.cars.length === 0 ? 'ev' : 'petrol'))}
            className="w-80 shrink-0 rounded-xl border-2 border-dashed border-gray-300
                       flex flex-col items-center justify-center gap-2 text-gray-400
                       hover:border-blue-400 hover:text-blue-500 transition-colors
                       min-h-[200px] cursor-pointer"
          >
            <span className="text-4xl">+</span>
            <span className="text-sm font-medium">Add Car</span>
          </button>
        )}
      </div>

      {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} />}
      {addCarModalOpen && <AddCarModal onClose={() => setAddCarModalOpen(false)} />}
    </>
  );
}

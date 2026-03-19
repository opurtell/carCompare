import { useApp } from '../state/AppContext';
import { CarCard } from './CarCard';
import { createDefaultCarConfig } from '../data/defaults';

export function CarCardList() {
  const { state, addCar, updateCar, removeCar } = useApp();

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {state.cars.map((car, index) => (
        <CarCard
          key={car.id}
          car={car}
          index={index}
          comparisonYears={state.comparisonYears}
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
  );
}

import { useState } from 'react';
import { getIntroSteps } from '../data/introSteps';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Modal } from './ui/Modal';

/** Short walkthrough. `App` decides when it shows and records the dismissal. */
export function IntroModal({ onClose }: { onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const [index, setIndex] = useState(0);
  const steps = getIntroSteps(isDesktop);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <Modal
      title={step.title}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200">
          <span className="text-xs text-gray-400">
            {index + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="min-h-11 md:min-h-9 px-4 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 md:min-h-9 px-4 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? onClose : () => setIndex(index + 1)}
              className="min-h-11 md:min-h-9 px-5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      }
    >
      <ul className="list-disc pl-5 md:min-h-60 flex flex-col gap-3 text-sm leading-relaxed text-gray-600">
        {step.points.map(point => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </Modal>
  );
}

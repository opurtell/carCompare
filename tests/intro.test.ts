import { afterEach, describe, expect, it, vi } from 'vitest';
import { getIntroSteps } from '../src/data/introSteps';
import { INTRO_SEEN_KEY, hasSeenIntro, markIntroSeen } from '../src/utils/introStorage';
import { STORAGE_KEY } from '../src/hooks/useLocalStorage';

function stubStorage() {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  });
}

function stubBrokenStorage() {
  const fail = () => {
    throw new Error('storage unavailable');
  };
  vi.stubGlobal('localStorage', { getItem: fail, setItem: fail });
}

afterEach(() => vi.unstubAllGlobals());

describe('intro dismissal', () => {
  it('is unseen until it is marked', () => {
    stubStorage();
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });

  it('is stored apart from the app state that Reset All replaces', () => {
    expect(INTRO_SEEN_KEY).not.toBe(STORAGE_KEY);
  });

  it('stays hidden when storage is unavailable', () => {
    stubBrokenStorage();
    expect(hasSeenIntro()).toBe(true);
    expect(() => markIntroSeen()).not.toThrow();
  });
});

describe('intro steps', () => {
  const allText = (isDesktop: boolean) =>
    getIntroSteps(isDesktop).flatMap(step => [step.title, ...step.points]).join(' ');

  it('has the same steps on both layouts', () => {
    expect(getIntroSteps(true).map(s => s.title)).toEqual(getIntroSteps(false).map(s => s.title));
  });

  it('points phones at the tabs', () => {
    expect(allText(false)).toContain('the Settings tab');
    expect(allText(false)).toContain('the Compare tab');
  });

  it('never mentions tabs on desktop, which has none', () => {
    expect(allText(true)).not.toMatch(/\btabs?\b/i);
  });
});

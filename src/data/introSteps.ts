export interface IntroStep {
  title: string;
  points: string[];
}

/** Wording differs by layout: phones use the bottom tabs, desktop shows everything on one page. */
export function getIntroSteps(isDesktop: boolean): IntroStep[] {
  const globalDefaults = isDesktop ? 'the Global Defaults bar at the top' : 'the Settings tab';

  return [
    {
      title: 'See what a car really costs',
      points: [
        'Compare up to 5 cars over 1 to 10 years, including purchase, stamp duty, fuel, servicing, insurance, rego, CTP and loan interest.',
        'Pick a car fills in a popular model for you: price, fuel use, CO₂, weight and servicing, with links to where each figure came from.',
        'Not in the list? When the AI service is available, Pick a car can look it up on the web. Check what it finds, especially insurance.',
        isDesktop
          ? 'Or click Add Car for a card with typical values, then type in your own figures.'
          : 'Or tap Add Car on the Cars tab for a card with typical values, then open each section to type in your own figures.',
        'Results are ACT-focused estimates, not quotes.',
      ],
    },
    {
      title: 'Your cars and the Library',
      points: [
        isDesktop
          ? 'The cards on screen are your current comparison, up to 5 cars.'
          : 'The cars on the Cars tab are your current comparison, up to 5 cars. Tap a name in the row at the top to switch between them.',
        'The Library is a separate shelf. Save to library keeps a copy of a car, and you can add that copy to a comparison at any time.',
        'Changes to a car stay out of the Library until you choose Update library entry. Removing a car from the comparison leaves its Library copy alone.',
      ],
    },
    {
      title: 'Global defaults and per-car overrides',
      points: [
        `Petrol price, electricity price and annual km are set once in ${globalDefaults} and apply to every car.`,
        'Change one of those on a single car and only that car changes. Reset to global links it back up.',
        'Stamp duty, rego and CTP are worked out from the current ACT rules, using the car’s CO₂ and weight. Type your own figure to override one, and use Reset to go back to the calculated value.',
      ],
    },
    {
      title: 'Reading the results',
      points: [
        isDesktop
          ? 'Results sit below the cars. Compare over, in the header, sets the number of years.'
          : 'Results are on the Compare tab. Compare over, at the top, sets the number of years.',
        'Depreciation on shows net cost: stamp duty, running costs and the value the car loses, as if you sold it at the end. Cars lose most in the first year, so each car has a first-year rate and a rate for each year after.',
        'Depreciation off shows cash spent: purchase price, stamp duty and running costs, with no credit for resale value.',
        'The switch changes every total, chart and ranking, so the cheapest car can change too.',
      ],
    },
    {
      title: 'Your data stays in this browser',
      points: [
        'Everything saves automatically in this browser. There is no account, so it won’t follow you to another device.',
        'Saved figures stay as they are. If the app’s default changes later, such as the petrol price, yours won’t update, so check them now and then.',
        `Reset All${isDesktop ? '' : ', in Settings,'} wipes your cars, settings and Library, and can’t be undone.`,
      ],
    },
  ];
}

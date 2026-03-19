# Design: CarCard Dual Cost Display

**Date:** 2025-03-19
**Status:** Under Review

## Context

The CarCard component currently displays a single prominent cost figure (`Total Cost`) in the summary badge at the bottom of each card. Users have requested displaying two equally prominent figures to make costs clearer:

1. **Total Cost** - the total outlay (upfront + ongoing costs)
2. **Net at Resale** - the overall financial position at resale (remaining value minus total costs)

## Problem

Currently, the Net at Resale is only visible in the collapsible breakdown section. Users want both key metrics visible at a glance without expanding.

## Solution

Replace the single-number summary badge with a stacked dual-number display.

## Design

### Layout

```
┌─────────────────────────┐
│                         │
│   [Car Details]         │
│                         │
├─────────────────────────┤
│   Total Cost: $45,000   │
│  Net at Resale: -$5,000  │
└─────────────────────────┘
```

### Styling

| Element | Style |
|---------|-------|
| Labels | 0.875rem, gray (text-gray-600) |
| Values | 1.5rem, bold (font-bold) |
| Total Cost value | Car's assigned color |
| Net at Resale value | Red (negative, text-red-600), Green (positive, text-green-600), or car color (zero) |
| Badge background | Car's assigned background color with subtle border |
| Alignment | Center-aligned (text-center) |
| Layout | Vertical stack with 4px gap (gap-1) |
| Badge padding | px-4 py-4 (increased from py-3 to accommodate two rows) |
| Card width | Fixed at w-80 (320px), responsive on smaller screens via flex-wrap |

**Overflow Handling:**
- Numbers exceeding badge width should use `truncate` or scale font slightly
- Current formatCurrency() uses comma-separated thousands, which keeps width reasonable

**Accessibility:**
- Add `aria-label` to the badge describing both values
- Net at Resale color indication should be supplemented by text for screen readers (e.g., "Net at Resale: negative $5,000")
- Use semantic HTML elements (span/div with appropriate roles)

**Breakdown Button:**
- Positioned below the second value (Net at Resale)
- Maintains current small text size and styling (text-sm with dropdown arrow)

### Calculations

- **Total Cost**: `result.totalCostOfOwnership` (existing value)
  - Purchase price + stamp duty + all running costs (fuel, servicing, insurance, CTP, registration, loan interest)

- **Net at Resale**: `remainingValue - totalCostOfOwnership`
  - Uses existing `netPositionAtResale` calculation from the breakdown
  - `remainingValue` = `result.yearlyBreakdowns[comparisonYears - 1].vehicleValue`

### Files to Modify

- `src/components/CarCard.tsx` - Main changes to summary badge section
- `src/types/car.ts` - No changes (data already available)
- `src/calculations/costEngine.ts` - No changes (calculations already available)

## Implementation Notes

- No new data fetching or API calls required
- All values are already computed and available in `CarCalculationResult`

**Breakdown Section Update:**
- Update `CostBreakdownDropdown` Net at Resale color logic to match the new badge styling
- Currently always red; should now be red (negative), green (positive), or car color (zero)
- This ensures consistency between the summary badge and expanded breakdown

**Edge Cases:**
- `comparisonYears = 0`: Handle gracefully - Net at Resale equals Total Cost (no depreciation)
- Empty `yearlyBreakdowns`: Show fallback or prevent rendering
- Very large numbers: Overflow handling as described in styling section

**Responsive Behavior:**
- Current card width is fixed at w-80 (320px)
- On smaller screens, the car list wraps via flex layout
- The dual-row badge maintains its fixed width within the card

## Verification

Test with:
- Multiple cars (2-4) to verify color consistency across cards
- Negative net position scenarios (typical case - car loses more than retained value)
- Zero net position scenarios (edge case)
- Positive net position scenarios (rare - appreciating classic car scenario)
- Different comparison years (1, 3, 5, 10 years)
- Very high cost scenarios (> $100k) to verify overflow handling
- Small screen viewport to verify responsive behavior

**Color Logic Verification:**
- Confirm negative Net at Resale shows red
- Confirm positive Net at Resale shows green
- Confirm zero Net at Resale shows car's color

**Consistency Check:**
- Badge Net at Resale color matches breakdown Net at Resale color

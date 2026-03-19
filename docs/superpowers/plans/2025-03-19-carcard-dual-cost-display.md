# CarCard Dual Cost Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the CarCard component to display two prominent cost figures (Total Cost and Net at Resale) in the summary badge instead of one.

**Architecture:** Replace the single-number summary badge with a stacked dual-number display. Both values are already computed and available in `CarCalculationResult`. No data fetching or engine changes required. Update both the summary badge and the breakdown section for color consistency.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4

---

## File Structure

| File | Changes | Responsibility |
|------|---------|----------------|
| `src/components/CarCard.tsx` | Modify | Summary badge layout, breakdown color logic |

---

## Implementation Plan

### Task 1: Update Summary Badge to Display Dual Numbers

**Files:**
- Modify: `src/components/CarCard.tsx:377-433`

- [ ] **Step 1: Update badge container padding and add aria-label**

Replace line 378-380 with updated badge container:

```tsx
      <div
        className="px-4 py-4 border-t rounded-b-lg"
        style={{ backgroundColor: color.bg, borderColor: color.hex + '33' }}
        aria-label={`${comparisonYears} year costs: Total Cost ${formatCurrency(result.totalCostOfOwnership)}, Net at Resale ${netPositionAtResale < 0 ? 'negative' : netPositionAtResale > 0 ? 'positive' : 'zero'} ${formatCurrency(netPositionAtResale)}`}
      >
```

Note: The aria-label now includes "negative"/"positive"/"zero" text for screen readers, as required by the spec.

- [ ] **Step 2: Replace summary badge content with dual-number stack**

Replace lines 382-388 (the inner `text-center` div) with dual-number layout:

```tsx
        <div className="space-y-1 text-center">
          {/* Total Cost */}
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-xs text-gray-600">Total Cost:</span>
            <span className="text-xl font-bold" style={{ color: color.hex }}>
              {formatCurrency(result.totalCostOfOwnership)}
            </span>
          </div>

          {/* Net at Resale */}
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-xs text-gray-600">Net at Resale:</span>
            <span
              className="text-xl font-bold"
              style={{
                color:
                  netPositionAtResale < 0
                    ? '#dc2626' // red-600
                    : netPositionAtResale > 0
                      ? '#16a34a' // green-600
                      : color.hex,
              }}
            >
              {formatCurrency(netPositionAtResale)}
            </span>
          </div>
        </div>
```

- [ ] **Step 3: Update breakdown button styling and add aria-expanded**

Replace line 393 `mt-1` with `mt-2` and add `aria-expanded` attribute:

```tsx
          className="w-full flex items-center justify-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700"
          aria-expanded={costBreakdownOpen}
```

Note: The margin change from `mt-1` to `mt-2` provides more spacing between the dual numbers and the button.

- [ ] **Step 4: Add id to breakdown section for accessibility**

Replace line 405 with breakdown section that includes the id:

```tsx
        {costBreakdownOpen && (
          <div id={`breakdown-${car.id}`} className="mt-2 space-y-1 text-sm">
```

- [ ] **Step 5: Update breakdown section Net at Resale color logic**

Replace line 429 with conditional color logic:

```tsx
              <span
                className="font-medium"
                style={{
                  color:
                    netPositionAtResale < 0
                      ? '#dc2626' // red-600
                      : netPositionAtResale > 0
                        ? '#16a34a' // green-600
                        : undefined, // Use default text color
                }}
              >
                {formatCurrency(netPositionAtResale)}
              </span>
```

- [ ] **Step 6: Verify the changes**

Run: `npm run dev`
Expected: Dev server starts successfully

- [ ] **Step 7: Manual visual verification**

Open browser to `http://localhost:5173`
Expected:
- Two numbers visible in each CarCard summary badge
- Total Cost in car's color
- Net at Resale in red (negative), green (positive), or car color (zero)
- Breakdown button positioned below both numbers
- No visual overflow or layout issues

- [ ] **Step 8: Verify breakdown section consistency**

Click "Breakdown" on a car card
Expected:
- Net at Resale in breakdown matches badge color
- Breakdown section still displays all values correctly

- [ ] **Step 9: Type-check the changes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add src/components/CarCard.tsx
git commit -m "$(cat <<'EOF'
feat(card): display Total Cost and Net at Resale prominently

Replace single-number summary badge with stacked dual-number display
showing both Total Cost and Net at Resale for better cost clarity.

- Update badge layout to show two values vertically
- Add conditional color logic for Net at Resale (red/green/neutral)
- Update breakdown section Net at Resale color to match badge
- Add aria-label with positive/negative/zero text for accessibility
- Add aria-expanded and id for proper ARIA structure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification Checklist

After implementation, verify:

### Visual Verification
- [ ] Multiple cars (2-4) display with color consistency
- [ ] Negative Net at Resale shows red (typical case)
- [ ] Positive Net at Resale shows green (test with appreciating asset scenario)
- [ ] Zero Net at Resale shows car's color (neutral case)
- [ ] Different comparison years (1, 3, 5, 10) work correctly
- [ ] Large numbers (> $100k) don't overflow or break layout

### Consistency Verification
- [ ] Badge Net at Resale color matches breakdown Net at Resale color
- [ ] Breakdown section still expands/collapses correctly

### Edge Cases
- [ ] `comparisonYears = 0` displays correctly (Net at Resale equals Total Cost)
- [ ] Empty `yearlyBreakdowns` handled gracefully (though unlikely in practice)

### Accessibility Verification
- [ ] Test with screen reader: aria-label is read correctly including "negative"/"positive"/"zero"
- [ ] aria-expanded state changes correctly when breakdown is toggled
- [ ] The breakdown section id matches the button's aria-controls reference

### Technical Verification
- [ ] Type checking passes with no errors (`npx tsc --noEmit`)
- [ ] Dev server runs without errors (`npm run dev`)

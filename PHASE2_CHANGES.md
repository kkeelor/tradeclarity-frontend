# Phase 2: Layout Improvements - Implementation Checklist

## Changes to Implement:

### 1. Dashboard Responsive Grid (`app/analyze/components/Dashboard.js`)
- [ ] Fix "What's Next" section grid - change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for mobile stacking
- [ ] Ensure exchange cards grid is responsive (check if already done)
- [ ] Ensure CSV file cards grid is responsive (check if already done)
- [ ] Optimize spacing for mobile (`gap-4 md:gap-6` already good)

### 2. Analytics View Improvements (`app/analyze/components/AnalyticsView.js`)
- [ ] Hero Section QuickStat grid - change `grid-cols-2 sm:grid-cols-2` to `grid-cols-2` or make it truly responsive
- [ ] Hero section layout - ensure `flex-col lg:flex-row` works properly on mobile
- [ ] Make tabs horizontally scrollable on mobile - add `overflow-x-auto scrollbar-hide` to tab container
- [ ] Verify all charts use ResponsiveContainer (check existing charts)
- [ ] Hero section spacing - optimize padding for mobile (`p-6 sm:p-8 lg:p-10`)

### 3. Modal Responsiveness (`app/components/Modal.js`)
- [ ] Change padding from `p-8` to `p-4 md:p-8` for mobile
- [ ] Make title responsive - change `text-2xl` to `text-xl md:text-2xl`
- [ ] Ensure modal fits screen - add `max-h-[90vh] overflow-y-auto` if needed
- [ ] ModalDescription text size - change `text-lg` to `text-base md:text-lg`

### 4. Additional Responsive Fixes
- [ ] Check Dashboard greeting section for mobile responsiveness
- [ ] Ensure all card grids stack properly on mobile
- [ ] Verify touch targets are at least 44x44px

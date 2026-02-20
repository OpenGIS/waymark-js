# CyclOSM Styling Migration — Testing Checklist

## Pre-Deployment Testing

### 1. Build Verification
- [x] `npm run build` completes without errors
- [ ] No TypeScript/linting warnings
- [ ] Output files created in `dist/`

### 2. Browser Testing

#### A. Initial Load & Default Queries
- [ ] Load the OSM Highlights app in a fresh browser (or incognito mode)
- [ ] Verify **8 default queries** appear in the highlights panel:
  1. Dedicated Cycle Tracks (deep blue, 4px)
  2. Designated Shared Paths (medium blue, 3px, solid)
  3. On-Street Cycle Lanes (medium blue, 2px, dashed)
  4. Bicycle Friendly Paths (teal, 3px)
  5. Unpaved / MTB Tracks (brown, 3px, dashed)
  6. Bike Shops & Services (green, emoji 🚲)
  7. Bike Parking (yellow, emoji 🅿️)
  8. Bike Rental (red, emoji 🔑)

#### B. Visual Styling Verification
Test at a suitable zoom level (zoom 12–16 for route infrastructure):

- [ ] **Dedicated Cycle Tracks**: Appear as **solid deep blue lines (4px)**
- [ ] **Designated Shared Paths**: Appear as **solid medium blue lines (3px)**
- [ ] **On-Street Cycle Lanes**: Appear as **dashed medium blue lines (2px, dash pattern [2,2])**
- [ ] **Bicycle Friendly Paths**: Appear as **solid teal lines (3px)**
- [ ] **Unpaved / MTB Tracks**: Appear as **dashed brown lines (3px, dash pattern [3,3])**

#### C. POI Visibility (zoom 11+)
Zoom to level 11 or higher in an urban area:

- [ ] **Bike Shops**: Appear as **green circles** with 🚲 emoji labels
- [ ] **Bike Parking**: Appear as **yellow circles** with 🅿️ emoji labels
- [ ] **Bike Rental**: Appear as **red circles** with 🔑 emoji labels

#### D. Query Editing & UI
Expand a query card:

- [ ] **Line Width** input appears (number field, 0.5–10 range)
- [ ] **Dash Pattern** input appears (text field, e.g., "2,2")
- [ ] Adjust Line Width and verify immediate map update
- [ ] Enter dash pattern (e.g., "2,2") and verify dashed rendering
- [ ] Clear dash pattern and verify solid line returns
- [ ] Values persist after page reload

#### E. localStorage Management
DevTools → Application → Storage → Local Storage:

- [ ] Key `osm2-queries-version` exists and equals `2`
- [ ] Key `osm2-highlight-queries` contains valid JSON
- [ ] After update, old queries are automatically cleared (if version was outdated)
- [ ] New queries match the CyclOSM definitions

#### F. Filter Logic Validation
Pick a region and verify query filters work correctly:

- [ ] Dedicated Cycle Tracks only match `subclass=cycleway`
- [ ] On-Street Cycle Lanes avoid paths and cycleways (`class≠path`, `subclass≠cycleway`)
- [ ] Designated Shared Paths match paved paths with `bicycle=designated`
- [ ] Bike Friendly Paths show general paths with `bicycle=yes`
- [ ] No unexpected highlighting or filter conflicts

#### G. Toggle & Disable
- [ ] Toggle query enabled/disabled using the checkbox
- [ ] Map highlights update instantly
- [ ] Disabled queries don't render but remain in localStorage

#### H. Custom Queries
- [ ] Create a new custom query (not from defaults)
- [ ] Verify new query has `lineWidth: 3` and `lineDash: null`
- [ ] Edit the line width and dash pattern
- [ ] Verify persistence

### 3. Cross-Browser Testing (Optional)
Test in multiple browsers if possible:

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

### 4. Performance Testing (Optional)
- [ ] With all 8 default queries enabled, pan and zoom the map
- [ ] Verify smooth performance (no jank/lag)
- [ ] Monitor DevTools for memory leaks

### 5. Regression Testing
Ensure previous functionality still works:

- [ ] Condition editor for custom filters
- [ ] Color picker for custom query colors
- [ ] Query duplicate function
- [ ] Query delete function
- [ ] Results list & feature selection

---

## Post-Deployment Monitoring

### User Feedback Points
1. Do the default CyclOSM colors match expectations?
2. Are dashed lines rendering correctly on all devices?
3. Are any filters too narrow or too broad?

### Metrics to Monitor
- localStorage version adoption
- Number of custom queries created vs. defaults used
- Average query edit frequency

### Known Issues / Edge Cases
- **Line-dasharray on fill layers**: Not applied (MapLibre doesn't support it)
- **Mobile touch interactions**: Verify dash pattern input works on touch devices
- **High-DPI displays**: Verify line widths and dashes render correctly

---

## Version Increment Guide

To force cache invalidation (invalidate all cached queries for all users):

1. Open `apps/osm2/composables/useQueries.js`
2. Find the line: `const CURRENT_VERSION = 2;`
3. Change to: `const CURRENT_VERSION = 3;`
4. Deploy

On next user visit:
- App detects version mismatch
- Old queries are deleted from localStorage
- Fresh CyclOSM defaults are loaded
- Version is updated

---

## Rollback Plan

If issues arise:

1. **Revert commits**: `git revert <commit-hash>`
2. **Restore previous build**: Deploy last working version
3. **Manual localStorage reset**: (If needed for testing) `localStorage.removeItem("osm2-highlight-queries")`

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No visual regressions
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Date Tested**: _______________  
**Tested By**: _______________  
**Notes**: _______________

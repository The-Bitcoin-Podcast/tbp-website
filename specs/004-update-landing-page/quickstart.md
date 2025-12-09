# Quickstart: Landing Page Improvements

## Overview
This quickstart validates the landing page improvements by testing the Episodes navigation link and Recent Episodes section display.

## Prerequisites
- Quartz development environment set up
- Node.js 22+ installed
- Repository at `/home/petty/Github/tbp/quartz`
- At least one published episode in `content/episodes/` (not draft)

## Quick Validation (5 minutes)

### Step 1: Start Development Server
```bash
cd /home/petty/Github/tbp/quartz
npm run serve
# Or: npx quartz build --serve
```

**Expected**: Server starts on http://localhost:8080 (or similar)

### Step 2: View Landing Page
1. Open browser to http://localhost:8080
2. Observe the navigation bar

**Expected**: 
- ✅ Navigation includes: Episodes, About, Sponsors, Contact, Guests
- ✅ Episodes link appears first (leftmost on desktop)
- ✅ All links visible and properly styled

**Failure Indicators**:
- ❌ Episodes link missing
- ❌ Only 4 links shown (old behavior)
- ❌ Navigation layout broken

### Step 3: Test Episodes Link
1. Click "Episodes" link in navigation
2. Observe page navigation

**Expected**:
- ✅ Navigates to episodes archive page (URL: /episodes or configured path)
- ✅ Episodes page displays or shows "coming soon" placeholder

**Failure Indicators**:
- ❌ Link does nothing (href="#")
- ❌ 404 error
- ❌ Link missing entirely

### Step 4: Check Recent Episodes Section
1. Return to landing page (home)
2. Scroll to "Recent Episodes" section
3. Observe episode cards

**Expected**:
- ✅ "Recent Episodes" heading visible
- ✅ Episode cards displayed (up to 5)
- ✅ Each card shows:
  - Thumbnail image
  - Episode title
  - Publication date (formatted, e.g., "June 23, 2015")
  - Duration (e.g., "54:01" or "54 min")
  - Description (if available)
  - "Listen →" link
- ✅ "View All Episodes →" link below cards

**Failure Indicators**:
- ❌ "No episodes available yet. Check back soon!" message (when episodes exist)
- ❌ Empty section with no cards
- ❌ JavaScript errors in console

### Step 5: Test Episode Card Links
1. Click "Listen →" on any episode card
2. Observe navigation

**Expected**:
- ✅ Navigates to episode detail page
- ✅ Episode content displays (title, description, video/audio embed)

### Step 6: Test Mobile Navigation
1. Resize browser to mobile width (<768px) OR use mobile device
2. Observe navigation
3. Click hamburger menu (☰)

**Expected**:
- ✅ Hamburger menu button visible
- ✅ Menu opens on click
- ✅ Episodes link appears in mobile menu
- ✅ All 5 navigation links present

**Failure Indicators**:
- ❌ Episodes missing from mobile menu
- ❌ Menu doesn't open
- ❌ Links overlapping or broken layout

## Detailed Test Scenarios

### Scenario 1: Zero Published Episodes
**Setup**: Mark all episodes as `draft: true` in frontmatter

**Steps**:
1. Edit episode files to add `draft: true`
2. Rebuild site
3. View landing page

**Expected**:
- ✅ Recent Episodes section shows "No episodes available yet. Check back soon!"
- ✅ No "View All Episodes →" link
- ✅ No episode cards rendered

**Cleanup**: Remove `draft: true` from episodes

### Scenario 2: One Published Episode
**Setup**: Ensure exactly one episode with `draft: false` or no draft field

**Steps**:
1. Set all but one episode to `draft: true`
2. Rebuild site
3. View landing page

**Expected**:
- ✅ Recent Episodes shows 1 card
- ✅ "View All Episodes →" link present
- ✅ Episode card fully functional

### Scenario 3: Episode Without Description
**Setup**: Episode file without `description` in frontmatter

**Steps**:
1. Remove `description` field from an episode
2. Rebuild site
3. View episode card on landing page

**Expected**:
- ✅ Episode card renders
- ✅ Description paragraph not shown
- ✅ Title, date, thumbnail, duration visible
- ✅ "Listen →" link works

### Scenario 4: Episode With String Duration
**Setup**: Episode with `duration: "54:01"` (string, not number)

**Steps**:
1. Set duration to string format in episode frontmatter
2. Rebuild site
3. View episode card

**Expected**:
- ✅ Duration displays as "54:01" (without " min" suffix)
- ✅ Card renders normally

### Scenario 5: Episode With Number Duration
**Setup**: Episode with `duration: 54` (number in minutes)

**Steps**:
1. Set duration to number in episode frontmatter
2. Rebuild site
3. View episode card

**Expected**:
- ✅ Duration displays as "54 min" (with " min" suffix)
- ✅ Card renders normally

## Automated Test Validation

### Run Unit Tests
```bash
cd /home/petty/Github/tbp/quartz
npm test
```

**Expected**:
- ✅ All tests pass
- ✅ New tests for Episodes navigation link
- ✅ Updated tests for episode validation (optional fields)
- ✅ Tests for empty state handling

**Key Test Suites**:
- `landingPageUtils.test.ts` - getLatestEpisodes, buildNavLinks
- `EpisodeGrid.test.tsx` - Empty state rendering
- `EpisodeCard.test.tsx` - Optional field handling
- `LandingPageNav.test.tsx` - 5 navigation links

### Run Build Test
```bash
npm run build
```

**Expected**:
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ Output in `public/` directory

## Rollback Procedure

### If Issues Found
```bash
# Revert changes
git checkout main

# Rebuild
npm run build

# Test old version
npm run serve
```

## Success Criteria Checklist

### Navigation
- [ ] Episodes link visible in desktop navigation
- [ ] Episodes link visible in mobile menu
- [ ] Episodes link appears first in link order
- [ ] Episodes link navigates to correct URL
- [ ] All 5 links render properly

### Recent Episodes Section
- [ ] Section displays with heading
- [ ] Episodes render as cards (up to 5)
- [ ] Each card has thumbnail, title, date, duration
- [ ] Cards link to episode pages
- [ ] "View All Episodes →" link present when episodes exist
- [ ] Empty state message shows when no episodes

### Optional Fields Handling
- [ ] Episodes without description render successfully
- [ ] Episodes without audioUrl render successfully
- [ ] Episodes without guests render successfully
- [ ] String duration format displays correctly
- [ ] Number duration format displays correctly

### Responsive Design
- [ ] Desktop navigation works
- [ ] Mobile hamburger menu works
- [ ] Episode grid responsive across breakpoints

### Performance
- [ ] Page loads in <2 seconds (local)
- [ ] No console errors
- [ ] Images lazy load

## Troubleshooting

### Issue: Episodes Link Missing
**Cause**: buildNavLinks not updated
**Fix**: Check `quartz/components/utils/landingPageUtils.ts:120-134`

### Issue: No Episodes Displayed
**Cause**: Validation too strict (requires audioUrl/description)
**Fix**: Check `getLatestEpisodes` validation logic (lines 28-35)

### Issue: "No episodes available" When Episodes Exist
**Cause**: All episodes filtered out by validation
**Debug**:
```javascript
// Add console.log in getLatestEpisodes
console.log('Episodes after filter:', episodes.length)
console.log('Failed validation:', allFiles.filter(f => f.slug?.startsWith('episodes/') && !validateEpisode(f)))
```

### Issue: TypeError on Episode Card
**Cause**: Trying to access undefined optional field
**Fix**: Add conditional rendering for description/guestNames

## Next Steps After Validation

1. **Deploy to Production**: Merge feature branch to main
2. **Monitor Analytics**: Check Episodes link click-through rate
3. **Gather Feedback**: User testing on episode discovery
4. **Consider Enhancements**:
   - Add episode search/filter
   - Add episode categories/tags
   - Add audio player in cards (if audioUrl available)
   - Add pagination for episode archive

## Time Estimates
- Quick validation: 5 minutes
- Detailed scenarios: 15 minutes
- Automated tests: 5 minutes
- Full acceptance testing: 30 minutes

## Contact
For issues or questions about this quickstart, refer to:
- Feature spec: `specs/004-update-landing-page/spec.md`
- Implementation plan: `specs/004-update-landing-page/plan.md`

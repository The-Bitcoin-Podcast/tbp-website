# Tasks: Landing Page Improvements

**Input**: Design documents from `/home/petty/Github/tbp/quartz/specs/004-update-landing-page/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extract: TypeScript 5.9.2, Quartz 4.5.2, Preact 10.27.2
2. Load optional design documents ✅
   → data-model.md: EpisodeFrontmatter, EpisodeCard, NavLink modifications
   → contracts/: 4 contract files identified
   → research.md: Validation fix, navigation update decisions
3. Generate tasks by category:
   → Setup: Verify environment
   → Tests: Contract tests for 4 contracts
   → Core: Type updates, utility functions, components
   → Polish: Integration tests, validation
4. Apply task rules:
   → Type updates [P] - single file, independent changes
   → Component updates [P] - different files
   → Utility function - sequential (same file, multiple functions)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T019) ✅
6. Dependencies: Types → Utils → Components
7. Parallel execution examples included ✅
8. Validate task completeness ✅
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root

## Path Conventions
- Repository root: `/home/petty/Github/tbp/quartz`
- Components: `quartz/components/`
- Types: `quartz/components/types/`
- Utils: `quartz/components/utils/`
- Tests: `tests/` (TBD - check package.json for test framework)

---

## Phase 3.1: Setup & Verification

- [x] **T001** Verify development environment
  - Check Node.js version (>=22)
  - Check TypeScript version (5.9.2)
  - Run `npm install` to ensure dependencies
  - Verify Quartz builds: `npx quartz build`
  - **File**: N/A (environment check)
  - **Success**: Build completes without errors

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (can run in parallel)

- [ ] **T002** [P] Write contract test for getLatestEpisodes function
  - **File**: `tests/unit/landingPageUtils.test.ts` (or create if doesn't exist)
  - **Contract**: `specs/004-update-landing-page/contracts/getLatestEpisodes.contract.md`
  - **Test cases**:
    - Returns empty array when no files provided
    - Filters out draft episodes
    - Filters out episodes missing required fields (title, date, episodeNumber, thumbnail, duration)
    - **NEW**: Includes episodes WITHOUT audioUrl
    - **NEW**: Includes episodes WITHOUT description
    - Sorts by date descending
    - Limits results to specified limit
    - Handles fewer than limit episodes
    - Transforms guest array to comma-separated string
  - **Must fail initially**: No implementation changes yet

- [ ] **T003** [P] Write contract test for buildNavLinks function
  - **File**: `tests/unit/landingPageUtils.test.ts`
  - **Contract**: `specs/004-update-landing-page/contracts/buildNavLinks.contract.md`
  - **Test cases**:
    - Returns array with exactly 5 links
    - **NEW**: Episodes link appears first in array
    - All labels correct (Episodes, About, Sponsors, Contact, Guests)
    - All URLs match config values
    - Link order is Episodes, About, Sponsors, Contact, Guests
  - **Must fail initially**: Episodes link not yet added

- [ ] **T004** [P] Write component test for EpisodeGrid with empty state
  - **File**: `tests/components/EpisodeGrid.test.tsx` (or create)
  - **Contract**: `specs/004-update-landing-page/contracts/EpisodeGrid.component.contract.md`
  - **Test cases**:
    - Renders "Recent Episodes" heading
    - Renders episode cards when episodes provided
    - Renders archive link when episodes.length > 0
    - **NEW**: Does NOT render archive link when episodes.length === 0
    - **NEW**: Renders empty state message "No episodes available yet. Check back soon!" when episodes.length === 0
    - Passes correct props to EpisodeCard components
  - **Must fail initially**: Empty state not yet implemented

- [ ] **T005** [P] Write component test for EpisodeCard with optional fields
  - **File**: `tests/components/EpisodeCard.test.tsx` (or create)
  - **Contract**: `specs/004-update-landing-page/contracts/EpisodeCard.component.contract.md`
  - **Test cases**:
    - Renders all required elements (image, title, date, duration, link)
    - **NEW**: Shows description when present
    - **NEW**: Hides description when undefined
    - **NEW**: Shows guest names when present
    - **NEW**: Hides guest names when undefined
    - Formats date correctly
    - Handles duration as number (with " min" suffix)
    - Handles duration as string (without " min" suffix)
  - **Must fail initially**: Conditional rendering not yet implemented

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Type Definition Updates

- [x] **T006** Update TypeScript type definitions
  - **File**: `quartz/components/types/landingPage.ts`
  - **Changes**:
    - Make `audioUrl?: string` optional in `EpisodeFrontmatter` interface (line ~25)
    - Make `description?: string` optional in `EpisodeFrontmatter` interface (line ~28)
    - Update `duration: number | string` to support both formats in `EpisodeFrontmatter` (line ~24)
    - Make `audioUrl?: string` optional in `EpisodeCard` interface (line ~72)
    - Make `description?: string` optional in `EpisodeCard` interface (line ~67)
    - Update `duration: number | string` in `EpisodeCard` interface (line ~65)
  - **Verification**: TypeScript compilation passes
  - **Tests affected**: T002 (getLatestEpisodes tests should start passing for optional fields)

### Utility Function Updates

- [x] **T007** Update getLatestEpisodes validation logic
  - **File**: `quartz/components/utils/landingPageUtils.ts`
  - **Location**: Lines 28-35 (validation filter)
  - **Changes**:
    - Remove `fm?.audioUrl &&` from validation (line ~31)
    - Remove `fm?.description &&` from validation (line ~32)
    - Keep all other validation fields: title, date, episodeNumber, thumbnail, duration
  - **Verification**: Run T002 tests - should now pass
  - **Expected result**: Episodes without audioUrl/description now pass validation

- [x] **T008** Add Episodes link to buildNavLinks function
  - **File**: `quartz/components/utils/landingPageUtils.ts`
  - **Location**: Lines 120-134 (buildNavLinks function)
  - **Changes**:
    - Add Episodes entry as FIRST item in returned array
    - Structure: `{ label: "Episodes", url: config.episodesArchiveUrl }`
    - Existing links (About, Sponsors, Contact, Guests) follow after
  - **Verification**: Run T003 tests - should now pass
  - **Expected result**: Navigation has 5 links with Episodes first

### Component Updates (can run in parallel after types/utils complete)

- [x] **T009** [P] Add empty state to EpisodeGrid component
  - **File**: `quartz/components/EpisodeGrid.tsx`
  - **Dependencies**: T006 complete (types updated)
  - **Changes**:
    - Add conditional rendering after `<h2>Recent Episodes</h2>` (around line 12)
    - When `episodes.length === 0`: render `<p class="no-episodes-message">No episodes available yet. Check back soon!</p>`
    - When `episodes.length === 0`: do NOT render episode grid or archive link
    - When `episodes.length > 0`: render existing episode grid and archive link
  - **Verification**: Run T004 tests - should now pass
  - **Expected result**: Empty state message shows when no episodes

- [x] **T010** [P] Add conditional rendering to EpisodeCard component
  - **File**: `quartz/components/EpisodeCard.tsx`
  - **Dependencies**: T006 complete (types updated)
  - **Changes**:
    - Wrap description `<p>` tag (line ~18) with conditional: `{episode.description && <p>{episode.description}</p>}`
    - Wrap guests `<p>` tag (line ~19-21) with conditional: `{episode.guestNames && <p class="guests">With {episode.guestNames}</p>}`
    - Keep all other elements (image, title, date, duration, link) rendering unconditionally
  - **Verification**: Run T005 tests - should now pass
  - **Expected result**: Description and guest names only show when present

---

## Phase 3.4: Integration & Validation

- [x] **T011** Build and test locally
  - **Command**: `npx quartz build`
  - **Verification**: Build completes without TypeScript errors
  - **Check**: No console errors about missing types or undefined properties

- [ ] **T012** Manual testing: Episodes navigation link
  - **Start dev server**: `npx quartz build --serve`
  - **Test desktop navigation**:
    - Episodes link visible
    - Episodes link appears first (leftmost)
    - Click Episodes → navigates to episodes archive
  - **Test mobile navigation**:
    - Open mobile view (<768px)
    - Click hamburger menu
    - Episodes link present in menu
    - Click Episodes → navigates to episodes archive
  - **Reference**: `specs/004-update-landing-page/quickstart.md` Steps 2-3, 6

- [ ] **T013** Manual testing: Recent Episodes display
  - **Test with existing episodes**:
    - Recent Episodes section visible
    - Up to 5 episode cards displayed
    - Each card shows: thumbnail, title, date, duration
    - "Listen →" links work
    - "View All Episodes →" link present
  - **Test empty state** (if possible):
    - Mark all episodes as `draft: true`
    - Rebuild: `npx quartz build`
    - Verify "No episodes available yet. Check back soon!" message
    - Verify no archive link shown
    - Restore episodes (remove draft flags)
  - **Reference**: `specs/004-update-landing-page/quickstart.md` Steps 4-5, Scenario 1

- [ ] **T014** Manual testing: Optional fields handling
  - **Verify episodes without description**:
    - Cards render without description section
    - No undefined/null errors in console
  - **Verify duration formats**:
    - String format ("54:01") displays without " min"
    - Number format (54) displays with " min"
  - **Reference**: `specs/004-update-landing-page/quickstart.md` Scenarios 3-5

---

## Phase 3.5: Polish & Documentation

- [ ] **T015** [P] Run full test suite
  - **Command**: `npm test`
  - **Verification**: All tests pass (T002-T005 and any existing tests)
  - **Fix**: Any test failures or regressions

- [x] **T016** [P] Add CSS for empty state message
  - **File**: `quartz/components/styles/landingPage.scss`
  - **Changes**:
    - Add `.no-episodes-message` class styling
    - Center text, appropriate color, padding/margin
    - Match existing section styling
  - **Verification**: Empty state message displays properly styled

- [ ] **T017** [P] Update CLAUDE.md if needed
  - **File**: `CLAUDE.md`
  - **Check**: Recent changes section includes 004-update-landing-page
  - **Note**: Should already be updated by `/plan` command
  - **Verification**: Feature listed in Recent Changes

- [ ] **T018** Code review and cleanup
  - **Check all modified files**:
    - No console.log statements left
    - No commented-out code
    - Consistent formatting
    - Type safety preserved
  - **Files to review**:
    - `quartz/components/types/landingPage.ts`
    - `quartz/components/utils/landingPageUtils.ts`
    - `quartz/components/EpisodeGrid.tsx`
    - `quartz/components/EpisodeCard.tsx`

- [ ] **T019** Final validation via quickstart
  - **Execute**: `specs/004-update-landing-page/quickstart.md`
  - **Complete**: All steps in "Quick Validation (5 minutes)"
  - **Verify**: All success criteria met
  - **Document**: Any issues found

---

## Dependencies Graph

```
T001 (Setup)
  ↓
T002, T003, T004, T005 (Tests - parallel, must fail)
  ↓
T006 (Types)
  ↓
T007, T008 (Utils - sequential, same file)
  ↓
T009, T010 (Components - parallel, different files)
  ↓
T011 (Build)
  ↓
T012, T013, T014 (Manual testing - sequential for clarity)
  ↓
T015, T016, T017 (Polish - parallel)
  ↓
T018 (Review)
  ↓
T019 (Final validation)
```

## Parallel Execution Examples

### Phase 3.2: Write all tests in parallel
```bash
# All tests can be written simultaneously (different test files)
# T002: getLatestEpisodes tests
# T003: buildNavLinks tests  
# T004: EpisodeGrid tests
# T005: EpisodeCard tests
```

### Phase 3.3: Components in parallel (after types/utils)
```bash
# After T006-T008 complete:
# T009: EpisodeGrid component (quartz/components/EpisodeGrid.tsx)
# T010: EpisodeCard component (quartz/components/EpisodeCard.tsx)
```

### Phase 3.5: Polish in parallel
```bash
# T015: Run tests
# T016: Add CSS styling
# T017: Update documentation
```

## Task Summary

**Total Tasks**: 19
**Parallel Tasks**: 9 (T002-T005, T009-T010, T015-T017)
**Sequential Tasks**: 10 (T001, T006-T008, T011-T014, T018-T019)

**Estimated Time**:
- Setup & Tests: 1-2 hours
- Implementation: 1-2 hours
- Testing & Validation: 1 hour
- Polish: 30 minutes
- **Total**: 3.5-5.5 hours

## Validation Checklist
*GATE: All items must be checked*

- [x] All 4 contracts have corresponding tests (T002-T005)
- [x] Type modifications task included (T006)
- [x] All tests come before implementation (T002-T005 before T006-T010)
- [x] Parallel tasks [P] are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Manual testing includes quickstart scenarios
- [x] Dependencies clearly documented

## Notes

- **TDD Approach**: Tests MUST fail initially (T002-T005) before implementation
- **Type Changes First**: T006 unblocks all other implementation tasks
- **Same File Sequential**: T007 and T008 both modify `landingPageUtils.ts`, so they're sequential
- **Independent Components**: T009 and T010 modify different files, can be parallel
- **No Breaking Changes**: All changes are additive or relaxations of validation
- **Constitutional Compliance**: No source file modification, build-time only, flat file simplicity preserved

## Success Criteria

✅ **Navigation**: Episodes link visible in desktop and mobile navigation, appears first  
✅ **Recent Episodes**: Displays up to 5 episodes with proper rendering  
✅ **Empty State**: Shows helpful message when no episodes available  
✅ **Optional Fields**: Episodes without audioUrl/description render successfully  
✅ **No Regressions**: Existing functionality unchanged  
✅ **All Tests Pass**: T002-T005 and any existing tests  
✅ **Build Success**: No TypeScript errors, clean build

---

**Ready for implementation!** Start with T001 and proceed sequentially through dependencies.

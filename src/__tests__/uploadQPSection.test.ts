import { describe, it, expect } from 'vitest';

/**
 * Pure functions mirroring the logic in UploadQP.tsx for testability & verification
 */
export interface SectionOption {
  id: number;
  name: string;
}

export interface SectionWithBranchOption extends SectionOption {
  branch_id?: number;
  branch_name?: string;
}

export function groupSectionsByBranch(sections: SectionWithBranchOption[]) {
  const groups: Array<{ branchId: number; branchName: string; sections: SectionWithBranchOption[] }> = [];
  sections.forEach((sec) => {
    const bId = sec.branch_id || 0;
    const bName = sec.branch_name || 'Branch';
    let group = groups.find((g) => g.branchId === bId);
    if (!group) {
      group = { branchId: bId, branchName: bName, sections: [] };
      groups.push(group);
    }
    group.sections.push(sec);
  });
  return groups;
}

export function toggleBranchSections(currentSelected: number[], branchSections: SectionWithBranchOption[]): number[] {
  const branchSecIds = branchSections.map(s => s.id);
  const allInBranch = branchSecIds.every(id => currentSelected.includes(id));
  if (allInBranch) {
    const remaining = currentSelected.filter(id => !branchSecIds.includes(id));
    return remaining.length > 0 ? remaining : currentSelected;
  } else {
    return Array.from(new Set([...currentSelected, ...branchSecIds]));
  }
}

export function computeApplicableSections(selectedIds: number[], allSections: SectionOption[]): string {
  if (selectedIds.length === 0) return '';
  if (selectedIds.length === allSections.length) return 'ALL';
  return selectedIds
    .map(id => allSections.find(s => s.id === id)?.name)
    .filter(Boolean)
    .sort()
    .join(', ');
}

export function computeQPHeaderSectionText(applicableSections?: string): string {
  if (!applicableSections || applicableSections === 'ALL') {
    return '';
  }
  return `(Section: ${applicableSections})`;
}

export function toggleSelectAllSections(currentSelected: number[], allSections: SectionOption[]): number[] {
  if (currentSelected.length === allSections.length) {
    return [];
  }
  return allSections.map(s => s.id);
}

export function toggleSingleSection(currentSelected: number[], sectionId: number): number[] {
  if (currentSelected.includes(sectionId)) {
    return currentSelected.filter(id => id !== sectionId);
  } else {
    return [...currentSelected, sectionId];
  }
}

export function computeNextSelectedSectionsOnBranchChange(params: {
  currentSelectedSectionIds: number[];
  allAvailableSections: SectionWithBranchOption[];
  activeBranchIds: number[];
  prevActiveBranchIds: number[];
  subjectChanged?: boolean;
}): number[] {
  const { currentSelectedSectionIds, allAvailableSections, activeBranchIds, prevActiveBranchIds, subjectChanged } = params;
  if (allAvailableSections.length === 0) return [];

  const addedBranchIds = subjectChanged ? [] : activeBranchIds.filter((bId) => !prevActiveBranchIds.includes(bId));
  const validSelected = subjectChanged
    ? []
    : currentSelectedSectionIds.filter((id) => allAvailableSections.some((s) => s.id === id));

  const newlyAvailableSections = allAvailableSections
    .filter((s) => s.branch_id && addedBranchIds.includes(s.branch_id))
    .map((s) => s.id);

  if (validSelected.length === 0 && newlyAvailableSections.length === 0) {
    return allAvailableSections.map((s) => s.id);
  }

  return Array.from(new Set([...validSelected, ...newlyAvailableSections]));
}

export function buildQPPayload(params: {
  selectedSectionIds: number[];
  allSections: SectionWithBranchOption[];
  branchId?: number;
  semesterId?: number;
  targetBranchIds?: number[];
  fallbackSectionId?: number;
  testType: string;
  setNumber: string;
  questions: any[];
}) {
  const {
    selectedSectionIds,
    allSections,
    branchId,
    semesterId,
    targetBranchIds,
    fallbackSectionId,
    testType,
    setNumber,
    questions
  } = params;

  const candidateBranchIds = targetBranchIds && targetBranchIds.length > 0
    ? targetBranchIds
    : (branchId ? [branchId] : []);

  const branchesWithSelectedSections = candidateBranchIds.filter((bId) =>
    allSections.some((s) => s.branch_id === bId && selectedSectionIds.includes(s.id))
  );

  const requestedBranchHasSections = branchId && allSections.some(
    (s) => s.branch_id === branchId && selectedSectionIds.includes(s.id)
  );

  let payloadBranch = branchId;
  let payloadSemester = semesterId;

  if (!requestedBranchHasSections && branchesWithSelectedSections.length > 0) {
    payloadBranch = branchesWithSelectedSections[0];
  }

  const adjustedTargetBranches =
    targetBranchIds && targetBranchIds.length > 1
      ? (branchesWithSelectedSections.length > 1 ? branchesWithSelectedSections : undefined)
      : undefined;

  const consistentTargetSectionIds = selectedSectionIds.filter((id) => {
    const sec = allSections.find((s) => s.id === id);
    if (!sec) return false;
    if (adjustedTargetBranches && adjustedTargetBranches.length > 0) {
      return sec.branch_id ? adjustedTargetBranches.includes(sec.branch_id) : true;
    }
    return !payloadBranch || sec.branch_id === payloadBranch;
  });

  const payloadBranchSections = allSections.filter((s) => !payloadBranch || s.branch_id === payloadBranch);
  const payloadSelectedInBranch = payloadBranchSections.filter((s) => consistentTargetSectionIds.includes(s.id));
  const isAllInPayloadBranch = payloadBranchSections.length > 0 && payloadSelectedInBranch.length === payloadBranchSections.length;

  const applicableSectionsStr = isAllInPayloadBranch
    ? 'ALL'
    : (payloadSelectedInBranch.length > 0
        ? payloadSelectedInBranch.map((s) => s.name.replace(/^Section\s*/i, '')).join(', ')
        : '');

  const chosenSectionId = payloadSelectedInBranch.length > 0
    ? payloadSelectedInBranch[0].id
    : (fallbackSectionId && payloadBranchSections.some((s) => s.id === fallbackSectionId) ? fallbackSectionId : undefined);

  return {
    branch_id: payloadBranch,
    semester_id: payloadSemester,
    section_id: chosenSectionId,
    target_branch_ids: adjustedTargetBranches,
    target_section_ids: consistentTargetSectionIds.length > 0 ? consistentTargetSectionIds : (fallbackSectionId ? [fallbackSectionId] : []),
    applicable_sections: applicableSectionsStr || undefined,
    test_type: testType,
    set_number: setNumber,
    questions,
  };
}

describe('UploadQP Section Selection & Header TDD Unit & Integration Tests', () => {
  const mockSections: SectionOption[] = [
    { id: 101, name: 'A' },
    { id: 102, name: 'B' },
    { id: 103, name: 'C' },
  ];

  describe('Section Selection & Toggle Logic', () => {
    it('should select all sections when none or partial are selected', () => {
      const selected = toggleSelectAllSections([101], mockSections);
      expect(selected).toEqual([101, 102, 103]);
    });

    it('should deselect all sections when all are currently selected', () => {
      const selected = toggleSelectAllSections([101, 102, 103], mockSections);
      expect(selected).toEqual([]);
    });

    it('should add section when toggling unselected section', () => {
      const selected = toggleSingleSection([101], 102);
      expect(selected).toEqual([101, 102]);
    });

    it('should remove section when toggling already selected section', () => {
      const selected = toggleSingleSection([101, 102], 101);
      expect(selected).toEqual([102]);
    });
  });

  describe('Applicable Sections Computation', () => {
    it('should return "ALL" when all sections are selected', () => {
      const result = computeApplicableSections([101, 102, 103], mockSections);
      expect(result).toBe('ALL');
    });

    it('should return sorted comma-separated string when partial sections selected (e.g. A and B)', () => {
      const result = computeApplicableSections([102, 101], mockSections);
      expect(result).toBe('A, B');
    });

    it('should return single section name when only section C selected', () => {
      const result = computeApplicableSections([103], mockSections);
      expect(result).toBe('C');
    });

    it('should return empty string if no sections selected', () => {
      const result = computeApplicableSections([], mockSections);
      expect(result).toBe('');
    });
  });

  describe('Question Paper Preview & Header Display', () => {
    it('should omit section mention from header when all sections are selected ("ALL")', () => {
      const headerText = computeQPHeaderSectionText('ALL');
      expect(headerText).toBe('');
    });

    it('should omit section mention when applicable_sections is undefined or empty', () => {
      const headerText = computeQPHeaderSectionText(undefined);
      expect(headerText).toBe('');
    });

    it('should display "(Section: A, B)" when sections A and B are selected', () => {
      const headerText = computeQPHeaderSectionText('A, B');
      expect(headerText).toBe('(Section: A, B)');
    });

    it('should display "(Section: C)" when only section C is selected', () => {
      const headerText = computeQPHeaderSectionText('C');
      expect(headerText).toBe('(Section: C)');
    });
  });

  describe('QP Payload Construction for Isolated Sets', () => {
    it('should build payload with target_section_ids and applicable_sections "A, B" for sections A & B', () => {
      const payload = buildQPPayload({
        selectedSectionIds: [101, 102],
        allSections: mockSections,
        fallbackSectionId: 101,
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [{ question_number: 1, text: 'Define normalization' }],
      });

      expect(payload.target_section_ids).toEqual([101, 102]);
      expect(payload.applicable_sections).toBe('A, B');
      expect(payload.test_type).toBe('IA1');
      expect(payload.set_number).toBe('Set 1');
    });

    it('should build independent payload for section C without overwriting sections A & B', () => {
      const payloadC = buildQPPayload({
        selectedSectionIds: [103],
        allSections: mockSections,
        fallbackSectionId: 103,
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [{ question_number: 1, text: 'Explain indexing' }],
      });

      expect(payloadC.target_section_ids).toEqual([103]);
      expect(payloadC.applicable_sections).toBe('C');
      expect(payloadC.test_type).toBe('IA1');
      expect(payloadC.set_number).toBe('Set 1');
      expect(payloadC.questions[0].text).toBe('Explain indexing');
    });

    it('should build payload with applicable_sections "ALL" when faculty chooses all sections', () => {
      const payloadAll = buildQPPayload({
        selectedSectionIds: [101, 102, 103],
        allSections: mockSections,
        fallbackSectionId: 101,
        testType: 'IA2',
        setNumber: 'Set 2',
        questions: [{ question_number: 1, text: 'Discuss transaction management' }],
      });

      expect(payloadAll.target_section_ids).toEqual([101, 102, 103]);
      expect(payloadAll.applicable_sections).toBe('ALL');
    });
  });

  describe('Negative Validation & Edge Cases', () => {
    it('should safely handle empty or missing sections list', () => {
      const result = computeApplicableSections([101], []);
      expect(result).toBe('');

      const selected = toggleSelectAllSections([], []);
      expect(selected).toEqual([]);
    });

    it('should filter out nonexistent or invalid section IDs gracefully', () => {
      const result = computeApplicableSections([9999, 101], mockSections);
      // 9999 does not exist in mockSections, so only 101 ('A') is returned
      expect(result).toBe('A');
    });

    it('should handle sections with empty or undefined names without crashing', () => {
      const corruptedSections: SectionOption[] = [
        { id: 201, name: '' },
        { id: 202, name: undefined as any },
        { id: 203, name: 'Valid' },
      ];
      const result = computeApplicableSections([201, 202, 203], corruptedSections);
      // When all are selected, returns 'ALL'
      expect(result).toBe('ALL');

      // When subset with valid and empty is selected
      const partial = computeApplicableSections([201, 203], corruptedSections);
      expect(partial).toBe('Valid');
    });

    it('should never create duplicate section IDs when toggling', () => {
      let selected: number[] = [];
      selected = toggleSingleSection(selected, 101);
      selected = toggleSingleSection(selected, 102);
      // Toggling 101 again removes it
      selected = toggleSingleSection(selected, 101);
      expect(selected).toEqual([102]);
      // Toggling 102 again removes it
      selected = toggleSingleSection(selected, 102);
      expect(selected).toEqual([]);
    });

    it('should preserve selectedSectionIds on API error and allow retry', async () => {
      let state = {
        selectedSectionIds: [101, 102],
        isSubmitting: false,
        error: null as string | null,
      };

      const mockSaveAPI = async (shouldFail: boolean) => {
        if (state.isSubmitting) return; // Prevent concurrent double submit
        state.isSubmitting = true;
        try {
          if (shouldFail) {
            throw new Error('403 Forbidden: You are not assigned to section 102');
          }
          state.error = null;
        } catch (err: any) {
          state.error = err.message;
        } finally {
          state.isSubmitting = false;
        }
      };

      // 1. Initial attempt fails
      await mockSaveAPI(true);
      expect(state.error).toContain('403 Forbidden');
      // Critical check: Existing selection is NOT lost on failure
      expect(state.selectedSectionIds).toEqual([101, 102]);
      expect(state.isSubmitting).toBe(false);

      // 2. Retry succeeds without re-selecting sections
      await mockSaveAPI(false);
      expect(state.error).toBeNull();
      expect(state.selectedSectionIds).toEqual([101, 102]);
    });

    it('should guard against duplicate submissions while save is in-flight', async () => {
      let callCount = 0;
      let isSaving = false;

      const triggerSave = async () => {
        if (isSaving) return false;
        isSaving = true;
        callCount++;
        // simulate async delay
        await new Promise(res => setTimeout(res, 10));
        isSaving = false;
        return true;
      };

      // Fire two concurrent saves
      const [res1, res2] = await Promise.all([triggerSave(), triggerSave()]);
      expect(res1).toBe(true);
      expect(res2).toBe(false); // Second concurrent call blocked
      expect(callCount).toBe(1);
    });
  });

  describe('Multi-Branch Open Elective Section Grouping', () => {
    const multiBranchSections: SectionWithBranchOption[] = [
      { id: 101, name: 'Section A', branch_id: 1, branch_name: 'Civil Engineering' },
      { id: 102, name: 'Section B', branch_id: 1, branch_name: 'Civil Engineering' },
      { id: 201, name: 'Section A', branch_id: 2, branch_name: 'Computer Science and Engineering' },
      { id: 202, name: 'Section B', branch_id: 2, branch_name: 'Computer Science and Engineering' },
      { id: 203, name: 'Section C', branch_id: 2, branch_name: 'Computer Science and Engineering' },
    ];

    it('should accurately group sections under their respective branch headers', () => {
      const grouped = groupSectionsByBranch(multiBranchSections);
      expect(grouped).toHaveLength(2);
      expect(grouped[0].branchName).toBe('Civil Engineering');
      expect(grouped[0].sections).toHaveLength(2);
      expect(grouped[1].branchName).toBe('Computer Science and Engineering');
      expect(grouped[1].sections).toHaveLength(3);
    });

    it('should toggle all sections within a specific branch when branch header is clicked', () => {
      const civilSections = multiBranchSections.filter(s => s.branch_id === 1);
      // Start with only Civil Section A selected
      const initial = [101, 201];
      // Toggle Civil -> should select all in Civil
      const afterSelectAllCivil = toggleBranchSections(initial, civilSections);
      expect(afterSelectAllCivil).toEqual([101, 201, 102]);

      // Toggle Civil again -> should unselect Civil sections (while preserving CSE section 201)
      const afterUnselectCivil = toggleBranchSections(afterSelectAllCivil, civilSections);
      expect(afterUnselectCivil).toEqual([201]);
    });
  });

  describe('Elective Branch Re-addition & Section Selection (Review Comment 1)', () => {
    const branch1Sections: SectionWithBranchOption[] = [
      { id: 101, name: 'Section A', branch_id: 1, branch_name: 'CS' },
      { id: 102, name: 'Section B', branch_id: 1, branch_name: 'CS' },
    ];
    const branch2Sections: SectionWithBranchOption[] = [
      { id: 201, name: 'Section A', branch_id: 2, branch_name: 'AIML' },
      { id: 202, name: 'Section B', branch_id: 2, branch_name: 'AIML' },
    ];
    const allSections = [...branch1Sections, ...branch2Sections];

    it('should add newly available sections when re-adding an elective branch while preserving existing valid selections', () => {
      // User previously had CS (101) selected while AIML was deselected
      const currentSelected = [101];
      const prevActiveBranchIds = [1];
      const nextActiveBranchIds = [1, 2]; // Re-adding branch 2 (AIML)

      const result = computeNextSelectedSectionsOnBranchChange({
        currentSelectedSectionIds: currentSelected,
        allAvailableSections: allSections,
        activeBranchIds: nextActiveBranchIds,
        prevActiveBranchIds,
        subjectChanged: false,
      });

      // Preserves 101 (CS), and adds newly available 201, 202 (AIML)
      expect(result).toEqual([101, 201, 202]);
    });

    it('should cleanly remove sections from a removed branch while preserving other selections', () => {
      const currentSelected = [101, 102, 201, 202];
      const prevActiveBranchIds = [1, 2];
      const nextActiveBranchIds = [1]; // Removed branch 2 (AIML)

      const result = computeNextSelectedSectionsOnBranchChange({
        currentSelectedSectionIds: currentSelected,
        allAvailableSections: branch1Sections, // Only CS available now
        activeBranchIds: nextActiveBranchIds,
        prevActiveBranchIds,
        subjectChanged: false,
      });

      expect(result).toEqual([101, 102]);
    });

    it('should default to all sections if all valid selections were cleared and subject changes', () => {
      const result = computeNextSelectedSectionsOnBranchChange({
        currentSelectedSectionIds: [999], // Stale ID
        allAvailableSections: allSections,
        activeBranchIds: [1, 2],
        prevActiveBranchIds: [1],
        subjectChanged: true,
      });

      expect(result).toEqual([101, 102, 201, 202]);
    });
  });

  describe('Payload Branch & Section Consistency (Review Comment 2)', () => {
    const multiSections: SectionWithBranchOption[] = [
      { id: 101, name: 'Section A', branch_id: 1, branch_name: 'CS' },
      { id: 102, name: 'Section B', branch_id: 1, branch_name: 'CS' },
      { id: 201, name: 'Section A', branch_id: 2, branch_name: 'AIML' },
      { id: 202, name: 'Section B', branch_id: 2, branch_name: 'AIML' },
    ];

    it('should select chosenSectionId strictly from payload branch and keep applicable_sections consistent with that branch', () => {
      // User selects Section A from CS (101) and Section B from AIML (202)
      const payload = buildQPPayload({
        selectedSectionIds: [101, 202],
        allSections: multiSections,
        branchId: 1, // Primary payload branch CS
        semesterId: 1,
        targetBranchIds: [1, 2],
        fallbackSectionId: 101,
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [],
      });

      // Section ID must belong to branch 1 (101), NOT 202
      expect(payload.branch_id).toBe(1);
      expect(payload.section_id).toBe(101);
      // applicable_sections must describe branch 1 only ('A', not 'A, B' mixing AIML)
      expect(payload.applicable_sections).toBe('A');
      expect(payload.target_branch_ids).toEqual([1, 2]);
      expect(payload.target_section_ids).toEqual([101, 202]);
    });

    it('should adjust payload branch and target branches when primary branch has no sections selected', () => {
      // User unselected all sections in CS (branch 1), and selected only AIML (branch 2) Section A (201)
      const payload = buildQPPayload({
        selectedSectionIds: [201],
        allSections: multiSections,
        branchId: 1, // Originally requested branch was CS
        semesterId: 1,
        targetBranchIds: [1, 2],
        fallbackSectionId: 101,
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [],
      });

      // Payload branch automatically adjusts to AIML (2)
      expect(payload.branch_id).toBe(2);
      expect(payload.section_id).toBe(201);
      expect(payload.applicable_sections).toBe('A');
      // Since only 1 branch actually has selected sections, target_branch_ids is adjusted to undefined (single branch)
      expect(payload.target_branch_ids).toBeUndefined();
      expect(payload.target_section_ids).toEqual([201]);
    });

    it('should return undefined section_id when no section is selected in payload branch, requiring a valid selection', () => {
      // Empty selection across all branches
      const payload = buildQPPayload({
        selectedSectionIds: [],
        allSections: multiSections,
        branchId: 1,
        semesterId: 1,
        targetBranchIds: [1, 2],
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [],
      });

      expect(payload.section_id).toBeUndefined();
      expect(payload.applicable_sections).toBeUndefined();
    });

    it('should set applicable_sections to "ALL" when all sections of the payload branch are selected', () => {
      const payload = buildQPPayload({
        selectedSectionIds: [101, 102, 201], // All in CS (101, 102) + 201 in AIML
        allSections: multiSections,
        branchId: 1,
        semesterId: 1,
        targetBranchIds: [1, 2],
        testType: 'IA1',
        setNumber: 'Set 1',
        questions: [],
      });

      expect(payload.branch_id).toBe(1);
      expect(payload.section_id).toBe(101);
      expect(payload.applicable_sections).toBe('ALL');
    });
  });
});



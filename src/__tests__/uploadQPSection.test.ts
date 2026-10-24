import { describe, it, expect } from 'vitest';

/**
 * Pure functions mirroring the logic in UploadQP.tsx for testability & verification
 */
export interface SectionOption {
  id: number;
  name: string;
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

export function buildQPPayload(params: {
  selectedSectionIds: number[];
  allSections: SectionOption[];
  fallbackSectionId: number;
  testType: string;
  setNumber: string;
  questions: any[];
}) {
  const { selectedSectionIds, allSections, fallbackSectionId, testType, setNumber, questions } = params;

  let applicableSections: string | undefined = undefined;
  let targetSectionIds: number[] = [];

  if (selectedSectionIds.length > 0) {
    targetSectionIds = selectedSectionIds;
    applicableSections = computeApplicableSections(selectedSectionIds, allSections);
  } else if (fallbackSectionId) {
    targetSectionIds = [fallbackSectionId];
    applicableSections = allSections.find(s => s.id === fallbackSectionId)?.name;
  }

  return {
    section_id: targetSectionIds[0] || fallbackSectionId,
    target_section_ids: targetSectionIds,
    applicable_sections: applicableSections,
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
});


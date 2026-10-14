import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Table as TableIcon, Check, Layers } from 'lucide-react';
import { generateTableHtml, generateMultipleTablesHtml } from '@/utils/qpTableUtils';
import { QPNotationsPicker } from './QPNotationsPicker';

export interface BoxItem {
  id: string;
  name: string;
  data: string[][];
  preset: 'xy' | 'custom';
  hasHeader?: boolean;
}

interface QPBoxTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableData?: string[][] | null;
  initialTablesData?: string[][][] | null;
  onSaveTable: (tableHtml: string, tableData: string[][], allTablesData?: string[][][]) => void;
  onDeleteTable?: () => void;
  questionNumber?: string;
  startWithNewBox?: boolean;
}

export const QPBoxTableModal: React.FC<QPBoxTableModalProps> = ({
  isOpen,
  onClose,
  initialTableData,
  initialTablesData,
  onSaveTable,
  onDeleteTable,
  questionNumber = "",
  startWithNewBox = false
}) => {
  const defaultXYData = [
    ['X', '23', '27', '28', '29', '30', '31', '33'],
    ['Y', '18', '22', '23', '24', '25', '26', '28']
  ];

  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number>(0);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const cellCursorRef = useRef<{ row: number; col: number; start: number; end: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let initialList: BoxItem[] = [];
    if (initialTablesData && initialTablesData.length > 0) {
      initialList = initialTablesData.map((data, idx) => {
        const isXY = data.length === 2 &&
          (data[0][0]?.toUpperCase() === 'X' || data[0][0]?.toUpperCase() === 'X:') &&
          (data[1][0]?.toUpperCase() === 'Y' || data[1][0]?.toUpperCase() === 'Y:');
        return {
          id: `box-${idx + 1}-${Date.now()}`,
          name: `Box ${idx + 1}`,
          data,
          preset: isXY ? 'xy' : 'custom',
          hasHeader: !isXY
        };
      });
    } else if (initialTableData && initialTableData.length > 0) {
      const isXY = initialTableData.length === 2 &&
        (initialTableData[0][0]?.toUpperCase() === 'X' || initialTableData[0][0]?.toUpperCase() === 'X:') &&
        (initialTableData[1][0]?.toUpperCase() === 'Y' || initialTableData[1][0]?.toUpperCase() === 'Y:');
      initialList = [{
        id: `box-1-${Date.now()}`,
        name: 'Box 1',
        data: initialTableData,
        preset: isXY ? 'xy' : 'custom',
        hasHeader: !isXY
      }];
    } else {
      initialList = [{
        id: `box-1-${Date.now()}`,
        name: 'Box 1',
        data: defaultXYData,
        preset: 'xy',
        hasHeader: false
      }];
    }

    if (startWithNewBox) {
      const newBox: BoxItem = {
        id: `box-1-${Date.now()}`,
        name: 'Box 1',
        data: defaultXYData,
        preset: 'xy',
        hasHeader: false
      };
      setBoxes([newBox]);
      setActiveBoxIndex(0);
    } else {
      setBoxes(initialList);
      setActiveBoxIndex(0);
    }
    setFocusedCell(null);
  }, [isOpen, initialTableData, initialTablesData, startWithNewBox]);

  const currentBox = boxes[activeBoxIndex] || boxes[0] || {
    id: 'box-1',
    name: 'Box 1',
    data: defaultXYData,
    preset: 'xy',
    hasHeader: false
  };

  const updateCurrentBoxData = (newData: string[][]) => {
    setBoxes(prev => prev.map((b, idx) =>
      idx === activeBoxIndex ? { ...b, data: newData } : b
    ));
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (!currentBox) return;
    const updated = currentBox.data.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : [...row]
    );
    updateCurrentBoxData(updated);
  };

  const handleAddAnotherBox = () => {
    const nextNum = boxes.length + 1;
    const newBox: BoxItem = {
      id: `box-${nextNum}-${Date.now()}`,
      name: `Box ${nextNum}`,
      data: [
        ['X', '12', '15', '18', '21', '24'],
        ['Y', '8', '11', '14', '17', '20']
      ],
      preset: 'xy',
      hasHeader: false
    };
    const updated = [...boxes, newBox];
    setBoxes(updated);
    setActiveBoxIndex(updated.length - 1);
    setFocusedCell(null);
  };

  const handleRemoveBox = (idxToRemove: number) => {
    if (boxes.length <= 1) return;
    const updated = boxes.filter((_, idx) => idx !== idxToRemove).map((b, newIdx) => ({
      ...b,
      name: `Box ${newIdx + 1}`
    }));
    setBoxes(updated);
    setActiveBoxIndex(Math.max(0, Math.min(activeBoxIndex, updated.length - 1)));
    setFocusedCell(null);
  };

  const handleInsertNotation = (symbol: string) => {
    const row = cellCursorRef.current?.row ?? focusedCell?.row ?? 0;
    const col = cellCursorRef.current?.col ?? focusedCell?.col ?? 0;
    const currentVal = currentBox.data[row]?.[col] || '';
    const start = cellCursorRef.current?.start ?? currentVal.length;
    const end = cellCursorRef.current?.end ?? currentVal.length;

    const newVal = currentVal.slice(0, start) + symbol + currentVal.slice(end);
    const nextPos = start + symbol.length;

    handleCellChange(row, col, newVal);

    cellCursorRef.current = { row, col, start: nextPos, end: nextPos };
    setFocusedCell({ row, col });

    setTimeout(() => {
      const el = document.getElementById(`cell-input-${row}-${col}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const addColumn = () => {
    if (!currentBox) return;
    updateCurrentBoxData(currentBox.data.map(row => [...row, '']));
  };

  const removeColumn = () => {
    if (!currentBox || (currentBox.data[0]?.length || 0) <= 2) return;
    updateCurrentBoxData(currentBox.data.map(row => row.slice(0, -1)));
  };

  const addRow = () => {
    if (!currentBox) return;
    const colCount = currentBox.data[0]?.length || 4;
    updateCurrentBoxData([...currentBox.data, new Array(colCount).fill('')]);
  };

  const removeRow = () => {
    if (!currentBox || currentBox.data.length <= 1) return;
    updateCurrentBoxData(currentBox.data.slice(0, -1));
  };

  const applyPreset = (preset: 'xy' | 'custom') => {
    if (!currentBox) return;
    const newData = preset === 'xy'
      ? defaultXYData
      : [
          ['Class Interval', '0-10', '10-20', '20-30', '30-40'],
          ['Frequency (f)', '5', '8', '12', '7']
        ];
    setBoxes(prev => prev.map((b, idx) =>
      idx === activeBoxIndex ? { ...b, preset, data: newData, hasHeader: preset === 'custom' } : b
    ));
  };

  const handleSave = () => {
    const allTablesData = boxes.map(b => b.data);
    const combinedHtml = boxes
      .map(b => generateTableHtml(b.data, { hasHeader: b.hasHeader }))
      .join('<br/>');
    onSaveTable(combinedHtml, allTablesData[0], allTablesData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[96vw] sm:w-[92vw] p-0 rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border bg-background text-foreground">
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <TableIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold truncate">
                  Box-Type Data Table Editor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Design and format statistical/math data tables {questionNumber ? `for Question ${questionNumber}` : ''}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-semibold">
                {boxes.length} {boxes.length === 1 ? 'Box' : 'Boxes'}
              </Badge>
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-semibold">
                {currentBox.data.length}R × {currentBox.data[0]?.length || 0}C
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 min-h-0 custom-scrollbar space-y-4">
          {/* MULTIPLE BOX TABS & ADD ANOTHER BOX BUTTON IN THE POPUP */}
          <div className="border-b pb-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
            {boxes.map((box, bIdx) => {
              const isActive = activeBoxIndex === bIdx;
              return (
                <div
                  key={box.id}
                  onClick={() => {
                    setActiveBoxIndex(bIdx);
                    setFocusedCell(null);
                  }}
                  className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted border-transparent hover:text-foreground'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>{box.name}</span>
                  {boxes.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBox(bIdx);
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-background/20 text-current transition-colors"
                      title={`Delete ${box.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompted Feature: "after adding one box give option in the popup to add the box" */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAnotherBox}
            className="h-8 text-xs gap-1.5 border-primary/50 text-primary hover:bg-primary/10 font-semibold shrink-0"
            title="Add another box table to this question"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Box
          </Button>
        </div>

        {/* Preset Selector & Toolbar for Currently Selected Box */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 pb-1">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
            <Button
              type="button"
              size="sm"
              variant={currentBox.preset === 'xy' ? 'default' : 'ghost'}
              onClick={() => applyPreset('xy')}
              className="h-7 text-xs font-semibold px-3"
            >
              Paired Data (X & Y)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentBox.preset === 'custom' ? 'default' : 'ghost'}
              onClick={() => applyPreset('custom')}
              className="h-7 text-xs font-semibold px-3"
            >
              Custom Grid
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <QPNotationsPicker onInsertSymbol={handleInsertNotation} />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="h-8 text-xs px-2 gap-1"
                title="Add Column to current box"
              >
                <Plus className="w-3.5 h-3.5" /> Col
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeColumn}
                disabled={(currentBox.data[0]?.length || 0) <= 2}
                className="h-8 text-xs px-2 gap-1 text-destructive hover:text-destructive"
                title="Remove Column from current box"
              >
                <Trash2 className="w-3.5 h-3.5" /> Col
              </Button>
              {currentBox.preset === 'custom' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                    className="h-8 text-xs px-2 gap-1"
                    title="Add Row to current box"
                  >
                    <Plus className="w-3.5 h-3.5" /> Row
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeRow}
                    disabled={currentBox.data.length <= 1}
                    className="h-8 text-xs px-2 gap-1 text-destructive hover:text-destructive"
                    title="Remove Row from current box"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Row
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Editable Table Grid for Currently Selected Box */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1 text-primary">
              <Layers className="w-3.5 h-3.5" /> Editing {currentBox.name}:
            </span>
            <span className="text-[11px] text-muted-foreground">Use Tab to move across cells</span>
          </div>
          <div className="overflow-x-auto border rounded-xl shadow-xs p-2 bg-card custom-scrollbar">
            <table className="w-full border-collapse border border-border text-center text-xs">
              <tbody>
                {currentBox.data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border/60">
                    {row.map((cell, colIdx) => {
                      const isHeaderLabel = colIdx === 0 || (currentBox.hasHeader && rowIdx === 0);
                      const isFocused = focusedCell?.row === rowIdx && focusedCell?.col === colIdx;
                      return (
                        <td
                          key={colIdx}
                          className={`p-1 border border-border/60 ${isHeaderLabel ? 'bg-muted/40 font-bold' : ''}`}
                        >
                          <input
                            id={`cell-input-${rowIdx}-${colIdx}`}
                            type="text"
                            value={cell}
                            onChange={(e) => {
                              cellCursorRef.current = {
                                row: rowIdx,
                                col: colIdx,
                                start: e.target.selectionStart ?? e.target.value.length,
                                end: e.target.selectionEnd ?? e.target.value.length
                              };
                              handleCellChange(rowIdx, colIdx, e.target.value);
                            }}
                            onFocus={(e) => {
                              setFocusedCell({ row: rowIdx, col: colIdx });
                              cellCursorRef.current = {
                                row: rowIdx,
                                col: colIdx,
                                start: e.target.selectionStart ?? e.target.value.length,
                                end: e.target.selectionEnd ?? e.target.value.length
                              };
                            }}
                            onSelect={(e) => {
                              const target = e.target as HTMLInputElement;
                              cellCursorRef.current = {
                                row: rowIdx,
                                col: colIdx,
                                start: target.selectionStart ?? target.value.length,
                                end: target.selectionEnd ?? target.value.length
                              };
                            }}
                            onKeyUp={(e) => {
                              const target = e.target as HTMLInputElement;
                              cellCursorRef.current = {
                                row: rowIdx,
                                col: colIdx,
                                start: target.selectionStart ?? target.value.length,
                                end: target.selectionEnd ?? target.value.length
                              };
                            }}
                            onClick={(e) => {
                              const target = e.target as HTMLInputElement;
                              cellCursorRef.current = {
                                row: rowIdx,
                                col: colIdx,
                                start: target.selectionStart ?? target.value.length,
                                end: target.selectionEnd ?? target.value.length
                              };
                            }}
                            className={`w-full min-w-[48px] max-w-[80px] text-center px-1 py-1 rounded text-xs transition-all focus:outline-none ${
                              isFocused
                                ? 'bg-primary/10 ring-1 ring-primary font-semibold text-primary'
                                : 'bg-transparent hover:bg-muted/30 text-foreground'
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Visual Print Preview of All Boxes */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Exam Paper Print Preview ({boxes.length} {boxes.length === 1 ? 'Box' : 'Boxes'}):</span>
          </div>
          <div className="p-3 rounded-xl border bg-background flex flex-col gap-3 justify-center items-center overflow-x-auto shadow-inner">
            {boxes.map((box, bIdx) => (
              <div key={bIdx} className="w-full flex flex-col items-center gap-1">
                {boxes.length > 1 && (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {box.name}
                  </span>
                )}
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateTableHtml(box.data, { hasHeader: box.hasHeader })
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
        <div className="border-t px-4 py-3 sm:px-6 sm:py-3.5 bg-muted/20 shrink-0">
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 border-0 p-0">
            <div>
              {onDeleteTable && initialTableData && initialTableData.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteTable}
                  className="gap-1 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove All Tables
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="ghost" onClick={onClose} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} className="h-8 gap-1.5 text-xs font-semibold shadow-xs">
                <Check className="w-4 h-4" /> Save & Insert {boxes.length > 1 ? `All Boxes (${boxes.length})` : 'Box Table'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

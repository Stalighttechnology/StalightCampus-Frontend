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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table as TableIcon,
  Check,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Pi,
  ArrowUp,
  ArrowDown,
  Type,
  Image as ImageIcon
} from 'lucide-react';
import {
  extractQPBlocks,
  serializeQPContentBlocks,
  generateTableHtml,
  QPContentBlock
} from '@/utils/qpTableUtils';
import { QPNotationsPicker } from './QPNotationsPicker';
import { QPBoxTableModal } from './QPBoxTableModal';
import { QPEquationBuilderModal } from './QPEquationBuilderModal';
import { sanitizeHtml } from '@/utils/sanitize';

interface QPQuestionContentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionNumber: string;
  initialContent: string;
  onSaveContent: (content: string) => void;
}

export const QPQuestionContentEditorModal: React.FC<QPQuestionContentEditorModalProps> = ({
  isOpen,
  onClose,
  questionNumber,
  initialContent,
  onSaveContent
}) => {
  const [blocks, setBlocks] = useState<QPContentBlock[]>([]);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const lastCursorRefs = useRef<Record<string, { start: number; end: number }>>({});

  useEffect(() => {
    if (isOpen) {
      const parsed = extractQPBlocks(initialContent || '');
      setBlocks(parsed);
      setActiveBlockIndex(null);
      setInsertAfterIndex(null);
    }
  }, [isOpen, initialContent]);

  const handleAddText = (afterIndex?: number) => {
    const newBlock: QPContentBlock = {
      id: 'b-' + Math.random().toString(36).substring(2, 9),
      type: 'text',
      content: ''
    };
    if (typeof afterIndex === 'number' && afterIndex >= 0) {
      setBlocks(prev => {
        const next = [...prev];
        next.splice(afterIndex + 1, 0, newBlock);
        return next;
      });
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
  };

  const handleOpenAddEquation = (afterIndex?: number) => {
    setActiveBlockIndex(null);
    setInsertAfterIndex(typeof afterIndex === 'number' ? afterIndex : blocks.length - 1);
    setIsEquationModalOpen(true);
  };

  const handleOpenEditEquation = (idx: number) => {
    setActiveBlockIndex(idx);
    setInsertAfterIndex(null);
    setIsEquationModalOpen(true);
  };

  const handleOpenAddTable = (afterIndex?: number) => {
    setActiveBlockIndex(null);
    setInsertAfterIndex(typeof afterIndex === 'number' ? afterIndex : blocks.length - 1);
    setIsBoxModalOpen(true);
  };

  const handleOpenEditTable = (idx: number) => {
    setActiveBlockIndex(idx);
    setInsertAfterIndex(null);
    setIsBoxModalOpen(true);
  };

  const handleMoveBlock = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    setBlocks(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleDeleteBlock = (idx: number) => {
    setBlocks(prev => {
      if (prev.length <= 1) {
        return [{ id: 'b-' + Math.random().toString(36).substring(2, 9), type: 'text', content: '' }];
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleTextChange = (idx: number, val: string) => {
    setBlocks(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], content: val };
      return next;
    });
  };

  const handleInsertNotation = (blockId: string, idx: number, symbol: string) => {
    const current = blocks[idx]?.content || '';
    const cursor = lastCursorRefs.current[blockId] || { start: current.length, end: current.length };
    const updated = current.substring(0, cursor.start) + symbol + current.substring(cursor.end);
    const nextPos = cursor.start + symbol.length;
    lastCursorRefs.current[blockId] = { start: nextPos, end: nextPos };

    handleTextChange(idx, updated);

    setTimeout(() => {
      const textarea = document.getElementById(`textarea-${blockId}`) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleSaveEquationFromModal = (eqText: string) => {
    const eqHtml = `<div class="qp-equation" style="display:inline-flex;align-items:center;vertical-align:middle;margin:4px 0;">${eqText}</div>`;
    if (activeBlockIndex !== null && blocks[activeBlockIndex]) {
      setBlocks(prev => {
        const next = [...prev];
        next[activeBlockIndex] = { ...next[activeBlockIndex], type: 'equation', content: eqHtml };
        return next;
      });
    } else if (insertAfterIndex !== null && insertAfterIndex >= 0) {
      setBlocks(prev => {
        const next = [...prev];
        next.splice(insertAfterIndex + 1, 0, {
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'equation',
          content: eqHtml
        });
        return next;
      });
    } else {
      setBlocks(prev => [
        ...prev,
        {
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'equation',
          content: eqHtml
        }
      ]);
    }
    setIsEquationModalOpen(false);
    setActiveBlockIndex(null);
    setInsertAfterIndex(null);
  };

  const handleSaveTableFromModal = (tableHtml: string, tableData: string[][]) => {
    if (activeBlockIndex !== null && blocks[activeBlockIndex]) {
      setBlocks(prev => {
        const next = [...prev];
        next[activeBlockIndex] = {
          ...next[activeBlockIndex],
          type: 'table',
          content: tableHtml,
          tableData
        };
        return next;
      });
    } else if (insertAfterIndex !== null && insertAfterIndex >= 0) {
      setBlocks(prev => {
        const next = [...prev];
        next.splice(insertAfterIndex + 1, 0, {
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'table',
          content: tableHtml,
          tableData
        });
        return next;
      });
    } else {
      setBlocks(prev => [
        ...prev,
        {
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'table',
          content: tableHtml,
          tableData
        }
      ]);
    }
    setIsBoxModalOpen(false);
    setActiveBlockIndex(null);
    setInsertAfterIndex(null);
  };

  const handleFinalSave = () => {
    const finalHtml = serializeQPContentBlocks(blocks);
    onSaveContent(finalHtml);
    onClose();
  };

  const previewHtml = () => {
    const serialized = serializeQPContentBlocks(blocks);
    return serialized || '<span class="text-muted-foreground italic">No content yet...</span>';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl w-[96vw] sm:w-[92vw] p-0 rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border bg-background text-foreground">
          {/* Header */}
          <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-bold truncate">
                    Edit Question Content {questionNumber ? `(${questionNumber})` : ''}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                    Include mathematical notations, text prompts, equations, and box-type data tables in any order
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 min-h-0 custom-scrollbar space-y-4">
            {/* Top Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Add Content for this Question:
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Combine texts, notations/formulas, and data tables in any sequence
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddText()}
                  className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-2xs hover:border-primary"
                >
                  <Type className="w-3.5 h-3.5 text-primary" /> + Add for Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddEquation()}
                  className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-2xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Pi className="w-3.5 h-3.5" /> + Add for Notation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddTable()}
                  className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-2xs hover:border-primary"
                >
                  <TableIcon className="w-3.5 h-3.5 text-primary" /> + Add for Box
                </Button>
              </div>
            </div>

            {/* Ordered Question Blocks */}
            <div className="space-y-3">
              {blocks.map((block, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === blocks.length - 1;

                return (
                  <div key={block.id || idx} className="space-y-2">
                    {/* In-Between Add Bar (Shown between items) */}
                    {idx > 0 && (
                      <div className="flex items-center justify-center gap-1.5 py-1">
                        <div className="h-px bg-border/80 flex-1" />
                        <span className="text-[10px] text-muted-foreground font-semibold px-1">INSERT IN BETWEEN:</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddText(idx - 1)}
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            + Text
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddEquation(idx - 1)}
                            className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
                          >
                            + Notation
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddTable(idx - 1)}
                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            + Box
                          </Button>
                        </div>
                        <div className="h-px bg-border/80 flex-1" />
                      </div>
                    )}

                    {/* Block Render */}
                    {block.type === 'text' && (
                      <div className="p-3 rounded-xl border border-border/80 bg-background shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[11px] font-semibold gap-1">
                              <Type className="w-3 h-3 text-primary" />
                              {isFirst ? 'Question Text Prompt' : `Text Section ${idx + 1}`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <QPNotationsPicker
                              onInsertSymbol={(sym) => handleInsertNotation(block.id, idx, sym)}
                              onOpenEquationBuilder={() => handleOpenAddEquation(idx)}
                            />
                            {!isFirst && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'up')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!isLast && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'down')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {blocks.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBlock(idx)}
                                className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Delete Text Section"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <Textarea
                          id={`textarea-${block.id}`}
                          value={block.content}
                          onChange={(e) => {
                            lastCursorRefs.current[block.id] = {
                              start: e.target.selectionStart ?? e.target.value.length,
                              end: e.target.selectionEnd ?? e.target.value.length
                            };
                            handleTextChange(idx, e.target.value);
                          }}
                          onSelect={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            lastCursorRefs.current[block.id] = {
                              start: target.selectionStart ?? target.value.length,
                              end: target.selectionEnd ?? target.value.length
                            };
                          }}
                          placeholder={isFirst ? "e.g. Given below solve this:" : "e.g. for the following values:"}
                          rows={2}
                          className="text-xs sm:text-sm bg-muted/20 rounded-xl resize-y"
                        />
                      </div>
                    )}

                    {block.type === 'equation' && (
                      <div className="p-3 rounded-xl border border-primary/25 bg-primary/5 shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                            <Pi className="w-3.5 h-3.5" /> Equation / Formula {idx + 1}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {!isFirst && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'up')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!isLast && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'down')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditEquation(idx)}
                              className="h-7 text-xs px-2.5 gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Edit3 className="w-3 h-3 text-primary" /> Edit Equation
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBlock(idx)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Remove Equation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div
                          onClick={() => handleOpenEditEquation(idx)}
                          className="overflow-x-auto flex justify-center py-2.5 px-3 bg-card rounded-lg border border-border/60 cursor-pointer hover:border-primary/50 transition-colors"
                          title="Click to edit equation"
                        >
                          <div
                            className="font-serif text-sm sm:text-base text-foreground tracking-wide text-center"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'table' && (
                      <div className="p-3 rounded-xl border border-border/80 bg-muted/20 shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold bg-muted border border-border flex items-center gap-1">
                            <TableIcon className="w-3.5 h-3.5 text-primary" />
                            {`Box Table ${idx + 1} (${block.tableData?.length || 2}R × ${block.tableData?.[0]?.length || 0}C)`}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {!isFirst && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'up')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!isLast && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'down')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditTable(idx)}
                              className="h-7 text-xs px-2.5 gap-1 font-semibold"
                            >
                              <Edit3 className="w-3 h-3 text-primary" /> Edit Table Grid
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBlock(idx)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Remove Box Table"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div
                          onClick={() => handleOpenEditTable(idx)}
                          className="overflow-x-auto flex justify-center py-2 bg-background/50 rounded-lg border border-border/60 cursor-pointer hover:border-primary/50 transition-colors"
                          title="Click to edit table"
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(block.content || (block.tableData ? generateTableHtml(block.tableData) : ''))
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="p-3 rounded-xl border border-border/80 bg-muted/20 shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold bg-muted text-foreground border border-border flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" /> Attached Image / Diagram {idx + 1}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {!isFirst && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'up')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!isLast && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveBlock(idx, 'down')}
                                className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBlock(idx)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Remove Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto flex justify-center py-2 bg-background/50 rounded-lg border border-border/60 max-h-48">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(block.content)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-dashed border-border/80">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAddText()}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary"
              >
                <Plus className="w-3.5 h-3.5 text-primary" /> Add for Text
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddEquation()}
                className="h-7 text-xs gap-1.5 text-primary border border-dashed border-primary/30 hover:bg-primary/10"
              >
                <Pi className="w-3.5 h-3.5" /> Add for Notation
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddTable()}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary"
              >
                <TableIcon className="w-3.5 h-3.5 text-primary" /> Add for Box
              </Button>
            </div>

            {/* Live Exam Print Preview */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-primary" /> Exam Paper Render Preview:
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-foreground shadow-xs overflow-x-auto">
                <div
                  className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(previewHtml())
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="border-t px-4 py-3 sm:px-6 sm:py-3.5 bg-muted/20 shrink-0">
            <DialogFooter className="flex flex-row items-center justify-between gap-2 border-0 p-0">
              <Button type="button" variant="ghost" onClick={onClose} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="button" onClick={handleFinalSave} className="h-8 gap-1.5 text-xs font-semibold shadow-xs">
                <Check className="w-4 h-4" /> Save Question
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Box Table Modal */}
      {isBoxModalOpen && (
        <QPBoxTableModal
          isOpen={isBoxModalOpen}
          onClose={() => {
            setIsBoxModalOpen(false);
            setActiveBlockIndex(null);
            setInsertAfterIndex(null);
          }}
          initialTableData={
            activeBlockIndex !== null && blocks[activeBlockIndex]?.type === 'table'
              ? blocks[activeBlockIndex].tableData
              : null
          }
          startWithNewBox={activeBlockIndex === null}
          questionNumber={questionNumber}
          onSaveTable={handleSaveTableFromModal}
          onDeleteTable={() => {
            if (activeBlockIndex !== null) {
              handleDeleteBlock(activeBlockIndex);
            }
            setIsBoxModalOpen(false);
            setActiveBlockIndex(null);
            setInsertAfterIndex(null);
          }}
        />
      )}

      {/* Word-Style Equation Builder Modal */}
      {isEquationModalOpen && (
        <QPEquationBuilderModal
          isOpen={isEquationModalOpen}
          onClose={() => {
            setIsEquationModalOpen(false);
            setActiveBlockIndex(null);
            setInsertAfterIndex(null);
          }}
          questionNumber={questionNumber}
          initialText={
            activeBlockIndex !== null && blocks[activeBlockIndex]?.type === 'equation'
              ? (() => {
                  const div = document.createElement('div');
                  div.innerHTML = blocks[activeBlockIndex].content;
                  return div.textContent?.trim() || blocks[activeBlockIndex].content;
                })()
              : ''
          }
          onInsertEquation={handleSaveEquationFromModal}
        />
      )}
    </>
  );
};

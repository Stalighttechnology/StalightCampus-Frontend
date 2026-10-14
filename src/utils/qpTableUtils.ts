
/**
 * Utilities for parsing, formatting, and generating box-type data tables
 * in Question Paper content.
 */

export type QPContentBlockType = 'text' | 'equation' | 'table' | 'image';

export interface QPContentBlock {
  id: string;
  type: QPContentBlockType;
  content: string; // text string, or equation HTML, or table HTML, or image HTML
  tableData?: string[][]; // parsed table data if type === 'table'
}

export interface ParsedQPContent {
  textPrompt: string;
  tableData: string[][] | null;
  tablesData: string[][][];
  tableHtml: string | null;
  tablesHtml: string[];
  equationHtml: string | null;
  equationsHtml: string[];
  blocks: QPContentBlock[];
}

/**
 * Strips all HTML break tags (<br>, <br/>, <br />) and leading/trailing whitespace
 * so raw HTML break tags never leak into the input fields.
 */
export const cleanPromptText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?p>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
};

/**
 * Parses sequential question content blocks in exact order.
 * Allows entering question text before, after, or in between multiple equations and tables.
 */
export const extractQPBlocks = (htmlContent: string): QPContentBlock[] => {
  if (!htmlContent) {
    return [{ id: 'b-' + Math.random().toString(36).substring(2, 9), type: 'text', content: '' }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const blocks: QPContentBlock[] = [];
  let pendingText = '';

  const flushText = () => {
    const cleaned = cleanPromptText(pendingText);
    if (cleaned) {
      blocks.push({
        id: 'b-' + Math.random().toString(36).substring(2, 9),
        type: 'text',
        content: cleaned
      });
    }
    pendingText = '';
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pendingText += (node.textContent || '') + ' ';
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      if (tagName === 'BR') {
        pendingText += ' ';
        return;
      }

      // Check if element is an empty text placeholder
      if (el.classList.contains('qp-text-placeholder')) {
        flushText();
        blocks.push({
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'text',
          content: ''
        });
        return;
      }

      if (tagName === 'TABLE') {
        flushText();
        const rows = el.querySelectorAll('tr');
        const currentTable: string[][] = [];
        rows.forEach(row => {
          const rowData: string[] = [];
          row.querySelectorAll('th, td').forEach(cell => {
            rowData.push(cell.textContent?.trim() || '');
          });
          if (rowData.length > 0) currentTable.push(rowData);
        });
        blocks.push({
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'table',
          content: el.outerHTML,
          tableData: currentTable
        });
        return;
      }

      // Check if element is an equation
      const isEquation =
        el.classList.contains('qp-equation') ||
        el.getAttribute('style')?.includes('inline-flex') ||
        el.getAttribute('data-type') === 'equation';

      if (isEquation) {
        flushText();
        blocks.push({
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'equation',
          content: el.outerHTML
        });
        return;
      }

      // Check if element is or contains an image
      const isImage = tagName === 'IMG' || el.classList.contains('qp-image') || el.querySelector('img') !== null;
      if (isImage) {
        flushText();
        blocks.push({
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'image',
          content: el.outerHTML
        });
        return;
      }

      // If this element contains nested tables, equations, images, or placeholders, traverse its children
      const hasNested =
        el.querySelector('table, .qp-equation, span[style*="inline-flex"], div[style*="inline-flex"], img, .qp-image, .qp-text-placeholder') !== null;

      if (hasNested) {
        Array.from(el.childNodes).forEach(child => processNode(child));
        return;
      }

      // Otherwise it is normal text element (<p>, <span>, <b>, etc.)
      pendingText += (el.textContent || '') + ' ';
    }
  };

  Array.from(doc.body.childNodes).forEach(node => processNode(node));
  flushText();

  // If there's raw X Y pattern and only 1 text block, auto-parse into text + table
  if (blocks.length === 1 && blocks[0].type === 'text') {
    const autoParsed = autoParseRawXYText(blocks[0].content);
    if (autoParsed) {
      return [
        { id: 'b-' + Math.random().toString(36).substring(2, 9), type: 'text', content: autoParsed.textPrompt },
        {
          id: 'b-' + Math.random().toString(36).substring(2, 9),
          type: 'table',
          content: generateTableHtml(autoParsed.tableData),
          tableData: autoParsed.tableData
        }
      ];
    }
  }

  // Ensure there's always at least one text block if empty
  if (blocks.length === 0) {
    blocks.push({ id: 'b-' + Math.random().toString(36).substring(2, 9), type: 'text', content: '' });
  }

  return blocks;
};

/**
 * Serializes sequential question content blocks into clean HTML.
 */
export const serializeQPContentBlocks = (blocks: QPContentBlock[]): string => {
  return blocks
    .map(b => {
      if (b.type === 'text') {
        const cleaned = cleanPromptText(b.content);
        if (!cleaned) {
          // Preserve empty text block representation so it remains editable after reload/reparse
          return '<span class="qp-text-placeholder"></span>';
        }
        return cleaned;
      }
      if (b.type === 'equation') {
        if (!b.content || !b.content.trim()) return '';
        if (b.content.includes('class="qp-equation"') || b.content.includes("class='qp-equation'")) {
          return b.content;
        }
        return `<div class="qp-equation" style="display:inline-flex;align-items:center;vertical-align:middle;margin:4px 0;">${b.content}</div>`;
      }
      if (b.type === 'image') {
        return b.content || '';
      }
      return b.content || ''; // table HTML
    })
    .filter(Boolean)
    .join('<br/>');
};

/**
 * Combines question prompt, table HTML, and equation HTML cleanly without leaking tags.
 */
export const combinePromptAndTable = (
  prompt: string,
  tableHtml: string | null,
  equationHtml?: string | null
): string => {
  const cleanPrompt = cleanPromptText(prompt);
  const parts: string[] = [];
  if (cleanPrompt) parts.push(cleanPrompt);
  if (equationHtml) parts.push(equationHtml);
  if (tableHtml) parts.push(tableHtml);
  return parts.join('<br/>');
};

export const combinePromptAndAttachments = combinePromptAndTable;

/**
 * Extracts pure question prompt, attached equations, and any embedded HTML table data.
 */
export const extractTableFromContent = (htmlContent: string): ParsedQPContent => {
  const blocks = extractQPBlocks(htmlContent);

  const textBlocks = blocks.filter(b => b.type === 'text');
  const tableBlocks = blocks.filter(b => b.type === 'table');
  const eqBlocks = blocks.filter(b => b.type === 'equation');

  const tablesData = tableBlocks.map(b => b.tableData || []).filter(t => t.length > 0);
  const tablesHtml = tableBlocks.map(b => b.content);
  const equationsHtml = eqBlocks.map(b => b.content);

  return {
    textPrompt: textBlocks.map(b => b.content).join(' '),
    tableData: tablesData[0] || null,
    tablesData,
    tableHtml: tablesHtml.length > 0 ? tablesHtml.join('<br/>') : null,
    tablesHtml,
    equationHtml: equationsHtml.length > 0 ? equationsHtml.join('<br/>') : null,
    equationsHtml,
    blocks
  };
};

/**
 * Generates combined HTML for multiple box-type data tables.
 */
export const generateMultipleTablesHtml = (
  tablesList: string[][][],
  options: { hasHeader?: boolean } = {}
): string => {
  return tablesList
    .filter(t => t && t.length > 0)
    .map(t => generateTableHtml(t, options))
    .join('<br/>');
};

/**
 * Attempts to parse raw flattened text like:
 * "Find correlation for data: X 23 27 28 Y 18 22 23"
 */
export const autoParseRawXYText = (text: string): { textPrompt: string; tableData: string[][] } | null => {
  if (!text) return null;

  // Regex to detect "X ... Y ..." or "x: ... y: ..."
  const xyPattern = /(?:^|\b)(?:X|x)[\s:=]+([0-9\s.,-]+?)\s+(?:Y|y)[\s:=]+([0-9\s.,-]+)$/;
  const match = text.match(xyPattern);

  if (match) {
    const prompt = text.replace(xyPattern, '').trim();
    const xValues = match[1].trim().split(/[\s,]+/).filter(Boolean);
    const yValues = match[2].trim().split(/[\s,]+/).filter(Boolean);

    if (xValues.length > 0 && yValues.length > 0) {
      const colCount = Math.max(xValues.length, yValues.length);
      const rowX = ['X'];
      const rowY = ['Y'];

      for (let i = 0; i < colCount; i++) {
        rowX.push(xValues[i] || '');
        rowY.push(yValues[i] || '');
      }

      return {
        textPrompt: prompt,
        tableData: [rowX, rowY]
      };
    }
  }

  return null;
};

/**
 * Generates clean, accessible, print-ready HTML for a box-type data table.
 */
export const generateTableHtml = (
  tableData: string[][],
  options: { hasHeader?: boolean; fullWidth?: boolean } = {}
): string => {
  if (!tableData || tableData.length === 0) return '';

  const { hasHeader = false, fullWidth = false } = options;

  let html = `<table class="qp-data-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; border: 1.5px solid #1e293b; margin: 8px 0; text-align: center; font-size: 13px; ${fullWidth ? 'width: 100%;' : 'width: auto;'}">`;

  html += '<tbody>';
  tableData.forEach((row, rowIdx) => {
    html += '<tr style="border-bottom: 1px solid #1e293b;">';
    row.forEach((cell, colIdx) => {
      const isHeaderCell = (hasHeader && rowIdx === 0) || colIdx === 0;
      const tag = isHeaderCell ? 'th' : 'td';
      const bgStyle = isHeaderCell ? 'background-color: rgba(148, 163, 184, 0.15); font-weight: bold;' : '';
      html += `<${tag} style="border: 1px solid #1e293b; padding: 5px 10px; text-align: center; min-width: 32px; ${bgStyle}">${cell || '&nbsp;'}</${tag}>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  return html;
};

/**
 * Common mathematical and statistical notation symbols for quick insertion.
 */
export const NOTATION_CATEGORIES = [
  {
    category: 'Greek Symbols',
    symbols: [
      { label: 'θ', desc: 'Theta' },
      { label: 'σ', desc: 'Sigma (std dev)' },
      { label: 'μ', desc: 'Mu (mean)' },
      { label: 'α', desc: 'Alpha' },
      { label: 'β', desc: 'Beta' },
      { label: 'γ', desc: 'Gamma' },
      { label: 'λ', desc: 'Lambda' },
      { label: 'π', desc: 'Pi' },
      { label: 'ρ', desc: 'Rho (correlation)' },
      { label: 'Δ', desc: 'Delta' },
      { label: 'Σ', desc: 'Summation' },
      { label: 'ω', desc: 'Omega' },
      { label: 'φ', desc: 'Phi' },
      { label: 'ψ', desc: 'Psi' },
      { label: 'η', desc: 'Eta' }
    ]
  },
  {
    category: 'Math Operators',
    symbols: [
      { label: '√', desc: 'Square Root' },
      { label: '±', desc: 'Plus-Minus' },
      { label: '×', desc: 'Multiply' },
      { label: '÷', desc: 'Divide' },
      { label: '≠', desc: 'Not Equal' },
      { label: '≤', desc: 'Less than or Equal' },
      { label: '≥', desc: 'Greater than or Equal' },
      { label: '≈', desc: 'Approximately' },
      { label: '∞', desc: 'Infinity' },
      { label: '∫', desc: 'Integral' },
      { label: '∂', desc: 'Partial Derivative' },
      { label: '→', desc: 'Right Arrow' },
      { label: '↔', desc: 'Bidirectional' },
      { label: '∈', desc: 'Element of' },
      { label: '∝', desc: 'Proportional' }
    ]
  },
  {
    category: 'Subscripts & Superscripts',
    symbols: [
      { label: '²', desc: 'Squared' },
      { label: '³', desc: 'Cubed' },
      { label: 'ⁿ', desc: 'Power n' },
      { label: '⁺', desc: 'Superscript Plus' },
      { label: '⁻', desc: 'Superscript Minus' },
      { label: '⁰', desc: 'Power 0' },
      { label: '¹', desc: 'Power 1' },
      { label: '⁴', desc: 'Power 4' },
      { label: '₀', desc: 'Subscript 0' },
      { label: '₁', desc: 'Subscript 1' },
      { label: '₂', desc: 'Subscript 2' },
      { label: 'ᵢ', desc: 'Subscript i' },
      { label: 'ⱼ', desc: 'Subscript j' },
      { label: 'ₓ', desc: 'Subscript x' },
      { label: 'ᵧ', desc: 'Subscript y' }
    ]
  },
  {
    category: 'Statistical Formulas',
    symbols: [
      { label: 'tanθ', desc: 'tan theta' },
      { label: 'sinθ', desc: 'sin theta' },
      { label: 'cosθ', desc: 'cos theta' },
      { label: 'σ_x', desc: 'Sigma X' },
      { label: 'σ_y', desc: 'Sigma Y' },
      { label: 'σ_x²', desc: 'Sigma X Squared' },
      { label: 'σ_y²', desc: 'Sigma Y Squared' },
      { label: 'r²', desc: 'r Squared' },
      { label: 'x̄', desc: 'x-bar (mean)' },
      { label: 'ȳ', desc: 'y-bar (mean)' },
      { label: 'y = ax² + bx + c', desc: 'Quadratic Curve' },
      { label: 'y = a + bx', desc: 'Regression Line' },
      { label: '∑xy', desc: 'Sum of xy' },
      { label: '∑x²', desc: 'Sum of x²' }
    ]
  }
];

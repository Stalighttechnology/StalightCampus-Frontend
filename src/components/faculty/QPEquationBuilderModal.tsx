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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Pi,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Copy,
  Search,
  ClipboardPaste
} from 'lucide-react';
import { NOTATION_CATEGORIES } from '@/utils/qpTableUtils';
import { sanitizeHtml } from '@/utils/sanitize';

interface QPEquationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertEquation: (equationText: string) => void;
  questionNumber?: string;
  initialText?: string;
}

interface EquationTemplate {
  name: string;
  category: 'fraction' | 'script' | 'radical' | 'integral' | 'bracket' | 'preset';
  preview: string;
  fields: { label: string; placeholder: string; defaultValue?: string }[];
  build: (values: Record<string, string>) => { text: string; html: string };
}

const EQUATION_TEMPLATES: EquationTemplate[] = [
  // Fractions
  {
    name: 'Standard Fraction (a / b)',
    category: 'fraction',
    preview: 'a / b',
    fields: [
      { label: 'Numerator (Top)', placeholder: 'e.g. 1 - r²', defaultValue: '1 - r²' },
      { label: 'Denominator (Bottom)', placeholder: 'e.g. √(n - 2)', defaultValue: '√(n - 2)' }
    ],
    build: (v) => ({
      text: `(${v['Numerator (Top)'] || 'a'}) / (${v['Denominator (Bottom)'] || 'b'})`,
      html: `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.95em;margin:0 2px;"><span style="display:block;border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">${v['Numerator (Top)'] || 'a'}</span><span style="display:block;padding:0 4px;font-weight:500;">${v['Denominator (Bottom)'] || 'b'}</span></span>`
    })
  },
  {
    name: 'Derivative (dy / dx)',
    category: 'fraction',
    preview: 'dy / dx',
    fields: [
      { label: 'Dependent Variable', placeholder: 'y', defaultValue: 'y' },
      { label: 'Independent Variable', placeholder: 'x', defaultValue: 'x' }
    ],
    build: (v) => ({
      text: `d${v['Dependent Variable'] || 'y'}/d${v['Independent Variable'] || 'x'}`,
      html: `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.95em;margin:0 2px;"><span style="display:block;border-bottom:1.5px solid currentColor;padding:0 3px;">d${v['Dependent Variable'] || 'y'}</span><span style="display:block;padding:0 3px;">d${v['Independent Variable'] || 'x'}</span></span>`
    })
  },
  {
    name: 'Partial Derivative (∂f / ∂x)',
    category: 'fraction',
    preview: '∂f / ∂x',
    fields: [
      { label: 'Function', placeholder: 'f', defaultValue: 'f' },
      { label: 'Variable', placeholder: 'x', defaultValue: 'x' }
    ],
    build: (v) => ({
      text: `∂${v['Function'] || 'f'}/∂${v['Variable'] || 'x'}`,
      html: `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.95em;margin:0 2px;"><span style="display:block;border-bottom:1.5px solid currentColor;padding:0 3px;">∂${v['Function'] || 'f'}</span><span style="display:block;padding:0 3px;">∂${v['Variable'] || 'x'}</span></span>`
    })
  },

  // Scripts (Powers & Indices)
  {
    name: 'Power / Superscript (xⁿ)',
    category: 'script',
    preview: 'xⁿ',
    fields: [
      { label: 'Base', placeholder: 'e.g. (1 - r)', defaultValue: '(1 - r)' },
      { label: 'Exponent / Power', placeholder: 'e.g. 2, 3, n', defaultValue: '2' }
    ],
    build: (v) => {
      const base = v['Base'] || 'x';
      const exp = v['Exponent / Power'] || '2';
      const supMap: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
        'n': 'ⁿ', 'i': 'ⁱ'
      };
      const unicodeExp = exp.split('').map(c => supMap[c] || c).join('');
      return {
        text: `${base}${unicodeExp}`,
        html: `<span>${base}<sup>${exp}</sup></span>`
      };
    }
  },
  {
    name: 'Subscript / Index (xᵢ)',
    category: 'script',
    preview: 'xᵢ',
    fields: [
      { label: 'Base Variable', placeholder: 'e.g. x, y, a', defaultValue: 'x' },
      { label: 'Subscript / Index', placeholder: 'e.g. 1, 2, i, n', defaultValue: 'i' }
    ],
    build: (v) => {
      const base = v['Base Variable'] || 'x';
      const sub = v['Subscript / Index'] || 'i';
      const subMap: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
        'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
        'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
        's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
      };
      const unicodeSub = sub.split('').map(c => subMap[c] || c).join('');
      return {
        text: `${base}${unicodeSub}`,
        html: `<span>${base}<sub>${sub}</sub></span>`
      };
    }
  },

  // Radicals (Square roots & n-th roots)
  {
    name: 'Square Root (√x)',
    category: 'radical',
    preview: '√x',
    fields: [
      { label: 'Expression inside Root', placeholder: 'e.g. 1 - r², n - 1', defaultValue: '1 - r²' }
    ],
    build: (v) => ({
      text: `√(${v['Expression inside Root'] || 'x'})`,
      html: `<span>√<span style="border-top:1px solid currentColor;padding:0 2px;">${v['Expression inside Root'] || 'x'}</span></span>`
    })
  },
  {
    name: 'N-th Root (ⁿ√x)',
    category: 'radical',
    preview: 'ⁿ√x',
    fields: [
      { label: 'Root Degree (n)', placeholder: 'e.g. 3, n', defaultValue: '3' },
      { label: 'Expression inside Root', placeholder: 'e.g. x + y', defaultValue: 'x + y' }
    ],
    build: (v) => ({
      text: `${v['Root Degree (n)'] || 'n'}√(${v['Expression inside Root'] || 'x'})`,
      html: `<span><sup>${v['Root Degree (n)'] || 'n'}</sup>√<span style="border-top:1px solid currentColor;padding:0 2px;">${v['Expression inside Root'] || 'x'}</span></span>`
    })
  },

  // Summation & Integrals
  {
    name: 'Summation (∑)',
    category: 'integral',
    preview: '∑ xᵢ',
    fields: [
      { label: 'Index / Lower limit', placeholder: 'e.g. i=1', defaultValue: 'i=1' },
      { label: 'Upper limit', placeholder: 'e.g. n, N', defaultValue: 'n' },
      { label: 'Term / Expression', placeholder: 'e.g. xᵢ, (x - x̄)²', defaultValue: 'xᵢ' }
    ],
    build: (v) => ({
      text: `∑(${v['Index / Lower limit'] || 'i=1'} to ${v['Upper limit'] || 'n'}) ${v['Term / Expression'] || 'xᵢ'}`,
      html: `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.85em;margin:0 2px;"><span style="font-size:0.8em;">${v['Upper limit'] || 'n'}</span><span style="font-size:1.4em;line-height:1;">∑</span><span style="font-size:0.8em;">${v['Index / Lower limit'] || 'i=1'}</span></span><span>${v['Term / Expression'] || 'xᵢ'}</span>`
    })
  },
  {
    name: 'Definite Integral (∫)',
    category: 'integral',
    preview: '∫ f(x) dx',
    fields: [
      { label: 'Lower Limit (a)', placeholder: 'e.g. 0', defaultValue: '0' },
      { label: 'Upper Limit (b)', placeholder: 'e.g. 1, ∞, π', defaultValue: '1' },
      { label: 'Integrand Function', placeholder: 'e.g. x² + 2x', defaultValue: 'x² + 2x' },
      { label: 'Differential', placeholder: 'e.g. dx, dt', defaultValue: 'dx' }
    ],
    build: (v) => ({
      text: `∫(${v['Lower Limit (a)'] || 'a'} to ${v['Upper Limit (b)'] || 'b'}) [${v['Integrand Function'] || 'f(x)'}] ${v['Differential'] || 'dx'}`,
      html: `<span style="display:inline-flex;align-items:center;margin:0 2px;"><span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.85em;"><span style="font-size:0.8em;">${v['Upper Limit (b)'] || 'b'}</span><span style="font-size:1.4em;line-height:1;">∫</span><span style="font-size:0.8em;">${v['Lower Limit (a)'] || 'a'}</span></span><span>(${v['Integrand Function'] || 'f(x)'}) ${v['Differential'] || 'dx'}</span></span>`
    })
  }
];

// Pre-built Exam Formulas with Rich Visual Mathematical HTML
export const PRESET_FORMULAS: {
  category: string;
  name: string;
  formula: string;
  html: string;
}[] = [
  {
    category: 'Statistics & Correlation',
    name: 'Angle between Regression Lines (tan θ)',
    formula: 'tanθ = [(1 - r²) / r] · [σₓσᵧ / (σₓ² + σᵧ²)]',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>tanθ = </span><span style="display:inline-flex;align-items:center;"><span style="font-size:1.4em;">(</span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 2px;">1 - r²</span><span>r</span></span><span style="font-size:1.4em;">)</span></span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 2px;">σₓσᵧ</span><span>σₓ² + σᵧ²</span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: "Karl Pearson's Correlation (Raw)",
    formula: 'r = [N∑XY - (∑X)(∑Y)] / √{[N∑X² - (∑X)²][N∑Y² - (∑Y)²]}',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>r = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">N∑XY - (∑X)(∑Y)</span><span style="padding:0 4px;display:inline-flex;align-items:center;justify-content:center;"><span style="font-size:1.3em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:0 3px;">{[N∑X² - (∑X)²][N∑Y² - (∑Y)²]}</span></span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: "Karl Pearson's Correlation (Deviations)",
    formula: 'r = ∑(X - X̄)(Y - Ȳ) / √[∑(X - X̄)² · ∑(Y - Ȳ)²]',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>r = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">∑(X - X̄)(Y - Ȳ)</span><span style="padding:0 4px;display:inline-flex;align-items:center;justify-content:center;"><span style="font-size:1.3em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:0 3px;">[∑(X - X̄)² · ∑(Y - Ȳ)²]</span></span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: "Spearman's Rank Correlation",
    formula: 'ρ = 1 - [6∑d² / (n(n² - 1))]',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>ρ = 1 - </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">6∑d²</span><span style="padding:0 4px;font-weight:500;">n(n² - 1)</span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: 'Standard Deviation (σ)',
    formula: 'σ = √[∑(x - x̄)² / N]',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>σ = </span><span style="display:inline-flex;align-items:center;"><span style="font-size:1.3em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:0 4px;display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;"><span style="border-bottom:1.5px solid currentColor;padding:0 3px;">∑(x - x̄)²</span><span style="padding:0 3px;">N</span></span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: 'Arithmetic Mean (x̄)',
    formula: 'x̄ = (∑x) / N',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>x̄ = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">∑x</span><span style="padding:0 4px;font-weight:500;">N</span></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: 'Regression Line (Y on X)',
    formula: '(Y - Ȳ) = bᵧₓ(X - X̄)',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>(Y - Ȳ) = bᵧₓ(X - X̄)</span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: 'Binomial Probability Distribution',
    formula: 'P(X = r) = ⁿCᵣ · pʳ · qⁿ⁻ʳ',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>P(X = r) = </span><span><sup>n</sup>C<sub>r</sub> · p<sup>r</sup> · q<sup>n-r</sup></span></span>'
  },
  {
    category: 'Statistics & Correlation',
    name: 'Poisson Distribution',
    formula: 'P(X = x) = (e⁻ᵝ · λˣ) / x!',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>P(X = x) = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">e<sup>-λ</sup> · λ<sup>x</sup></span><span style="padding:0 4px;font-weight:500;">x!</span></span></span>'
  },
  {
    category: 'Algebra & Calculus',
    name: 'Quadratic Formula',
    formula: 'x = (-b ± √(b² - 4ac)) / (2a)',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>x = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.92em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;display:inline-flex;align-items:center;gap:2px;"><span>-b ± </span><span style="display:inline-flex;align-items:center;"><span style="font-size:1.2em;line-height:1;">√</span><span style="border-top:1.5px solid currentColor;padding:0 2px;">(b² - 4ac)</span></span></span><span style="padding:0 4px;font-weight:500;">2a</span></span></span>'
  },
  {
    category: 'Algebra & Calculus',
    name: 'Pythagorean Theorem',
    formula: 'a² + b² = c²',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>a² + b² = c²</span></span>'
  },
  {
    category: 'Algebra & Calculus',
    name: 'Product Rule (Derivatives)',
    formula: 'd(uv)/dx = u(dv/dx) + v(du/dx)',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 2px;">d(uv)</span><span>dx</span></span><span> = u </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 2px;">dv</span><span>dx</span></span><span> + v </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 2px;">du</span><span>dx</span></span></span>'
  },
  {
    category: 'Algebra & Calculus',
    name: 'Integration by Parts',
    formula: '∫ u·v dx = u∫v dx - ∫[u\'(∫v dx)] dx',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>∫ u·v dx = u∫v dx - ∫[u\'(∫v dx)] dx</span></span>'
  },
  {
    category: 'Physics & Engineering',
    name: "Ohm's Law",
    formula: 'V = I · R',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>V = I · R</span></span>'
  },
  {
    category: 'Physics & Engineering',
    name: 'Kinetic Energy',
    formula: 'KE = ½ · m · v²',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>KE = </span><span style="display:inline-flex;flex-direction:column;text-align:center;font-size:0.9em;padding:0 2px;"><span style="border-bottom:1.5px solid currentColor;padding:0 3px;">1</span><span style="padding:0 3px;">2</span></span><span> · m · v²</span></span>'
  },
  {
    category: 'Physics & Engineering',
    name: "Einstein's Mass-Energy",
    formula: 'E = m · c²',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>E = m · c²</span></span>'
  },
  {
    category: 'Physics & Engineering',
    name: 'Wave Equation',
    formula: 'v = f · λ',
    html: '<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:4px;"><span>v = f · λ</span></span>'
  }
];

/**
 * Intelligent Math-to-HTML converter for freeform formulas, fractions, and square roots.
 */
export const formatMathToHtml = (input: string): string => {
  if (!input) return '';

  const matched = PRESET_FORMULAS.find(p => p.formula === input);
  if (matched) return matched.html;

  let res = input;

  // Convert roots: √(expr), √{expr}, √[expr]
  res = res.replace(/√(?:\(([^)]+)\)|\{([^}]+)\}|\[([^\]]+)\])/g, (_, p1, p2, p3) => {
    const inner = p1 || p2 || p3;
    return `<span style="display:inline-flex;align-items:center;margin:0 1px;"><span style="font-size:1.25em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:0 3px;">${inner}</span></span>`;
  });

  // Convert fractions: (num) / (den) or [num] / [den] or simple term / term
  res = res.replace(/(?:\(([^)]+)\)|\[([^\]]+)\]|([a-zA-Z0-9∑_·\^²³ⁿᵢ₁₂\-+]+))\s*\/\s*(?:\(([^)]+)\)|\[([^\]]+)\]|([a-zA-Z0-9∑_·\^²³ⁿᵢ₁₂\-+]+))/g, (_, n1, n2, n3, d1, d2, d3) => {
    const num = n1 || n2 || n3;
    const den = d1 || d2 || d3;
    return `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:0.92em;margin:0 2px;"><span style="display:block;border-bottom:1.5px solid currentColor;padding:0 4px;font-weight:500;">${num}</span><span style="display:block;padding:0 4px;font-weight:500;">${den}</span></span>`;
  });

  return `<span style="display:inline-flex;align-items:center;font-size:1.05em;gap:3px;">${res}</span>`;
};

export const QPEquationBuilderModal: React.FC<QPEquationBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsertEquation,
  questionNumber = "",
  initialText = ""
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EquationTemplate>(EQUATION_TEMPLATES[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [equationMode, setEquationMode] = useState<'template' | 'presets' | 'freeform'>('template');
  const [freeformEquation, setFreeformEquation] = useState<string>(initialText || '(1 - r²)');
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_FORMULAS[0].formula);
  const [formulaSearch, setFormulaSearch] = useState('');
  const [insertFormat, setInsertFormat] = useState<'unicode' | 'html'>('unicode');

  const freeformInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialText && initialText.trim()) {
        setEquationMode('freeform');
        setFreeformEquation(initialText.trim());
      } else {
        setEquationMode('template');
        setFreeformEquation('(1 - r²)');
      }
    }
  }, [isOpen, initialText]);

  // Initialize field values when template changes
  useEffect(() => {
    const defaults: Record<string, string> = {};
    selectedTemplate.fields.forEach(f => {
      defaults[f.label] = f.defaultValue || '';
    });
    setFieldValues(defaults);
  }, [selectedTemplate]);

  // Convert typed math shortcuts into clean Unicode math in real-time
  const smartConvertMath = (input: string): string => {
    return input
      .replace(/\^2\b/g, '²')
      .replace(/\^3\b/g, '³')
      .replace(/\^0\b/g, '⁰')
      .replace(/\^1\b/g, '¹')
      .replace(/\^n\b/g, 'ⁿ')
      .replace(/\^i\b/g, 'ⁱ')
      .replace(/\b_1\b/g, '₁')
      .replace(/\b_2\b/g, '₂')
      .replace(/\b_i\b/g, 'ᵢ')
      .replace(/\b_n\b/g, 'ₙ')
      .replace(/\b_x\b/g, 'ₓ')
      .replace(/\b_y\b/g, 'ᵧ')
      .replace(/sqrt\(/gi, '√(')
      .replace(/\+\/-/g, '±')
      .replace(/<=\b/g, '≤')
      .replace(/>=\b/g, '≥')
      .replace(/!=\b/g, '≠')
      .replace(/\btheta\b/gi, 'θ')
      .replace(/\balpha\b/gi, 'α')
      .replace(/\bbeta\b/gi, 'β')
      .replace(/\bgamma\b/gi, 'γ')
      .replace(/\bsigma_x\b/gi, 'σₓ')
      .replace(/\bsigma_y\b/gi, 'σᵧ')
      .replace(/\bsigma\b/gi, 'σ')
      .replace(/\blambda\b/gi, 'λ')
      .replace(/\bmu\b/gi, 'μ')
      .replace(/\bpi\b/gi, 'π')
      .replace(/\bomega\b/gi, 'ω')
      .replace(/\bsum\b/gi, '∑')
      .replace(/\binf\b/gi, '∞');
  };

  const handleFieldChange = (label: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [label]: value
    }));
  };

  const getCurrentEquationOutput = (): { text: string; html: string } => {
    if (equationMode === 'template') {
      return selectedTemplate.build(fieldValues);
    }
    if (equationMode === 'presets') {
      const matched = PRESET_FORMULAS.find(p => p.formula === selectedPreset) || PRESET_FORMULAS[0];
      return {
        text: matched.formula,
        html: matched.html || formatMathToHtml(matched.formula)
      };
    }
    const cleanText = smartConvertMath(freeformEquation);
    const matchedPreset = PRESET_FORMULAS.find(p => p.formula === freeformEquation);
    const htmlToUse = matchedPreset?.html || formatMathToHtml(cleanText);
    return {
      text: cleanText,
      html: htmlToUse
    };
  };

  const handleInsert = () => {
    const output = getCurrentEquationOutput();
    const resultToInsert = insertFormat === 'html' ? output.html : output.text;
    onInsertEquation(resultToInsert);
    onClose();
  };

  const insertSymbolIntoFreeform = (symbol: string) => {
    const input = freeformInputRef.current;
    if (!input) {
      setFreeformEquation(prev => prev + symbol);
      return;
    }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const updated = freeformEquation.slice(0, start) + symbol + freeformEquation.slice(end);
    setFreeformEquation(updated);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 10);
  };

  const currentOutput = getCurrentEquationOutput();

  const filteredPresets = PRESET_FORMULAS.filter(item =>
    item.name.toLowerCase().includes(formulaSearch.toLowerCase()) ||
    item.formula.toLowerCase().includes(formulaSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(formulaSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[96vw] sm:w-[92vw] p-0 rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border bg-background text-foreground">
        {/* Fixed Header */}
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Pi className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                  Equation Builder
                  <Badge variant="outline" className="text-[10px] font-normal py-0 hidden sm:inline-flex">Word Style</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Insert math equations, fractions & exam formulas {questionNumber ? `for Question ${questionNumber}` : ''}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Top Mode Navigation Tabs */}
          <div className="pt-2 border-t mt-2">
            <div className="w-full grid grid-cols-3 p-1 bg-muted/70 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => setEquationMode('template')}
                className={`w-full py-1.5 px-1.5 sm:px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  equationMode === 'template'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <span className="hidden sm:inline">Structures (Word)</span>
                <span className="sm:hidden">Structures</span>
              </button>
              <button
                type="button"
                onClick={() => setEquationMode('presets')}
                className={`w-full py-1.5 px-1.5 sm:px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  equationMode === 'presets'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Exam Formulas</span>
                <span className="sm:hidden">Formulas</span>
              </button>
              <button
                type="button"
                onClick={() => setEquationMode('freeform')}
                className={`w-full py-1.5 px-1.5 sm:px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  equationMode === 'freeform'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <span className="hidden sm:inline">Freeform Typing</span>
                <span className="sm:hidden">Freeform</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 min-h-0 custom-scrollbar space-y-4">
          {/* MODE 1: WORD-STYLE STRUCTURE TEMPLATES */}
          {equationMode === 'template' && (
            <div className="space-y-4">
              {/* Template Selector Ribbon */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Equation Structure:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {EQUATION_TEMPLATES.map((tmpl, idx) => {
                    const isSelected = selectedTemplate.name === tmpl.name;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary text-foreground'
                            : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="text-xs font-semibold line-clamp-1">{tmpl.name}</span>
                        <span className="font-mono text-sm text-primary font-bold">{tmpl.preview}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Input Fields */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Configure {selectedTemplate.name}:</span>
                  <span className="text-[11px] text-muted-foreground">Type values or use shortcuts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTemplate.fields.map((field, fIdx) => (
                    <div key={fIdx} className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">{field.label}</label>
                      <Input
                        value={fieldValues[field.label] || ''}
                        onChange={(e) => handleFieldChange(field.label, smartConvertMath(e.target.value))}
                        placeholder={field.placeholder}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: EXAM FORMULA PRESETS (1-CLICK) */}
          {equationMode === 'presets' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Standard University & Higher Secondary Exam Formulas:
                </span>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={formulaSearch}
                    onChange={(e) => setFormulaSearch(e.target.value)}
                    placeholder="Filter formulas (regression, mean...)"
                    className="h-8 pl-8 pr-2 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredPresets.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
                    No formulas found matching "{formulaSearch}".
                  </div>
                ) : (
                  filteredPresets.map((item, pIdx) => {
                    const isSelected = selectedPreset === item.formula;
                    return (
                      <div
                        key={pIdx}
                        onClick={() => {
                          setSelectedPreset(item.formula);
                          setFreeformEquation(item.formula);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 group ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                            : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold transition-colors line-clamp-1 ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                            {item.name}
                          </span>
                          <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] py-0 px-1.5 whitespace-nowrap shrink-0">
                            {item.category}
                          </Badge>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground group-hover:text-foreground overflow-x-auto whitespace-nowrap py-0.5 custom-scrollbar">
                          {item.formula}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MODE 3: FREEFORM EQUATION TYPING */}
          {equationMode === 'freeform' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-foreground">Type Equation with Word Math Shortcuts:</span>
                  <span className="text-[11px] text-muted-foreground">Type ^2 for ², sqrt(x) for √x, +/- for ±</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste or type equation content below (from MS Word, PDF, or notes). Math shortcuts and symbols convert automatically:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    ref={freeformInputRef}
                    value={freeformEquation}
                    onChange={(e) => setFreeformEquation(smartConvertMath(e.target.value))}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        const converted = smartConvertMath(pasted);
                        const input = freeformInputRef.current;
                        if (input) {
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          const updated = freeformEquation.slice(0, start) + converted + freeformEquation.slice(end);
                          setFreeformEquation(updated);
                        } else {
                          setFreeformEquation(converted);
                        }
                      }
                    }}
                    placeholder="e.g. (1 - r²) / √(n - 2) or paste copied equation"
                    className="h-9 text-xs sm:text-sm font-mono bg-background flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) {
                          setFreeformEquation(smartConvertMath(clipText.trim()));
                        }
                      } catch {
                        // Clipboard permission or fallback
                      }
                    }}
                    className="h-9 px-2.5 text-xs font-semibold gap-1.5 shrink-0 border-border/80 hover:bg-muted"
                    title="Paste copied equation from clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-primary" />
                    <span className="hidden sm:inline">Paste Content</span>
                    <span className="sm:hidden">Paste</span>
                  </Button>
                </div>
              </div>

              {/* Quick Math Symbols Palette */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Symbols (Click to insert at cursor):
                </span>
                <div className="flex flex-wrap gap-1 p-2 rounded-xl border bg-muted/20">
                  {['²', '³', 'ⁿ', 'ᵢ', '₁', '₂', '√', '±', '∑', '∫', '∂', 'θ', 'σ', 'μ', 'π', 'λ', 'ρ', '≤', '≥', '≠', '≈', '∞', '·', '÷'].map((sym, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertSymbolIntoFreeform(sym)}
                      className="h-7 w-7 flex items-center justify-center rounded-md border border-border/80 bg-background hover:bg-primary hover:text-primary-foreground font-semibold text-xs shadow-2xs transition-all active:scale-95"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Live Preview */}
        <div className="border-t px-4 py-3 sm:px-6 sm:py-3.5 bg-muted/20 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-muted-foreground">Live Equation Preview:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] hidden sm:inline">Format:</span>
              <div className="flex rounded-md border p-0.5 bg-card text-[11px]">
                <button
                  type="button"
                  onClick={() => setInsertFormat('unicode')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    insertFormat === 'unicode'
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Plain text Unicode equations (e.g. (1 - r²)). Fits in all inputs & mobile screens."
                >
                  Standard (Unicode)
                </button>
                <button
                  type="button"
                  onClick={() => setInsertFormat('html')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    insertFormat === 'html'
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Formatted visual fraction lines & stacked symbols"
                >
                  Formatted (HTML)
                </button>
              </div>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl border bg-card flex justify-center items-center overflow-x-auto shadow-2xs min-h-[44px] max-h-[64px]">
            {insertFormat === 'html' ? (
              <div
                className="text-sm sm:text-base font-serif"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentOutput.html) }}
              />
            ) : (
              <div className="text-sm sm:text-base font-serif tracking-wide text-foreground">
                {currentOutput.text}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-1 border-0">
            <Button type="button" variant="ghost" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="button" onClick={handleInsert} className="h-8 gap-1.5 text-xs font-semibold shadow-xs">
              <Check className="w-4 h-4" /> Insert Equation into Question
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

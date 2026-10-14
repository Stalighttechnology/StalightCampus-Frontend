import React, { useState } from 'react';
import { NOTATION_CATEGORIES } from '@/utils/qpTableUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pi, Search, Sigma } from 'lucide-react';

interface QPNotationsPickerProps {
  onInsertSymbol: (symbol: string) => void;
  onOpenEquationBuilder?: () => void;
  triggerButtonText?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export const QPNotationsPicker: React.FC<QPNotationsPickerProps> = ({
  onInsertSymbol,
  onOpenEquationBuilder,
  triggerButtonText = "Notations",
  triggerClassName = "",
  disabled = false
}) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredCategories = NOTATION_CATEGORIES.map(cat => ({
    ...cat,
    symbols: cat.symbols.filter(s =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat =>
    (activeTab === "all" || cat.category.toLowerCase().includes(activeTab.toLowerCase())) &&
    cat.symbols.length > 0
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          variant="outline"
          size="sm"
          disabled={disabled}
          title="Insert Math & Statistical Notations (θ, σ, ², √, etc.)"
          className={`h-8 gap-1.5 text-xs font-medium border-border/80 hover:bg-primary/10 hover:text-primary transition-colors ${triggerClassName}`}
        >
          <Pi className="w-3.5 h-3.5 text-primary" />
          <span>{triggerButtonText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-3 shadow-xl border bg-card text-foreground z-50 rounded-xl" align="start">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <Sigma className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold">Math & Statistical Notations</span>
          </div>
          {onOpenEquationBuilder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenEquationBuilder}
              className="h-6 text-[10px] px-2 py-0 gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
              title="Open Microsoft Word style equation builder"
            >
              <Pi className="w-3 h-3" /> Word Equation
            </Button>
          ) : (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
              Click to Insert
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative my-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search θ, sigma, squared, root..."
            className="h-8 pl-8 pr-2 text-xs rounded-lg bg-background"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-2 custom-scrollbar text-[10px]">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("all")}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            All
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("greek")}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${activeTab === 'greek' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Greek
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("operators")}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${activeTab === 'operators' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Operators
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("subscripts")}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${activeTab === 'subscripts' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Super/Sub
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("statistical")}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${activeTab === 'statistical' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Formulas
          </button>
        </div>

        {/* Symbols Grid */}
        <div className="max-h-56 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredCategories.length === 0 ? (
            <p className="text-center py-4 text-xs text-muted-foreground">No matching notations found</p>
          ) : (
            filteredCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat.category}
                </div>
                <div className="flex flex-wrap gap-1">
                  {cat.symbols.map((sym, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onInsertSymbol(sym.label)}
                      title={`${sym.desc} (${sym.label})`}
                      className="h-7 min-w-[32px] px-1.5 flex items-center justify-center rounded-md border border-border/80 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-semibold transition-all active:scale-95 shadow-xs"
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

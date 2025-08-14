import { createContext, useContext, ReactNode, useState, useMemo, useCallback } from "react";

interface Filters {
  regionId?: number;
  subRegionId?: number;
  serviceLineId?: number;
}

interface FiltersContextType {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  clearFilters: () => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>({});

  const clearFilters = useCallback(() => {
    console.log('🔄 Clearing filters');
    setFilters({});
  }, []);

  const contextValue = useMemo(() => ({
    filters,
    setFilters,
    clearFilters
  }), [filters, clearFilters]);

  return (
    <FiltersContext.Provider value={contextValue}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
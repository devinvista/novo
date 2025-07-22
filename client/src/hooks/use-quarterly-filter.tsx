import { createContext, useContext, ReactNode, useState } from "react";

interface QuarterlyFilterContextType {
  selectedQuarter: string;
  setSelectedQuarter: (quarter: string) => void;
}

const QuarterlyFilterContext = createContext<QuarterlyFilterContextType | undefined>(undefined);

export function QuarterlyFilterProvider({ children }: { children: ReactNode }) {
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");

  return (
    <QuarterlyFilterContext.Provider 
      value={{ selectedQuarter, setSelectedQuarter }}
    >
      {children}
    </QuarterlyFilterContext.Provider>
  );
}

export function useQuarterlyFilter() {
  const context = useContext(QuarterlyFilterContext);
  if (context === undefined) {
    throw new Error('useQuarterlyFilter must be used within a QuarterlyFilterProvider');
  }
  return context;
}
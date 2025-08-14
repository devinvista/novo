import { useState } from "react";

import CompactHeader from "@/components/compact-header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import Filters from "@/components/filters";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

export default function Indicators() {
  const { selectedQuarter } = useQuarterlyFilter();
  const [filters, setFilters] = useState<{
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  }>({});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="p-6 border-b bg-white pt-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Indicadores Estratégicos</h2>
              <p className="text-gray-600">Acompanhe os indicadores estratégicos da organização</p>
            </div>
          </div>
        </div>
        
        <Filters filters={filters} onFiltersChange={setFilters} />
        
        <div className="flex-1 overflow-y-auto p-6">
          <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
        </div>
      </main>
    </div>
  );
}
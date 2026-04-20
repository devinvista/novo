import CompactHeader from "@/components/compact-header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useFilters } from "@/hooks/use-filters";

export default function Indicators() {
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={true} />

        <div className="p-6 border-b bg-white pt-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Indicadores Estratégicos</h2>
            <p className="text-gray-600">Acompanhe os indicadores estratégicos da organização</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
        </div>
      </main>
    </div>
  );
}

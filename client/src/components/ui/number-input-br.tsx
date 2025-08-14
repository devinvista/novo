import * as React from "react";
import { cn } from "@/lib/utils";
import { maskBRNumber, parseDecimalBR, formatBrazilianNumber } from "@/lib/formatters";

export interface NumberInputBRProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: string | number;
  onChange?: (value: string) => void;
  decimals?: number;
}

const NumberInputBR = React.forwardRef<HTMLInputElement, NumberInputBRProps>(
  ({ className, value, onChange, decimals = 2, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>(() => {
      if (value === undefined || value === null || value === "") return "";
      // Usar formatação inteligente (sem decimais desnecessários)
      return formatBrazilianNumber(value.toString());
    });

    // Atualiza valor interno quando prop value muda
    React.useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setInternalValue("");
      } else {
        // Usar formatação inteligente (sem decimais desnecessários)
        setInternalValue(formatBrazilianNumber(value.toString()));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      console.log('🔢 NumberInputBR - Raw input:', rawValue);
      
      // Permitir digitação livre, removendo apenas caracteres não-numéricos (exceto vírgula e ponto)
      let newValue = rawValue.replace(/[^\d.,]/g, "");
      console.log('🔢 NumberInputBR - After cleanup:', newValue);
      
      // Normalizar separador decimal para vírgula
      if (newValue.includes(".") && !newValue.includes(",")) {
        newValue = newValue.replace(/\./g, ",");
      }
      
      // Permitir apenas uma vírgula como separador decimal
      const commas = newValue.split(",");
      if (commas.length > 2) {
        newValue = commas[0] + "," + commas.slice(1).join("");
      }
      
      console.log('🔢 NumberInputBR - Final value:', newValue);
      setInternalValue(newValue);
      
      if (onChange) {
        onChange(newValue);
      }
    };

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={internalValue}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);

NumberInputBR.displayName = "NumberInputBR";

export { NumberInputBR };
export default NumberInputBR;
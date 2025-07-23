import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { convertDateBRToISO, convertISOToDateBR, formatDateBR, isValidDateBR } from "@/lib/formatters";

interface DateInputBRProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string; // ISO format (YYYY-MM-DD)
  onChange?: (value: string) => void; // Returns ISO format
  placeholder?: string;
}

const DateInputBR = forwardRef<HTMLInputElement, DateInputBRProps>(
  ({ value = "", onChange, placeholder = "DD/MM/AAAA", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => {
      // Convert ISO to Brazilian format for display
      return value ? convertISOToDateBR(value) : "";
    });
    const [isValid, setIsValid] = useState(true);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Remove non-numeric characters except /
      inputValue = inputValue.replace(/[^\d/]/g, "");
      
      // Add slashes automatically
      if (inputValue.length >= 2 && inputValue[2] !== '/') {
        inputValue = inputValue.slice(0, 2) + '/' + inputValue.slice(2);
      }
      if (inputValue.length >= 5 && inputValue[5] !== '/') {
        inputValue = inputValue.slice(0, 5) + '/' + inputValue.slice(5);
      }
      
      // Limit to DD/MM/YYYY format
      if (inputValue.length > 10) {
        inputValue = inputValue.slice(0, 10);
      }
      
      setDisplayValue(inputValue);
      
      // Validate and convert to ISO for parent component
      if (inputValue.length === 10) {
        const isValidDate = isValidDateBR(inputValue);
        setIsValid(isValidDate);
        
        if (isValidDate && onChange) {
          const isoDate = convertDateBRToISO(inputValue);
          onChange(isoDate);
        }
      } else {
        setIsValid(true); // Don't show error while typing
        if (onChange) {
          onChange(""); // Clear the ISO value
        }
      }
    };

    const handleBlur = () => {
      if (displayValue && displayValue.length === 10) {
        const isValidDate = isValidDateBR(displayValue);
        setIsValid(isValidDate);
      }
    };

    return (
      <Input
        ref={ref}
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${props.className || ""} ${!isValid ? "border-red-500" : ""}`}
        maxLength={10}
      />
    );
  }
);

DateInputBR.displayName = "DateInputBR";

export { DateInputBR };
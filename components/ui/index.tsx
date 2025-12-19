// Simple UI components using Tailwind CSS
import React from 'react';

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800',
      ghost: 'text-gray-200 hover:bg-gray-800',
      destructive: 'bg-red-600 text-white hover:bg-red-700'
    };

    const sizes = {
      default: 'px-4 py-2 text-sm',
      sm: 'px-3 py-1.5 text-xs',
      lg: 'px-6 py-3 text-base',
      icon: 'h-9 w-9'
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Label Component
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-xs font-medium text-gray-300 mb-1 ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);
Label.displayName = 'Label';

// Checkbox Component
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <input
        ref={ref}
        type="checkbox"
        className={`h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 ${className}`}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';

// Card Components
export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-4 border-b border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-semibold text-gray-200 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-gray-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

// Badge Component
export const Badge = ({
  className = '',
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' }) => {
  const variants = {
    default: 'bg-blue-600 text-white',
    secondary: 'bg-gray-700 text-gray-200',
    outline: 'border border-gray-600 text-gray-200',
    destructive: 'bg-red-600 text-white'
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Alert Components
export const Alert = ({
  className = '',
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }) => {
  const variants = {
    default: 'bg-gray-800 border-gray-700 text-gray-200',
    destructive: 'bg-red-900/50 border-red-700 text-red-200'
  };

  return (
    <div className={`p-4 border rounded-lg ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm ${className}`} {...props}>
    {children}
  </p>
);

// Tabs Components
export const Tabs = ({
  value,
  onValueChange,
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }) => {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange } as any);
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-800 p-1 text-gray-400 ${className}`} {...props}>
    {children}
  </div>
);

export const TabsTrigger = ({
  value,
  className = '',
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    const parent = e.currentTarget.closest('[data-tabs]');
    if (parent) {
      const onValueChange = (parent as any).onValueChange;
      onValueChange?.(value);
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({
  value,
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) => (
  <div className={`mt-2 ${className}`} {...props}>
    {children}
  </div>
);

// Select Components (simplified)
export const Select = ({ children, value, onValueChange }: any) => {
  return <div data-value={value} data-onvaluechange={onValueChange}>{children}</div>;
};

export const SelectTrigger = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 ${className}`} {...props}>
    {children}
  </button>
);

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder || 'Select...'}</span>
);

export const SelectContent = ({ children }: React.PropsWithChildren) => (
  <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-600 bg-gray-800 text-gray-100 shadow-md">
    {children}
  </div>
);

export const SelectItem = ({ value, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) => (
  <div className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-700" {...props}>
    {children}
  </div>
);

// Switch Component
export const Switch = ({
  checked,
  onCheckedChange,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  );
};

// Dialog Components (simplified)
export const Dialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const DialogHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={`text-lg font-semibold text-gray-200 ${className}`} {...props}>
    {children}
  </h2>
);

export const DialogDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-gray-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

// Table Components
export const Table = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full text-sm ${className}`} {...props}>
    {children}
  </table>
);

export const TableHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`border-b border-gray-700 ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b border-gray-800 hover:bg-gray-800/50 ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-4 py-3 text-gray-200 ${className}`} {...props}>
    {children}
  </td>
);

// Dropdown Menu Components (simplified)
export const DropdownMenu = ({ children }: React.PropsWithChildren) => (
  <div className="relative inline-block text-left">
    {children}
  </div>
);

export const DropdownMenuTrigger = ({ asChild, children, ...props }: any) => {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <button {...props}>{children}</button>;
};

export const DropdownMenuContent = ({ className = '', align = 'start', children, ...props }: any) => (
  <div className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} mt-2 w-56 rounded-md bg-gray-800 border border-gray-700 shadow-lg z-50 ${className}`} {...props}>
    <div className="py-1">
      {children}
    </div>
  </div>
);

export const DropdownMenuItem = ({ className = '', onSelect, children, ...props }: any) => (
  <button
    className={`w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center ${className}`}
    onClick={(e) => {
      props.onClick?.(e);
      onSelect?.(e);
    }}
    {...props}
  >
    {children}
  </button>
);

export const DropdownMenuLabel = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-4 py-2 text-xs font-medium text-gray-400 ${className}`} {...props}>
    {children}
  </div>
);

export const DropdownMenuSeparator = ({ className = '', ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr className={`my-1 border-gray-700 ${className}`} {...props} />
);
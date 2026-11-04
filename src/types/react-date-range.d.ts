declare module 'react-date-range' {
  import * as React from 'react';

  export interface Range {
    startDate?: Date;
    endDate?: Date;
    color?: string;
    key?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    showDateDisplay?: boolean;
  }

  export interface RangeKeyDict {
    [key: string]: Range;
  }

  export interface DateRangeProps {
    editableDateInputs?: boolean;
    onChange?: (rangesByKey: RangeKeyDict) => void;
    moveRangeOnFirstSelection?: boolean;
    ranges?: Range[];
    rangeColors?: string[];
    months?: number;
    direction?: 'vertical' | 'horizontal';
    className?: string;
    minDate?: Date;
    maxDate?: Date;
  }

  export class DateRange extends React.Component<DateRangeProps> {}
}

import React from 'react';
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file

interface CustomDateRangeProps {
  value: Range;
  onChange: (range: Range) => void;
}

export function CustomDateRangePicker({ value, onChange }: CustomDateRangeProps) {
  return (
    <DateRange
      editableDateInputs={true}
      onChange={item => onChange(item.selection)}
      moveRangeOnFirstSelection={false}
      ranges={[value]}
      rangeColors={['#0C83B3']} // Matches primary color
    />
  );
}

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';

const FilterBar = ({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  filterConfig 
}) => {
  const handleChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value,
      page: 0 // Reset page when filter changes
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {filterConfig.map(({ field, type, label, options }) => {
          if (type === 'select') {
            return (
              <FormControl key={field} sx={{ minWidth: 200 }} size="small">
                <InputLabel>{label}</InputLabel>
                <Select
                  value={filters[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  label={label}
                >
                  <MenuItem value="">All</MenuItem>
                  {options.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          return (
            <TextField
              key={field}
              label={label}
              size="small"
              value={filters[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
              sx={{ minWidth: 200 }}
            />
          );
        })}
        
        <Tooltip title="Clear filters">
          <IconButton 
            onClick={onClearFilters}
            size="small"
            sx={{ ml: 'auto' }}
          >
            <ClearIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default FilterBar;
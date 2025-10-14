import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  Chip,
  TextField,
  Box,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../../services/api';

const StyledAutocomplete = styled(Autocomplete)({
  '& .MuiInputBase-root': {
    padding: '2px 4px',
  },
});

const TagInput = ({ value, onChange, error, helperText, disabled }) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await api.get('/public/tags');
        if (Array.isArray(response.data)) {
          setAvailableTags(response.data.map(tag => tag._id));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  const handleChange = (event, newValue) => {
    onChange(newValue);
  };

  return (
    <Box>
      <StyledAutocomplete
        multiple
        disabled={disabled}
        value={value ? value.split(',').map(t => t.trim()).filter(t => t) : []}
        onChange={(event, newValue) => handleChange(event, newValue.join(', '))}
        inputValue={inputValue}
        onInputChange={(event, newValue) => setInputValue(newValue)}
        options={availableTags}
        freeSolo
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              key={option}
              variant="filled"
              size="small"
              label={option}
              {...getTagProps({ index })}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags"
            error={error}
            helperText={helperText}
            placeholder="Add tags..."
          />
        )}
      />
      {value && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {value.split(',').filter(t => t.trim()).length} {value.split(',').filter(t => t.trim()).length === 1 ? 'tag' : 'tags'}
        </Typography>
      )}
    </Box>
  );
};

export default TagInput;
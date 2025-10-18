import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Chip,
  TextField,
  Box,
  Typography,
  CircularProgress,
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
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const response = await api.get('/tags', {
          params: { limit: 100, sort: 'displayName' }, // Get active tags sorted by name
        });
        if (response.data?.items) {
          setAvailableTags(response.data.items.filter(tag => tag.isActive));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        // Fallback to public tags endpoint
        try {
          const fallbackResponse = await api.get('/public/tags');
          if (Array.isArray(fallbackResponse.data)) {
            setAvailableTags(fallbackResponse.data.map(tag => ({ 
              name: tag._id, 
              displayName: tag._id,
              color: '#1976d2',
            })));
          }
        } catch (fallbackError) {
          console.error('Error fetching fallback tags:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  // Convert current value (comma-separated string) to array of tag names
  const getCurrentTags = () => {
    if (!value) return [];
    return value.split(',').map(t => t.trim()).filter(t => t);
  };

  const handleChange = (event, newTagNames) => {
    onChange(newTagNames.join(', '));
  };

  const formatTagName = input => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <Box>
      <StyledAutocomplete
        multiple
        disabled={disabled}
        loading={loading}
        value={getCurrentTags()}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(event, newValue) => setInputValue(newValue)}
        options={availableTags.map(tag => tag.name || tag)}
        getOptionLabel={option => {
          const tag = availableTags.find(t => t.name === option);
          return tag ? tag.displayName || option : option;
        }}
        freeSolo
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter(option => {
            const tag = availableTags.find(t => t.name === option);
            const displayName = tag ? tag.displayName : option;
            return displayName.toLowerCase().includes(inputValue.toLowerCase()) ||
                   option.toLowerCase().includes(inputValue.toLowerCase());
          });
          
          // Add the formatted input as a new option if it doesn't exist
          if (inputValue && !filtered.includes(inputValue)) {
            const formattedInput = formatTagName(inputValue);
            if (formattedInput && !filtered.includes(formattedInput)) {
              filtered.push(formattedInput);
            }
          }
          
          return filtered;
        }}
        renderTags={(tagNames, getTagProps) =>
          tagNames.map((tagName, index) => {
            const tag = availableTags.find(t => t.name === tagName);
            return (
              <Chip
                key={tagName}
                variant="filled"
                size="small"
                label={tag ? tag.displayName : tagName}
                {...getTagProps({ index })}
                sx={{ 
                  mr: 0.5, 
                  mb: 0.5,
                  backgroundColor: tag ? `${tag.color}20` : '#1976d220',
                  color: tag ? tag.color : '#1976d2',
                  border: `1px solid ${tag ? tag.color : '#1976d2'}40`,
                }}
              />
            );
          })
        }
        renderInput={params => (
          <TextField
            {...params}
            label="Tags"
            error={error}
            helperText={helperText || 'Type to add existing tags or create new ones'}
            placeholder="Start typing to search or create tags..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
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
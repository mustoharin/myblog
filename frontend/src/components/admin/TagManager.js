import { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import TagList from './TagList';
import TagForm from './TagForm';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tag-tabpanel-${index}`}
      aria-labelledby={`tag-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TagManager = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedTag, setSelectedTag] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 0) {
      setSelectedTag(null);
    }
  };

  const handleEditTag = tag => {
    setSelectedTag(tag);
    setTabValue(1);
  };

  const handleTagSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedTag(null);
    setTabValue(0);
  };

  const handleTagDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="tag management tabs"
          >
            <Tab label="All Tags" id="tag-tab-0" />
            <Tab label={selectedTag ? 'Edit Tag' : 'Create Tag'} id="tag-tab-1" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TagList 
            onEditTag={handleEditTag}
            onTagDeleted={handleTagDeleted}
            refreshTrigger={refreshTrigger}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TagForm
            tag={selectedTag}
            onTagSaved={handleTagSaved}
            onCancel={() => {
              setSelectedTag(null);
              setTabValue(0);
            }}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TagManager;
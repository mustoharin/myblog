import React from 'react';
import {
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const BulkActionBar = ({
  numSelected,
  onDelete,
  additionalActions = [],
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action) => {
    handleMenuClose();
    action.handler();
  };

  if (numSelected === 0) return null;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        mb: 2,
        bgcolor: (theme) =>
          alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
      }}
    >
      <Typography
        sx={{ flex: '1 1 100%' }}
        color="inherit"
        variant="subtitle1"
        component="div"
      >
        {numSelected} selected
      </Typography>

      {onDelete && (
        <Tooltip title="Delete selected">
          <IconButton onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}

      {additionalActions.length > 0 && (
        <>
          <Tooltip title="More actions">
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {additionalActions.map((action) => (
              <MenuItem
                key={action.label}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
              >
                {action.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Toolbar>
  );
};

export default BulkActionBar;
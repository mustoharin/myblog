import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { safeGet } from './safeObjectAccess';

export const exportToCSV = (data, fields, filename) => {
  // Create allowed fields list for safe access
  const allowedFields = fields.map(f => f.field);
  
  const csvData = data.map(item => {
    const row = {};
    fields.forEach(({ field, transform }) => {
      // Use safe property access to prevent injection
      const value = safeGet(item, field, allowedFields);
      // eslint-disable-next-line security/detect-object-injection
      row[field] = transform ? transform(value, item) : value;
    });
    return row;
  });

  const csv = Papa.unparse(csvData, {
    header: true,
    columns: fields.map(f => f.field),
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
};

export const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatBoolean = value => value ? 'Yes' : 'No';

export const formatArray = (array, key) => {
  if (!array || !Array.isArray(array)) return '';
  // Define allowed keys for object property access
  const allowedKeys = ['name', 'title', 'label', 'value', 'displayName', '_id', 'id'];
  return array.map(item => safeGet(item, key, allowedKeys, '')).join(', ');
};
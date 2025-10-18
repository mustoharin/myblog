import { saveAs } from 'file-saver';
import Papa from 'papaparse';

export const exportToCSV = (data, fields, filename) => {
  const csvData = data.map(item => {
    const row = {};
    fields.forEach(({ field, transform }) => {
      row[field] = transform ? transform(item[field], item) : item[field];
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
  return array.map(item => item[key]).join(', ');
};
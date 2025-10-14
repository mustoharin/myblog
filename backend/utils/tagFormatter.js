function formatTag(tag) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single hyphen
    .trim();                      // Remove leading/trailing spaces
}

function formatTags(tags) {
  if (!Array.isArray(tags)) return [];
  
  // Process tags and remove duplicates
  const processedTags = [...new Set(
    tags
      .filter(tag => tag && typeof tag === 'string' && tag.trim())
      .map(tag => formatTag(tag))
      .filter(tag => tag.length > 0)
  )];

  return processedTags;
}

module.exports = { formatTag, formatTags };
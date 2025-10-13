// Add these after the schema definition but before module.exports
PostSchema.index({ title: 'text', content: 'text' });
PostSchema.index({ tags: 1 });
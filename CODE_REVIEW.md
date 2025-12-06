# Code Review: PI Planning FigJam Plugin

## Executive Summary

This is a well-structured FigJam plugin for PI Planning that creates template cards for various work item types. The code demonstrates good understanding of the Figma Plugin API and includes useful features like CSV import/export. However, there are several areas for improvement regarding code quality, performance, type safety, and FigJam-specific best practices.

---

## ✅ Strengths

1. **Good Structure**: Clear separation of concerns with template definitions, card creation, and CSV handling
2. **User Feedback**: Proper use of `figma.notify()` for user communication
3. **Error Handling**: Try-catch blocks in critical sections
4. **TypeScript Usage**: Leverages TypeScript for type safety
5. **CSV Handling**: Robust CSV parsing with quote handling
6. **Font Loading**: Proper async font loading before text creation

---

## 🔴 Critical Issues

### 1. **Code Duplication: Icon Creation Logic**
**Location**: Lines 116-201 and 620-704

The icon creation logic is duplicated between `createTemplateCard` and `createTemplateCardWithPosition`. This violates DRY principles and makes maintenance difficult.

**Recommendation**: Extract to a helper function:
```typescript
function createIconShape(templateType: keyof typeof TEMPLATES, iconX: number, iconY: number): SceneNode {
  const iconSize = 32;
  // ... consolidated icon creation logic
}
```

### 2. **Missing Error Handling in CSV Import**
**Location**: Line 1025

The `importCardsFromCSV` function is called without error handling. If it throws, the plugin will crash silently.

**Recommendation**:
```typescript
if (msg.type === 'import-csv') {
  if (!msg.csvText) {
    figma.notify('❌ No CSV data provided');
    return;
  }
  try {
    await importCardsFromCSV(msg.csvText);
  } catch (error) {
    figma.notify(`❌ Error importing CSV: ${error}`);
    console.error('CSV import error:', error);
  }
}
```

### 3. **Missing Error Handling in CSV Export**
**Location**: Line 1029

`exportCardsToCSV()` can throw errors (e.g., when accessing node properties), but it's not wrapped in try-catch.

**Recommendation**: Wrap in try-catch block.

### 4. **Type Safety Issues**
**Location**: Multiple locations

- Line 1016: `error` is typed as `any` - should be `unknown` with proper type checking
- Line 1000: Message type is too loose - should use discriminated unions
- Line 299 (ui.html): `event.data.pluginMessage` lacks type checking

**Recommendation**: Create proper TypeScript interfaces:
```typescript
interface PluginMessage {
  type: 'insert-template' | 'import-csv' | 'export-csv' | 'close';
  templateType?: keyof typeof TEMPLATES;
  csvText?: string;
}
```

---

## ⚠️ Performance Concerns

### 1. **Font Loading in Loop**
**Location**: Lines 603-607 (inside `createTemplateCardWithPosition`)

Fonts are loaded for every card creation. For bulk imports, this is inefficient.

**Recommendation**: Load fonts once at plugin initialization or before the import loop:
```typescript
// At plugin start or before bulk import
const fontsLoaded = Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
]);
```

### 2. **Document Traversal in Export**
**Location**: Line 914

`findAll()` traverses the entire page, which can be slow for large documents.

**Recommendation**: Consider adding a limit or using more specific selectors. Also, consider batching operations.

### 3. **No Progress Feedback for Large Imports**
**Location**: Lines 792-834

When importing many cards, users have no feedback on progress.

**Recommendation**: Add progress notifications:
```typescript
if (i % 10 === 0 || i === issues.length - 1) {
  figma.notify(`Processing ${i + 1}/${issues.length}...`, { timeout: 500 });
}
```

---

## 📋 Code Quality Issues

### 1. **Magic Numbers**
**Location**: Throughout

Hard-coded values like `400`, `300`, `20`, `450`, `400`, `50`, `3` should be constants.

**Recommendation**:
```typescript
const CARD_CONFIG = {
  DEFAULT_WIDTH: 400,
  DEFAULT_HEIGHT: 300,
  PADDING: 20,
  ICON_SIZE: 32,
  // ... etc
} as const;
```

### 2. **Inconsistent Naming**
**Location**: Multiple

- `createTemplateCard` vs `createTemplateCardWithPosition` - similar names but different signatures
- `mapJiraIssueToTemplate` - name suggests Jira-specific, but could be more generic

**Recommendation**: Consider renaming for clarity:
- `createTemplateCard` → `createTemplateCardAtViewport`
- `createTemplateCardWithPosition` → `createTemplateCard`

### 3. **Complex Conditional Logic**
**Location**: Lines 625-704

Long if-else chain for icon creation could use a strategy pattern or lookup table.

**Recommendation**:
```typescript
const ICON_CONFIGS: Record<keyof typeof TEMPLATES, IconConfig> = {
  theme: { shape: 'rectangle', size: [48, 19.2], color: [0.4, 0.2, 0.6], ... },
  // ...
};
```

### 4. **Missing Input Validation**
**Location**: Multiple functions

Functions don't validate inputs (e.g., `x`, `y` coordinates, `templateType`).

**Recommendation**: Add validation at function entry points.

### 5. **Text Node Font Loading**
**Location**: Lines 206, 238, 247, etc.

Text nodes are created without explicitly setting font family/style, relying on defaults.

**Recommendation**: Explicitly set font properties after creation:
```typescript
titleText.fontName = { family: 'Inter', style: 'Bold' };
```

---

## 🎨 FigJam-Specific Considerations

### 1. **Not Using FigJam-Specific Nodes**
**Location**: Throughout

The plugin uses generic `FrameNode` instead of FigJam-specific nodes like `StickyNode` or `ShapeWithTextNode`, which might be more appropriate for whiteboarding.

**Recommendation**: Consider using `figma.createSticky()` for card-like items:
```typescript
const sticky = figma.createSticky();
sticky.text.characters = title;
// Sticky nodes are more native to FigJam
```

### 2. **Missing Editor Type Check**
**Location**: Plugin entry

No check to ensure plugin is running in FigJam context.

**Recommendation**:
```typescript
if (figma.editorType !== 'figjam') {
  figma.notify('This plugin is designed for FigJam');
  figma.closePlugin();
  return;
}
```

### 3. **No Timer Integration**
**Location**: N/A

The plugin doesn't leverage FigJam's Timer functionality, which could be useful for PI Planning sessions.

**Recommendation**: Consider adding timer controls for planning sessions.

---

## 🔧 TypeScript & Type Safety

### 1. **Loose Type Definitions**
**Location**: Lines 1000-1004

Message handler uses loose typing.

**Recommendation**: Use discriminated unions:
```typescript
type PluginMessage =
  | { type: 'insert-template'; templateType: keyof typeof TEMPLATES }
  | { type: 'import-csv'; csvText: string }
  | { type: 'export-csv' }
  | { type: 'close' };
```

### 2. **Missing Return Types**
**Location**: Multiple functions

Some functions lack explicit return types.

**Recommendation**: Add explicit return types for better type inference and documentation.

### 3. **Type Assertions Without Checks**
**Location**: Line 868

`as TextNode[]` assertion without runtime validation.

**Recommendation**: Add runtime type checking or use type guards.

---

## 🐛 Potential Bugs

### 1. **CSV Export Field Ordering**
**Location**: Lines 960-967

Field labels are sorted alphabetically, which may not match the original card structure.

**Recommendation**: Preserve field order from template definitions.

### 2. **Text Wrapping Issues**
**Location**: Lines 253, 753

Text nodes are resized but may not handle long text properly.

**Recommendation**: Use `textAutoResize` or implement proper text wrapping:
```typescript
valueText.textAutoResize = 'HEIGHT';
valueText.resize(360, 1000); // Large height, auto-resize
```

### 3. **Frame Resize After Text Creation**
**Location**: Lines 260, 760

Frame is resized after adding children, but text height calculation might be inaccurate.

**Recommendation**: Use `textAutoResize` or calculate text height more accurately.

### 4. **Missing Font Style on Text Nodes**
**Location**: Multiple

Text nodes don't explicitly set `fontName`, which could cause issues if default fonts aren't loaded.

**Recommendation**: Always set `fontName` after creating text nodes.

---

## 📝 Documentation & Maintainability

### 1. **Missing JSDoc Comments**
**Location**: All functions

Functions lack documentation comments.

**Recommendation**: Add JSDoc comments:
```typescript
/**
 * Creates a template card at the specified position.
 * @param templateType - The type of template to create
 * @param customData - Optional custom data to populate fields
 * @param x - X coordinate for card placement
 * @param y - Y coordinate for card placement
 * @returns The created frame node
 */
```

### 2. **Complex Functions**
**Location**: `mapJiraIssueToTemplate`, `parseCSV`

Some functions are too long and do multiple things.

**Recommendation**: Break down into smaller, focused functions.

### 3. **Magic Strings**
**Location**: Throughout

Field names like `'Summary'`, `'Issue Type'` are hardcoded strings.

**Recommendation**: Extract to constants:
```typescript
const JIRA_FIELDS = {
  SUMMARY: 'Summary',
  ISSUE_TYPE: 'Issue Type',
  // ...
} as const;
```

---

## 🎯 Recommendations Priority

### High Priority
1. ✅ Extract icon creation to reduce duplication
2. ✅ Add error handling to CSV import/export
3. ✅ Load fonts once for bulk operations
4. ✅ Add editor type check for FigJam
5. ✅ Fix type safety issues

### Medium Priority
1. ✅ Extract magic numbers to constants
2. ✅ Add progress feedback for large imports
3. ✅ Add input validation
4. ✅ Improve text handling (auto-resize)
5. ✅ Add JSDoc comments

### Low Priority
1. ✅ Consider using FigJam-specific nodes (StickyNode)
2. ✅ Refactor complex functions
3. ✅ Add timer integration
4. ✅ Improve naming consistency

---

## 📚 Additional Resources

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Working in FigJam](https://www.figma.com/plugin-docs/working-in-figjam/)
- [Figma Plugin TypeScript Types](https://github.com/figma/plugin-typings)
- [Figma Plugin Best Practices](https://www.figma.com/plugin-docs/best-practices/)

---

## Summary

The codebase is functional and well-structured, but would benefit from:
- Reducing code duplication
- Improving error handling
- Enhancing type safety
- Optimizing performance for bulk operations
- Better leveraging FigJam-specific features

Overall, this is a solid foundation that can be improved with the recommendations above.


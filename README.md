# PI Planning Templates - FigJam Widget

A FigJam widget that helps teams with PI (Program Increment) planning by providing quick access to templates for different ticket types.

## Features

- **Tool Pane Interface**: Clean, easy-to-use panel for selecting templates
- **Multiple Template Types**:
  - 🎯 **Milestone**: Track key project milestones with dates and status
  - 📋 **User Story**: Standard user story format with acceptance criteria
  - 🚀 **Epic**: Large work items that span multiple sprints
  - ⚡ **Feature**: Feature definition with team assignments

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Widget**
   ```bash
   npm run build
   ```
   This compiles the TypeScript code to JavaScript.

3. **Load in Figma**
   - Open Figma Desktop app
   - Go to `Menu > Plugins > Development > Import plugin from manifest...`
   - Select the `manifest.json` file in this directory
   - The widget will appear in your plugins list

4. **Use in FigJam**
   - Open a FigJam file
   - Go to `Menu > Plugins > Development > PI Planning Templates`
   - The tool pane will open on the right side
   - Click on any template card to insert it into your board

## Development

### Watch Mode
For development, use watch mode to automatically rebuild on changes:
```bash
npm run watch
```

### Project Structure
```
.
├── manifest.json      # Widget configuration
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── ui.html            # Tool pane UI
└── src/
    └── code.tsx       # Main widget code
```

## Customization

### Adding New Templates

Edit `src/code.tsx` and add a new entry to the `TEMPLATES` object:

```typescript
newTemplate: {
  title: "New Template",
  fields: [
    { label: "Field 1", value: "Default value" },
    { label: "Field 2", value: "Another value" }
  ]
}
```

Then add a corresponding card in `ui.html`:

```html
<div class="template-card" data-template="newTemplate">
  <div class="template-title">✨ New Template</div>
  <div class="template-description">Description of the template</div>
  <div class="template-fields">Fields: Field 1, Field 2</div>
</div>
```

### Styling

The UI uses Figma's design tokens for colors, which automatically adapt to light/dark themes. You can customize the styles in `ui.html`.

## License

MIT


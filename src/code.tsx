// This file runs in the FigJam plugin context
/// <reference types="@figma/plugin-typings" />

// Define ticket type templates
const TEMPLATES = {
  milestone: {
    title: 'Milestone',
    fields: [
      { label: 'Name', value: 'Milestone Name' },
      { label: 'Target Date', value: 'MM/DD/YYYY' },
      { label: 'Status', value: 'Not Started' },
      { label: 'Description', value: 'Milestone description...' },
    ],
  },
  userStory: {
    title: 'User Story',
    fields: [
      { label: 'As a', value: '[user type]' },
      { label: 'I want', value: '[feature]' },
      { label: 'So that', value: '[benefit]' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
      { label: 'Story Points', value: '?' },
      { label: 'Priority', value: 'Medium' },
    ],
  },
  epic: {
    title: 'Epic',
    fields: [
      { label: 'Name', value: 'Epic Name' },
      { label: 'Description', value: 'Epic description...' },
      { label: 'Business Value', value: 'High' },
      { label: 'Status', value: 'Planning' },
    ],
  },
  feature: {
    title: 'Feature',
    fields: [
      { label: 'Name', value: 'Feature Name' },
      { label: 'Description', value: 'Feature description...' },
      { label: 'Dependencies', value: 'None' },
      { label: 'Team', value: 'Team Name' },
    ],
  },
};

// Function to create a template card
async function createTemplateCard(templateType: keyof typeof TEMPLATES) {
  const template = TEMPLATES[templateType];

  // Pre-load all fonts we'll need
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  ]);

  // Get the current viewport center
  const viewport = figma.viewport.center;

  // Create a frame to hold the template
  const frame = figma.createFrame();
  frame.name = template.title;
  frame.x = viewport.x;
  frame.y = viewport.y;
  frame.resize(400, 300);
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
  frame.cornerRadius = 8;

  // Add title
  const titleText = figma.createText();
  titleText.characters = template.title;
  titleText.fontSize = 24;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  titleText.x = 20;
  titleText.y = 20;
  frame.appendChild(titleText);

  // Add fields
  let yOffset = 60;
  for (const field of template.fields) {
    // Field label
    const labelText = figma.createText();
    labelText.characters = field.label + ':';
    labelText.fontSize = 12;
    labelText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    labelText.x = 20;
    labelText.y = yOffset;
    frame.appendChild(labelText);

    // Field value
    const valueText = figma.createText();
    valueText.characters = field.value;
    valueText.fontSize = 14;
    valueText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    valueText.x = 20;
    valueText.y = yOffset + 20;
    valueText.resize(360, valueText.height);
    frame.appendChild(valueText);

    yOffset += valueText.height + 40;
  }

  // Resize frame to fit content
  frame.resize(400, yOffset + 20);

  // Add to current page
  figma.currentPage.appendChild(frame);

  // Select the new frame
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return frame;
}

// Set up message handler once
figma.ui.onmessage = async (msg: {
  type: string;
  templateType?: keyof typeof TEMPLATES;
}) => {
  if (msg.type === 'insert-template') {
    if (!msg.templateType) {
      figma.notify('❌ No template type specified');
      return;
    }
    try {
      await createTemplateCard(msg.templateType);
      figma.notify(
        `✅ ${TEMPLATES[msg.templateType].title} template inserted!`
      );
    } catch (error) {
      figma.notify(`❌ Error inserting template: ${error}`);
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Show the UI panel
figma.showUI(__html__, {
  width: 300,
  height: 500,
  themeColors: true,
});

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
  // Transparent background with slight tint for visibility
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.85 }];
  frame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
  frame.cornerRadius = 8;

  // Add icon shape based on template type (right-justified)
  const iconSize = 32;
  const iconX = 400 - 20 - iconSize; // Right edge minus padding minus icon size
  let iconShape: SceneNode;

  if (templateType === 'milestone') {
    // Diamond shape for milestone (using polygon with 4 points)
    const diamond = figma.createPolygon();
    diamond.resize(iconSize, iconSize);
    diamond.pointCount = 4;
    diamond.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.2, b: 0.2 } }]; // Red
    diamond.x = iconX;
    diamond.y = 20;
    iconShape = diamond;
  } else if (templateType === 'userStory') {
    // Circle for user story
    const ellipse = figma.createEllipse();
    ellipse.resize(iconSize, iconSize);
    ellipse.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }]; // Blue
    ellipse.x = iconX;
    ellipse.y = 20;
    iconShape = ellipse;
  } else if (templateType === 'epic') {
    // Triangle for epic (using polygon)
    const polygon = figma.createPolygon();
    polygon.resize(iconSize, iconSize);
    polygon.pointCount = 3;
    polygon.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.6, b: 0.1 } }]; // Orange
    polygon.x = iconX;
    polygon.y = 20;
    iconShape = polygon;
  } else {
    // Square for feature
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 0.3 } }]; // Green
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = 20;
    iconShape = rect;
  }

  frame.appendChild(iconShape);

  // Add title text (left side)
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

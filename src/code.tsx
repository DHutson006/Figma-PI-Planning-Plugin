// This file runs in the FigJam plugin context
/// <reference types="@figma/plugin-typings" />

// Define ticket type templates
const TEMPLATES = {
  theme: {
    title: 'Theme',
    fields: [
      { label: 'Name', value: 'Theme Name' },
      { label: 'Description', value: 'Business objective description...' },
      { label: 'Business Value', value: 'High' },
      { label: 'Status', value: 'Planning' },
    ],
  },
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
      { label: 'Assignee', value: 'Unassigned' },
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
  initiative: {
    title: 'Initiative',
    fields: [
      { label: 'Name', value: 'Initiative Name' },
      { label: 'Description', value: 'Initiative description...' },
      { label: 'Dependencies', value: 'None' },
      { label: 'Team', value: 'Team Name' },
    ],
  },
  task: {
    title: 'Task',
    fields: [
      { label: 'Name', value: 'Task Name' },
      { label: 'Description', value: 'Task description...' },
      { label: 'Status', value: 'Not Started' },
      { label: 'Assignee', value: 'Unassigned' },
    ],
  },
  spike: {
    title: 'Spike',
    fields: [
      { label: 'Name', value: 'Spike Name' },
      { label: 'Description', value: 'Spike description...' },
      { label: 'Status', value: 'In Progress' },
      { label: 'Findings', value: 'Research findings...' },
      { label: 'Assignee', value: 'Unassigned' },
    ],
  },
  test: {
    title: 'Test',
    fields: [
      { label: 'Name', value: 'Test Name' },
      { label: 'Description', value: 'Test description...' },
      { label: 'Status', value: 'Not Started' },
      { label: 'Test Type', value: 'Manual' },
      { label: 'Assignee', value: 'Unassigned' },
    ],
  },
};

// Type definitions for plugin messages
type PluginMessage =
  | { type: 'insert-template'; templateType: keyof typeof TEMPLATES }
  | { type: 'import-csv'; csvText: string }
  | { type: 'export-csv' }
  | { type: 'close' };

// Font loading cache to avoid reloading fonts multiple times
let fontsLoadedPromise: Promise<void> | null = null;

/**
 * Loads required fonts once and caches the promise for subsequent calls.
 * This improves performance when creating multiple cards.
 */
async function ensureFontsLoaded(): Promise<void> {
  if (!fontsLoadedPromise) {
    fontsLoadedPromise = Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    ]).then(() => {
      // Fonts loaded successfully
    });
  }
  return fontsLoadedPromise;
}

// Helper function to create icon shape based on template type
function createIconShape(
  templateType: keyof typeof TEMPLATES,
  iconX: number,
  iconY: number
): SceneNode {
  const iconSize = 32;
  let iconShape: SceneNode;

  if (templateType === 'theme') {
    // Elongated horizontal rectangle for theme
    const rect = figma.createRectangle();
    rect.resize(iconSize * 1.5, iconSize * 0.6);
    rect.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.2, b: 0.6 } }]; // Dark purple
    rect.cornerRadius = 2;
    rect.x = iconX - iconSize * 0.25; // Center the wider rectangle
    rect.y = iconY + (iconSize - rect.height) / 2;
    iconShape = rect;
  } else if (templateType === 'milestone') {
    // Diamond shape for milestone (using polygon with 4 points) - Green
    const diamond = figma.createPolygon();
    diamond.resize(iconSize, iconSize);
    diamond.pointCount = 4;
    diamond.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 0.3 } }]; // Green
    diamond.x = iconX;
    diamond.y = iconY;
    iconShape = diamond;
  } else if (templateType === 'userStory') {
    // Light orange square for user story
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 1.0, g: 0.8, b: 0.6 } }]; // Light orange
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = iconY;
    iconShape = rect;
  } else if (templateType === 'epic') {
    // Blue circle for epic
    const ellipse = figma.createEllipse();
    ellipse.resize(iconSize, iconSize);
    ellipse.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }]; // Blue
    ellipse.x = iconX;
    ellipse.y = iconY;
    iconShape = ellipse;
  } else if (templateType === 'initiative') {
    // Orange triangle for initiative
    const polygon = figma.createPolygon();
    polygon.resize(iconSize, iconSize);
    polygon.pointCount = 3;
    polygon.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.6, b: 0.1 } }]; // Orange
    polygon.x = iconX;
    polygon.y = iconY;
    iconShape = polygon;
  } else if (templateType === 'task') {
    // Light blue square for task
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.8, b: 1.0 } }]; // Light blue
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = iconY;
    iconShape = rect;
  } else if (templateType === 'spike') {
    // Dark blue square for spike
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.5 } }]; // Dark blue
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = iconY;
    iconShape = rect;
  } else if (templateType === 'test') {
    // Blue diamond for test
    const diamond = figma.createPolygon();
    diamond.resize(iconSize, iconSize);
    diamond.pointCount = 4;
    diamond.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }]; // Blue
    diamond.x = iconX;
    diamond.y = iconY;
    iconShape = diamond;
  } else {
    // Default fallback
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]; // Gray
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = iconY;
    iconShape = rect;
  }

  return iconShape;
}

// Function to create a template card with custom data
async function createTemplateCard(
  templateType: keyof typeof TEMPLATES,
  customData?: { [key: string]: string }
) {
  const template = TEMPLATES[templateType];

  // Ensure fonts are loaded (uses cache if already loaded)
  await ensureFontsLoaded();

  // Get the current viewport center
  const viewport = figma.viewport.center;

  // Create a frame to hold the template
  const frame = figma.createFrame();
  frame.name = (customData && customData.title) || template.title;
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
  const iconY = 20;
  const iconShape = createIconShape(templateType, iconX, iconY);
  frame.appendChild(iconShape);

  // Add title text (left side)
  const titleText = figma.createText();
  titleText.characters = (customData && customData.title) || template.title;
  titleText.fontSize = 24;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  titleText.x = 20;
  titleText.y = 20;
  frame.appendChild(titleText);

  // Add fields
  // For user stories from import, if Description is provided, replace As a/I want/So that with Description
  let fieldsToShow = template.fields;
  if (templateType === 'userStory' && customData && customData['Description']) {
    // Replace As a/I want/So that with Description for imported user stories
    fieldsToShow = [
      { label: 'Description', value: customData['Description'] },
    ].concat(
      template.fields.filter(
        (f) =>
          f.label !== 'As a' && f.label !== 'I want' && f.label !== 'So that'
      )
    );
  }

  let yOffset = 60;
  for (const field of fieldsToShow) {
    // Get value from custom data or use default
    const fieldValue =
      customData && customData[field.label]
        ? customData[field.label]
        : field.value;

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
    valueText.characters = fieldValue;
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

// Helper to parse a CSV line (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());
  return result;
}

// Function to parse CSV text (handles multiline fields in quotes)
function parseCSV(csvText: string): Array<{ [key: string]: string }> {
  if (!csvText || csvText.trim() === '') return [];

  // Parse header first
  let headerEnd = 0;
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      headerEnd = i;
      break;
    }
  }

  const headerLine = csvText.substring(0, headerEnd);
  const headers = parseCSVLine(headerLine);

  if (headers.length === 0) return [];

  const rows: Array<{ [key: string]: string }> = [];
  let currentLine = '';
  inQuotes = false;
  let lineStart = headerEnd + 1;

  // Parse data rows, handling multiline fields
  for (let i = lineStart; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      // End of row
      if (currentLine.trim() !== '') {
        const values = parseCSVLine(currentLine);
        if (values.length > 0 && values[0].trim() !== '') {
          const row: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Only add if has data
          const hasData = Object.values(row).some(
            (val) => val && val.trim() !== ''
          );
          if (hasData) {
            rows.push(row);
          }
        }
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  // Handle last row if no trailing newline
  if (currentLine.trim() !== '') {
    const values = parseCSVLine(currentLine);
    if (values.length > 0 && values[0].trim() !== '') {
      const row: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const hasData = Object.values(row).some(
        (val) => val && val.trim() !== ''
      );
      if (hasData) {
        rows.push(row);
      }
    }
  }

  return rows;
}

// Function to map Jira issue to template type and extract data
// Function to convert Jira formatting to more readable plain text
function formatJiraText(text: string): string {
  if (!text) return text;

  let formatted = text;

  // Convert Jira links [url|text] to "text (url)" or just "url" if no text
  // Handle [url|text] format first
  formatted = formatted.replace(/\[([^\]]+)\|([^\]]+)\]/g, '$2 ($1)');
  // Then handle simple [url] format
  formatted = formatted.replace(/\[([^\]]+)\]/g, '$1');

  // Convert Jira bold *text* to bold text (remove asterisks but keep emphasis)
  // Handle single asterisks for bold
  formatted = formatted.replace(/\*([^*\n]+)\*/g, '$1');
  // Handle double asterisks
  formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, '$1');

  // Convert Jira headings # text to bold headings
  formatted = formatted.replace(/^#+\s+(.+)$/gm, '$1');

  // Convert horizontal rules ---- to separator line
  formatted = formatted.replace(/^----\s*$/gm, '─────────────────────────');

  // Preserve bullet points and indentation
  // Convert Jira list items to clean bullet points
  formatted = formatted.replace(/^(\s*)[-*]\s+/gm, '$1• ');

  // Clean up excessive blank lines (more than 2 consecutive)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace from each line while preserving structure
  const lines = formatted.split('\n');
  const cleanedLines = lines.map((line) => {
    // Preserve indentation for list items and structured content
    if (/^\s*[•-]/.test(line) || /^\s*[A-Z][a-z]+:/.test(line)) {
      return line.trimStart();
    }
    return line.trim();
  });
  formatted = cleanedLines.join('\n').trim();

  return formatted;
}

function mapJiraIssueToTemplate(issue: { [key: string]: string }): {
  templateType: keyof typeof TEMPLATES;
  data: { [key: string]: string };
} | null {
  const issueType = issue['Issue Type'] || '';
  const summary = issue['Summary'] || '';
  const description = formatJiraText(issue['Description'] || '');
  const status = issue['Status'] || '';
  const priority = issue['Priority'] || '';
  const storyPoints = issue['Custom field (Story Points)'] || '';
  const acceptanceCriteria = formatJiraText(
    issue['Custom field (Acceptance Criteria)'] || ''
  );
  const userStory = formatJiraText(issue['Custom field (User Story)'] || '');
  const issueKey = issue['Issue key'] || '';
  const team =
    issue['Custom field (Studio)'] || issue['Custom field (Team)'] || '';
  const dueDate = issue['Due Date'] || '';
  const fixVersions = issue['Fix Version/s'] || '';
  const businessValue = issue['Custom field (Business Value)'] || '';
  const dependencies = issue['Outward issue link (Blocks)'] || '';

  // Parse user story format from description or custom field
  let asA = '';
  let iWant = '';
  let soThat = '';

  const storyText = userStory || description;
  const asAMatch = storyText.match(/\*As\s+a\*[:\s]+(.+?)(?:\n|\*|$)/i);
  const iWantMatch = storyText.match(/\*I\s+want\*[:\s]+(.+?)(?:\n|\*|$)/i);
  const soThatMatch = storyText.match(/\*So\s+that\*[:\s]+(.+?)(?:\n|\*|$)/i);

  if (asAMatch) asA = asAMatch[1].trim();
  if (iWantMatch) iWant = iWantMatch[1].trim();
  if (soThatMatch) soThat = soThatMatch[1].trim();

  // Map issue type to template
  let templateType: keyof typeof TEMPLATES;

  // Map based on mapping: Title = Summary, Name = Summary, Team = Custom field (Studio)
  if (issueType.toLowerCase() === 'epic') {
    templateType = 'epic';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Epic description...', // Description → Description
        'Business Value': businessValue || 'High',
        Status: status || 'Planning',
      },
    };
  } else if (
    issueType.toLowerCase() === 'story' ||
    issueType.toLowerCase() === 'user story' ||
    (asA && iWant && soThat)
  ) {
    templateType = 'userStory';
    // For imported user stories, use Description instead of As a/I want/So that
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Description: description || 'User story description...', // Use Description for imports
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
        'Story Points': storyPoints || '?',
        Priority: priority || 'Medium',
        Assignee: issue['Assignee'] || 'Unassigned',
      },
    };
  } else if (dueDate || fixVersions) {
    // Use milestone for items with dates
    templateType = 'milestone';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        'Target Date': dueDate || fixVersions || 'MM/DD/YYYY',
        Status: status || 'Not Started',
        Description: description || 'Milestone description...', // Description → Description
      },
    };
  } else if (issueType.toLowerCase() === 'task') {
    templateType = 'task';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Task description...', // Description → Description
        Status: status || 'Not Started',
        Assignee: issue['Assignee'] || 'Unassigned',
      },
    };
  } else if (issueType.toLowerCase() === 'spike') {
    templateType = 'spike';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Spike description...', // Description → Description
        Status: status || 'In Progress',
        Findings: formatJiraText(description || 'Research findings...'), // Use description as findings
        Assignee: issue['Assignee'] || 'Unassigned',
      },
    };
  } else if (issueType.toLowerCase() === 'test') {
    templateType = 'test';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Test description...', // Description → Description
        Status: status || 'Not Started',
        'Test Type': issue['Custom field (Test Type)'] || 'Manual',
        Assignee: issue['Assignee'] || 'Unassigned',
      },
    };
  } else if (issueType.toLowerCase() === 'theme') {
    templateType = 'theme';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Business objective description...', // Description → Description
        'Business Value': businessValue || 'High',
        Status: status || 'Planning',
      },
    };
  } else {
    // Default to initiative
    templateType = 'initiative';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Name: summary, // Name → Summary
        Description: description || 'Initiative description...', // Description → Description
        Dependencies: dependencies || 'None',
        Team: team || 'Team Name', // Team → Custom field (Studio)
      },
    };
  }
}

// Helper function to create card at specific position
async function createTemplateCardWithPosition(
  templateType: keyof typeof TEMPLATES,
  customData: { [key: string]: string },
  x: number,
  y: number
): Promise<FrameNode> {
  const template = TEMPLATES[templateType];

  // Ensure fonts are loaded (uses cache if already loaded)
  await ensureFontsLoaded();

  // Create a frame to hold the template
  const frame = figma.createFrame();
  frame.name = (customData && customData.title) || template.title;
  frame.x = x;
  frame.y = y;
  frame.resize(400, 300);
  // Transparent background with slight tint for visibility
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.85 }];
  frame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
  frame.cornerRadius = 8;

  // Add icon shape based on template type (right-justified)
  const iconSize = 32;
  const iconX = 400 - 20 - iconSize;
  const iconY = 20;
  const iconShape = createIconShape(templateType, iconX, iconY);
  frame.appendChild(iconShape);

  // Add title text (left side)
  const titleText = figma.createText();
  titleText.characters = (customData && customData.title) || template.title;
  titleText.fontSize = 24;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  titleText.x = 20;
  titleText.y = 20;
  frame.appendChild(titleText);

  // Add fields
  // For user stories from import, if Description is provided, replace As a/I want/So that with Description
  let fieldsToShow = template.fields;
  if (templateType === 'userStory' && customData && customData['Description']) {
    // Replace As a/I want/So that with Description for imported user stories
    fieldsToShow = [
      { label: 'Description', value: customData['Description'] },
    ].concat(
      template.fields.filter(
        (f) =>
          f.label !== 'As a' && f.label !== 'I want' && f.label !== 'So that'
      )
    );
  }

  let yOffset = 60;
  for (const field of fieldsToShow) {
    const fieldValue =
      customData && customData[field.label]
        ? customData[field.label]
        : field.value;

    const labelText = figma.createText();
    labelText.characters = field.label + ':';
    try {
      labelText.fontName = { family: 'Inter', style: 'Medium' };
    } catch (e) {
      // Font might not be available, use default
      console.warn('Could not set Medium font, using default');
    }
    labelText.fontSize = 12;
    labelText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    labelText.x = 20;
    labelText.y = yOffset;
    frame.appendChild(labelText);

    // Field value - use auto-resize for proper text wrapping
    const valueText = figma.createText();
    valueText.characters = fieldValue;
    try {
      valueText.fontName = { family: 'Inter', style: 'Regular' };
    } catch (e) {
      // Font might not be available, use default
      console.warn('Could not set Regular font, using default');
    }
    valueText.fontSize = 14;
    valueText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    valueText.x = 20;
    valueText.y = yOffset + 20;
    // Set width first, then enable auto-resize for proper text wrapping
    valueText.resize(360, 1); // Set width, height will auto-resize
    valueText.textAutoResize = 'HEIGHT';
    frame.appendChild(valueText);

    // Calculate actual height after auto-resize
    const actualHeight = valueText.height;
    yOffset += actualHeight + 40;
  }

  // Resize frame to fit content (add extra padding at bottom)
  frame.resize(400, yOffset + 20);

  // Add to current page
  figma.currentPage.appendChild(frame);

  return frame;
}

// Function to import cards from CSV
async function importCardsFromCSV(csvText: string) {
  console.log(
    'importCardsFromCSV called with csvText length:',
    csvText?.length || 0
  );

  if (!csvText || csvText.trim() === '') {
    figma.notify('❌ CSV file is empty');
    console.error('CSV text is empty or null');
    return;
  }

  const issues = parseCSV(csvText);
  console.log(`Parsed ${issues.length} rows from CSV`);

  if (issues.length === 0) {
    figma.notify('❌ No data found in CSV file');
    console.error('No issues parsed from CSV');
    return;
  }

  // Load fonts once before processing all cards (performance optimization)
  await ensureFontsLoaded();

  const viewport = figma.viewport.center;
  let xOffset = 0;
  let yOffset = 0;
  const cardWidth = 450;
  const cardHeight = 400;
  const spacing = 50;
  const cardsPerRow = 3;

  let created = 0;
  let skipped = 0;
  const createdFrames: FrameNode[] = [];
  const totalIssues = issues.length;
  const progressInterval = Math.max(1, Math.floor(totalIssues / 10)); // Show progress every 10%

  // Process each row exactly once
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];

    // Show progress feedback for large imports
    if (i % progressInterval === 0 || i === issues.length - 1) {
      const progress = Math.round(((i + 1) / totalIssues) * 100);
      figma.notify(`Processing ${i + 1}/${totalIssues} (${progress}%)...`, {
        timeout: 500,
      });
    }

    // Skip if no summary (likely empty/invalid row)
    if (!issue['Summary'] || issue['Summary'].trim() === '') {
      skipped++;
      continue;
    }

    const mapped = mapJiraIssueToTemplate(issue);
    if (!mapped) {
      skipped++;
      continue;
    }

    try {
      // Position cards in a grid
      const x = viewport.x + xOffset;
      const y = viewport.y + yOffset;

      // Create card with custom position
      const frame = await createTemplateCardWithPosition(
        mapped.templateType,
        mapped.data,
        x,
        y
      );
      createdFrames.push(frame);

      // Update position for next card
      xOffset += cardWidth + spacing;
      if (xOffset >= (cardWidth + spacing) * cardsPerRow) {
        // New row
        xOffset = 0;
        yOffset += cardHeight + spacing;
      }

      created++;
    } catch (error) {
      skipped++;
      console.error('Error creating card:', error);
    }
  }

  // Scroll to show all created cards
  if (createdFrames.length > 0) {
    figma.viewport.scrollAndZoomIntoView(createdFrames);
  }

  figma.notify(
    `✅ Created ${created} card(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`
  );
}

// Function to extract data from a card frame
function extractCardData(frame: FrameNode): {
  type: string;
  fields: { label: string; value: string }[];
} | null {
  // Check if this is one of our template cards by checking the name
  // Use Set for O(1) lookup performance
  const cardTypes = new Set([
    'Theme',
    'Initiative',
    'Milestone',
    'Epic',
    'User Story',
    'Task',
    'Spike',
    'Test',
  ]);
  if (!cardTypes.has(frame.name)) return null;
  const cardType = frame.name;

  const fields: { label: string; value: string }[] = [];

  // Find all text nodes in the frame
  const textNodes = frame.findAll((node) => node.type === 'TEXT') as TextNode[];

  // Sort by Y position to get fields in order
  textNodes.sort((a, b) => a.y - b.y);

  // Skip the first text node (title) and process pairs (label, value)
  let i = 1; // Skip title
  while (i < textNodes.length) {
    const labelNode = textNodes[i];
    const valueNode = textNodes[i + 1];

    if (labelNode && valueNode) {
      const label = labelNode.characters.replace(':', '').trim();
      const value = valueNode.characters.trim();
      fields.push({ label, value });
      i += 2; // Move to next pair
    } else {
      i++;
    }
  }

  return {
    type: cardType,
    fields,
  };
}

/**
 * Builds a canonical field order based on template definitions.
 * Preserves the order fields appear in templates, with fields from earlier
 * templates taking precedence.
 */
function getCanonicalFieldOrder(): string[] {
  const fieldOrder: string[] = [];
  const seenFields = new Set<string>();

  // Iterate through templates in order
  for (const template of Object.values(TEMPLATES)) {
    for (const field of template.fields) {
      if (!seenFields.has(field.label)) {
        fieldOrder.push(field.label);
        seenFields.add(field.label);
      }
    }
  }

  return fieldOrder;
}

// Function to export cards to CSV
function exportCardsToCSV() {
  const cards: Array<{
    type: string;
    title: string;
    fields: { label: string; value: string }[];
  }> = [];

  // Find all frames on the current page that match our template names
  // Use Set for O(1) lookup performance instead of O(n) array.includes()
  const templateNames = new Set([
    'Theme',
    'Initiative',
    'Milestone',
    'Epic',
    'User Story',
    'Task',
    'Spike',
    'Test',
  ]);
  const frames = figma.currentPage.findAll(
    (node) => node.type === 'FRAME' && templateNames.has(node.name)
  ) as FrameNode[];

  // Extract data from each card
  for (const frame of frames) {
    const cardData = extractCardData(frame);
    if (cardData) {
      // Get title from frame name (which is set to the card title)
      const title = frame.name;

      // For user stories, concatenate As a/I want/So that into Description
      if (cardData.type === 'User Story') {
        const asA = cardData.fields.find((f) => f.label === 'As a');
        const iWant = cardData.fields.find((f) => f.label === 'I want');
        const soThat = cardData.fields.find((f) => f.label === 'So that');

        // If we have As a/I want/So that, concatenate them into Description
        if (asA && iWant && soThat) {
          const description = `As a ${asA.value}, I want ${iWant.value}, so that ${soThat.value}`;
          // Remove As a/I want/So that and add Description
          cardData.fields = cardData.fields.filter(
            (f) =>
              f.label !== 'As a' &&
              f.label !== 'I want' &&
              f.label !== 'So that'
          );
          // Add Description at the beginning
          cardData.fields.unshift({ label: 'Description', value: description });
        }
      }

      cards.push({
        type: cardData.type,
        title: title,
        fields: cardData.fields,
      });
    }
  }

  if (cards.length === 0) {
    figma.notify('❌ No template cards found on the page');
    return;
  }

  // Get all unique field labels across all cards
  const allFieldLabels = new Set<string>();
  cards.forEach((card) => {
    card.fields.forEach((field) => {
      allFieldLabels.add(field.label);
    });
  });

  // Use canonical field order from templates, then add any additional fields
  // that might exist in cards but not in templates (preserving template order)
  const canonicalOrder = getCanonicalFieldOrder();
  const orderedFields: string[] = [];
  const unorderedFields: string[] = [];

  // Add fields in canonical order
  canonicalOrder.forEach((label) => {
    if (allFieldLabels.has(label)) {
      orderedFields.push(label);
    }
  });

  // Add any fields that exist in cards but not in templates
  allFieldLabels.forEach((label) => {
    if (!canonicalOrder.includes(label)) {
      unorderedFields.push(label);
    }
  });

  // Combine: canonical order first, then any additional fields alphabetically
  const fieldLabels = orderedFields.concat(unorderedFields.sort());

  // Generate CSV header
  const header = ['Type', 'Title'].concat(fieldLabels).join(',');
  const rows = [header];

  // Generate CSV rows
  cards.forEach((card) => {
    const row: string[] = [card.type, card.title.replace(/"/g, '""')];

    fieldLabels.forEach((label) => {
      const field = card.fields.find((f) => f.label === label);
      const value = field ? field.value.replace(/"/g, '""') : ''; // Escape quotes
      row.push(`"${value}"`); // Wrap in quotes for CSV
    });
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');

  // Send CSV to UI for download
  figma.ui.postMessage({
    type: 'export-csv',
    csv: csvContent,
    filename: `pi-planning-export-${
      new Date().toISOString().split('T')[0]
    }.csv`,
  });

  figma.notify(`✅ Exported ${cards.length} card(s) to CSV`);
}

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Set up message handler once
figma.ui.onmessage = async (msg: {
  type: string;
  templateType?: keyof typeof TEMPLATES;
  csvText?: string;
}) => {
  // Log for debugging
  console.log('Received message:', msg);

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
      const errorMessage = getErrorMessage(error);
      figma.notify(`❌ Error inserting template: ${errorMessage}`);
      console.error('Error inserting template:', error);
    }
  }

  if (msg.type === 'import-csv') {
    if (!msg.csvText) {
      figma.notify('❌ No CSV data provided');
      console.error('CSV import failed: No csvText in message', msg);
      return;
    }
    try {
      console.log('Starting CSV import, data length:', msg.csvText.length);
      await importCardsFromCSV(msg.csvText);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      figma.notify(`❌ Error importing CSV: ${errorMessage}`);
      console.error('CSV import error:', error);
    }
  }

  if (msg.type === 'export-csv') {
    try {
      exportCardsToCSV();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      figma.notify(`❌ Error exporting CSV: ${errorMessage}`);
      console.error('CSV export error:', error);
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

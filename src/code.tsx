// This file runs in the FigJam plugin context
/// <reference types="@figma/plugin-typings" />

// Define ticket type templates
const TEMPLATES = {
  theme: {
    title: 'Theme',
    fields: [
      { label: 'Name', value: 'Theme Name' },
      { label: 'Description', value: 'Business objective description...\n' },
      { label: 'Business Value', value: 'High' },
      { label: 'Priority Rank', value: '#' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    ],
  },
  milestone: {
    title: 'Milestone',
    fields: [
      { label: 'Name', value: 'Milestone Name' },
      { label: 'Target Date', value: 'MM/DD/YYYY' },
      { label: 'Description', value: 'Milestone description...\n' },
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
      { label: 'Assignee', value: 'Unassigned' },
    ],
  },
  epic: {
    title: 'Epic',
    fields: [
      { label: 'Name', value: 'Epic Name' },
      { label: 'Description', value: 'Epic description...\n' },
      { label: 'Business Value', value: 'High' },
      { label: 'Team', value: 'Team Name' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    ],
  },
  initiative: {
    title: 'Initiative',
    fields: [
      { label: 'Name', value: 'Initiative Name' },
      { label: 'Description', value: 'Initiative description...\n' },
      { label: 'Dependencies', value: 'None' },
      { label: 'Priority Rank', value: '#' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    ],
  },
  task: {
    title: 'Task',
    fields: [
      { label: 'Description', value: 'Task description...\n' },
      { label: 'Assignee', value: 'Unassigned' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    ],
  },
  spike: {
    title: 'Spike',
    fields: [
      { label: 'Description', value: 'Spike description...\n' },
      { label: 'Assignee', value: 'Unassigned' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    ],
  },
  test: {
    title: 'Test',
    fields: [
      { label: 'Given', value: '[initial context]' },
      { label: 'When', value: '[event occurs]' },
      { label: 'Then', value: '[expected outcome]' },
      { label: 'Test Type', value: 'Manual' },
      { label: 'Assignee', value: 'Unassigned' },
      {
        label: 'Acceptance Criteria',
        value: '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
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

/**
 * Determines which field should be displayed as a large number for a given template type.
 * @param templateType - The template type
 * @returns The field label to display as large number, or null if none
 */
function getLargeNumberField(
  templateType: keyof typeof TEMPLATES
): string | null {
  if (templateType === 'theme') {
    return 'Priority Rank';
  } else if (
    templateType === 'userStory' ||
    templateType === 'task' ||
    templateType === 'spike' ||
    templateType === 'test'
  ) {
    return 'Story Points';
  }
  return null;
}

/**
 * Gets the background color for a template type (matches the icon color).
 * @param templateType - The template type
 * @returns RGB color object for the template type
 */
function getTemplateBackgroundColor(templateType: keyof typeof TEMPLATES): {
  r: number;
  g: number;
  b: number;
} {
  const colors: { [key: string]: { r: number; g: number; b: number } } = {
    theme: { r: 0.4, g: 0.2, b: 0.6 }, // Dark purple
    milestone: { r: 0.3, g: 0.7, b: 0.3 }, // Green
    userStory: { r: 1.0, g: 0.8, b: 0.6 }, // Light orange
    epic: { r: 0.2, g: 0.5, b: 0.9 }, // Blue
    initiative: { r: 0.9, g: 0.6, b: 0.1 }, // Orange
    task: { r: 0.13, g: 0.55, b: 0.13 }, // Forest green
    spike: { r: 0.7, g: 0.6, b: 0.4 }, // Light brown
    test: { r: 0.2, g: 0.5, b: 0.9 }, // Blue
  };
  return colors[templateType] || { r: 0.5, g: 0.5, b: 0.5 }; // Default gray
}

/**
 * Determines if text should be light (white) or dark (black) based on background brightness.
 * Uses relative luminance formula to determine contrast.
 * @param backgroundColor - RGB color object
 * @returns True if text should be light (white), false if dark (black)
 */
function shouldUseLightText(backgroundColor: {
  r: number;
  g: number;
  b: number;
}): boolean {
  // Calculate relative luminance (perceived brightness)
  // Formula: 0.299*R + 0.587*G + 0.114*B
  const luminance =
    0.299 * backgroundColor.r +
    0.587 * backgroundColor.g +
    0.114 * backgroundColor.b;
  // Use light text if background is dark (luminance < 0.5)
  return luminance < 0.5;
}

/**
 * Checks if a template type has an Assignee field.
 * @param templateType - The template type
 * @returns True if the template has an Assignee field
 */
function hasAssigneeField(templateType: keyof typeof TEMPLATES): boolean {
  return (
    templateType === 'userStory' ||
    templateType === 'task' ||
    templateType === 'spike' ||
    templateType === 'test'
  );
}

/**
 * Wraps text at word boundaries when it exceeds the character limit.
 * @param text - The text to wrap
 * @param maxLength - Maximum characters per line (default: 40)
 * @returns Text with line breaks inserted
 */
function wrapTitleText(text: string, maxLength: number = 40): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // If adding this word would exceed the limit, start a new line
    if (
      currentLine.length > 0 &&
      (currentLine + ' ' + word).length > maxLength
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      // Add word to current line
      if (currentLine.length > 0) {
        currentLine += ' ' + word;
      } else {
        currentLine = word;
      }
    }
  }

  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('\n');
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
    // Orange regular triangle for initiative
    const polygon = figma.createPolygon();
    polygon.resize(iconSize, iconSize);
    polygon.pointCount = 3;
    // No rotation - regular triangle pointing up
    polygon.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.6, b: 0.1 } }]; // Orange
    polygon.x = iconX;
    polygon.y = iconY;
    iconShape = polygon;
  } else if (templateType === 'task') {
    // Forest green square for task
    const rect = figma.createRectangle();
    rect.resize(iconSize, iconSize);
    rect.fills = [{ type: 'SOLID', color: { r: 0.13, g: 0.55, b: 0.13 } }]; // Forest green
    rect.cornerRadius = 4;
    rect.x = iconX;
    rect.y = iconY;
    iconShape = rect;
  } else if (templateType === 'spike') {
    // Light brown 8-pointed star for spike
    const star = figma.createStar();
    star.resize(iconSize, iconSize);
    star.pointCount = 8;
    star.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.6, b: 0.4 } }]; // Light brown
    star.x = iconX;
    star.y = iconY;
    iconShape = star;
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
// This is a convenience wrapper that uses createTemplateCardWithPosition
// positioned at the viewport center, with selection and scroll behavior
async function createTemplateCard(
  templateType: keyof typeof TEMPLATES,
  customData?: { [key: string]: string }
) {
  // Use the reusable function to create the card (position defaults to viewport center)
  const frame = await createTemplateCardWithPosition(templateType, customData);

  // Select the new frame and scroll to it (only for menu button clicks, not imports)
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
            const value = values[index] || '';
            // Handle duplicate column names (like multiple "Sprint" columns)
            // For duplicate names, coalesce values - use first non-empty value
            if (header in row) {
              // Column name already exists, coalesce: keep existing if non-empty, otherwise use new value
              if (!row[header] || row[header].trim() === '') {
                if (value && value.trim() !== '') {
                  row[header] = value;
                }
              }
              // If existing value is non-empty, keep it (don't overwrite)
            } else {
              // First occurrence of this column name
              row[header] = value;
            }
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
        const value = values[index] || '';
        // Handle duplicate column names (like multiple "Sprint" columns)
        // For duplicate names, coalesce values - use first non-empty value
        if (header in row) {
          // Column name already exists, coalesce: keep existing if non-empty, otherwise use new value
          if (!row[header] || row[header].trim() === '') {
            if (value && value.trim() !== '') {
              row[header] = value;
            }
          }
          // If existing value is non-empty, keep it (don't overwrite)
        } else {
          // First occurrence of this column name
          row[header] = value;
        }
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
  const priority = issue['Priority'] || '';
  // Parse and round story points to whole number
  const storyPointsRaw = issue['Custom field (Story Points)'] || '';
  const storyPoints =
    storyPointsRaw && storyPointsRaw !== '?' && storyPointsRaw !== '#'
      ? Math.round(parseFloat(storyPointsRaw) || 0).toString()
      : storyPointsRaw || '?';
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
        Team: team || 'Team Name', // Team → Custom field (Studio)
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
        issueKey: issueKey, // Store issue key for hyperlink
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
        issueKey: issueKey, // Store issue key for hyperlink
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
        Description: description || 'Milestone description...', // Description → Description
        issueKey: issueKey, // Store issue key for hyperlink
      },
    };
  } else if (issueType.toLowerCase() === 'task') {
    templateType = 'task';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Description: description || 'Task description...', // Description → Description
        'Story Points': storyPoints || '?', // Include Story Points if available
        Assignee: issue['Assignee'] || 'Unassigned',
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
        issueKey: issueKey, // Store issue key for hyperlink
      },
    };
  } else if (issueType.toLowerCase() === 'spike') {
    templateType = 'spike';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Description: description || 'Spike description...', // Description → Description
        'Story Points': storyPoints || '?', // Include Story Points if available
        Assignee: issue['Assignee'] || 'Unassigned',
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
        issueKey: issueKey, // Store issue key for hyperlink
      },
    };
  } else if (issueType.toLowerCase() === 'test') {
    templateType = 'test';
    return {
      templateType,
      data: {
        title: summary, // Title → Summary
        Description: description || 'Test description...', // Description → Description
        'Test Type': issue['Custom field (Test Type)'] || 'Manual',
        'Story Points': storyPoints || '?', // Include Story Points if available
        Assignee: issue['Assignee'] || 'Unassigned',
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
        issueKey: issueKey, // Store issue key for hyperlink
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
        'Priority Rank':
          issue['Priority'] || issue['Custom field (Priority Rank)'] || '#',
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
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
        'Priority Rank':
          issue['Priority'] || issue['Custom field (Priority Rank)'] || '#',
        'Acceptance Criteria':
          acceptanceCriteria || '- Criterion 1\n- Criterion 2\n- Criterion 3',
      },
    };
  }
}

// Helper function to create card at specific position
// This is the unified card creation function used by both menu clicks and imports
async function createTemplateCardWithPosition(
  templateType: keyof typeof TEMPLATES,
  customData?: { [key: string]: string },
  x?: number,
  y?: number
): Promise<FrameNode> {
  const template = TEMPLATES[templateType];

  // Ensure fonts are loaded (uses cache if already loaded)
  await ensureFontsLoaded();

  // Use provided position or default to viewport center
  const viewport = figma.viewport.center;
  const cardX = x !== undefined ? x : viewport.x;
  const cardY = y !== undefined ? y : viewport.y;

  // Create a frame to hold the template
  // In FigJam, frames work well for structured cards with multiple elements
  const frame = figma.createFrame();
  frame.name = (customData && customData.title) || template.title;
  frame.x = cardX;
  frame.y = cardY;

  // Store issue key in frame metadata if available (for export)
  if (customData && customData.issueKey) {
    frame.setPluginData('issueKey', customData.issueKey);
  }
  // Larger cards to accommodate prominent number display
  const cardWidth = 500;
  frame.resize(cardWidth, 400);

  // Set background color to match icon color with 15% opacity
  const backgroundColor = getTemplateBackgroundColor(templateType);
  frame.fills = [{ type: 'SOLID', color: backgroundColor, opacity: 0.15 }];

  // Determine text color based on background brightness (for legibility)
  // Force black text for test, theme, epic, spike, and task (even with subtle backgrounds)
  const forceBlackText =
    templateType === 'test' ||
    templateType === 'theme' ||
    templateType === 'epic' ||
    templateType === 'spike' ||
    templateType === 'task';
  const useLightText = forceBlackText
    ? false
    : shouldUseLightText(backgroundColor);

  // FigJam-optimized styling: More visible border for whiteboard context
  if (figma.editorType === 'figjam') {
    // More prominent border for better visibility on whiteboard
    frame.strokes = [
      { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 0.8 },
    ];
    frame.strokeWeight = 2;
  } else {
    // Original styling for Figma
    frame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
  }
  frame.cornerRadius = 8;

  // Make cards easier to select and interact with in FigJam
  frame.locked = false;

  // Add icon shape based on template type (right-justified)
  const iconSize = 32;
  const iconX = cardWidth - 20 - iconSize;
  const iconY = 20;
  const iconShape = createIconShape(templateType, iconX, iconY);
  frame.appendChild(iconShape);

  // Add title text (left side)
  // Title comes from Summary field in imports (mapped to 'title' in customData)
  // or uses template title for new cards
  const titleText = figma.createText();
  const titleContent = (customData && customData.title) || template.title;
  titleText.characters = wrapTitleText(titleContent, 40); // Wrap at 40 characters
  titleText.fontSize = 24;
  // Make title bold
  try {
    titleText.fontName = { family: 'Inter', style: 'Bold' };
  } catch (e) {
    console.warn('Could not set Bold font for title, using default');
  }
  // Use appropriate text color based on background brightness
  titleText.fills = [
    {
      type: 'SOLID',
      color: useLightText ? { r: 1, g: 1, b: 1 } : { r: 0.2, g: 0.2, b: 0.2 },
    },
  ];
  titleText.x = 20;
  titleText.y = 20;
  // Set width to allow wrapping, then calculate actual height
  titleText.resize(cardWidth - 40, titleText.height); // cardWidth - left padding - right padding

  // Add hyperlink to title if issue key is available
  const issueKey = customData && customData.issueKey;
  if (issueKey && issueKey.trim() !== '') {
    try {
      // Set hyperlink for the entire title text
      const url = `https://myjira.com/browse/${issueKey.trim()}`;
      titleText.setRangeHyperlink(0, titleText.characters.length, {
        type: 'URL',
        value: url,
      });
    } catch (e) {
      console.warn('Could not set hyperlink on title:', e);
    }
  }

  frame.appendChild(titleText);

  // Calculate title height after wrapping
  const titleHeight = titleText.height;

  // Add fields
  // For user stories: use Description when importing, but use As a/I want/So that for new cards
  // For test tickets: use Description when importing, but use Given/When/Then for new cards
  let fieldsToShow = template.fields;
  if (templateType === 'userStory') {
    // Only use Description format if this is an imported card (has Description in customData)
    // For new cards created via template button, use As a/I want/So that fields
    if (customData && customData['Description']) {
      // This is an imported card - use Description field
      const descriptionValue = customData['Description'];
      fieldsToShow = [{ label: 'Description', value: descriptionValue }].concat(
        template.fields.filter(
          (f) =>
            f.label !== 'As a' && f.label !== 'I want' && f.label !== 'So that'
        )
      );
    }
    // Otherwise, use template fields as-is (which includes As a/I want/So that)
  } else if (templateType === 'test') {
    // Only use Description format if this is an imported card (has Description in customData)
    // For new cards created via template button, use Given/When/Then fields
    if (customData && customData['Description']) {
      // This is an imported card - use Description field
      const descriptionValue = customData['Description'];
      fieldsToShow = [{ label: 'Description', value: descriptionValue }].concat(
        template.fields.filter(
          (f) => f.label !== 'Given' && f.label !== 'When' && f.label !== 'Then'
        )
      );
    }
    // Otherwise, use template fields as-is (which includes Given/When/Then)
  }

  // Filter out fields that will be displayed as large numbers or at the bottom (Assignee)
  const largeNumberField = getLargeNumberField(templateType);
  const fieldsToDisplay = fieldsToShow.filter(
    (f) =>
      (!largeNumberField || f.label !== largeNumberField) &&
      f.label !== 'Assignee' // Assignee is shown at bottom, not in fields list
  );

  // Start fields below title with proper spacing
  let yOffset = 20 + titleHeight + 20; // title y + title height + padding
  for (const field of fieldsToDisplay) {
    const fieldValue =
      customData && customData[field.label]
        ? customData[field.label]
        : field.value;

    // Field label
    const labelText = figma.createText();
    labelText.characters = field.label + ':';
    labelText.fontSize = 12;
    labelText.fills = [
      {
        type: 'SOLID',
        color: useLightText
          ? { r: 0.9, g: 0.9, b: 0.9 }
          : { r: 0.4, g: 0.4, b: 0.4 },
      },
    ];
    labelText.x = 20;
    labelText.y = yOffset;
    frame.appendChild(labelText);

    // Field value - wider text area for larger cards
    const valueText = figma.createText();
    valueText.characters = fieldValue;
    valueText.fontSize = 14;
    valueText.fills = [
      {
        type: 'SOLID',
        color: useLightText ? { r: 1, g: 1, b: 1 } : { r: 0.1, g: 0.1, b: 0.1 },
      },
    ];
    valueText.x = 20;
    valueText.y = yOffset + 20;
    valueText.resize(460, valueText.height); // Wider for larger card
    frame.appendChild(valueText);

    yOffset += valueText.height + 40;
  }

  // Calculate bottom position for number and assignee
  const bottomPadding = 20;
  const bottomY = yOffset + bottomPadding;

  // Get the value for the large number display using helper function
  // For templates with assignees (userStory, task, spike, test), always show the number
  let largeNumberValue: string | null = null;
  if (largeNumberField) {
    const numberField = template.fields.find(
      (f) => f.label === largeNumberField
    );
    const defaultValue = largeNumberField === 'Priority Rank' ? '#' : '?';
    largeNumberValue =
      (customData && customData[largeNumberField]) ||
      (numberField && numberField.value) ||
      defaultValue;
  }

  // Add large number in bottom right corner (if applicable)
  // Right-justified to the icon position
  // Always show for templates with assignees (userStory, task, spike, test)
  if (largeNumberField && largeNumberValue) {
    const largeNumberText = figma.createText();
    largeNumberText.characters = largeNumberValue;
    largeNumberText.fontSize = 24; // Same size as title
    // Make the number bold
    try {
      largeNumberText.fontName = { family: 'Inter', style: 'Bold' };
    } catch (e) {
      console.warn('Could not set Bold font for number, using default');
    }
    largeNumberText.fills = [
      {
        type: 'SOLID',
        color: useLightText ? { r: 1, g: 1, b: 1 } : { r: 0.2, g: 0.2, b: 0.2 },
      },
    ];
    frame.appendChild(largeNumberText);

    // Position in bottom right, right-aligned to icon (iconX + iconSize)
    // Icon is at iconX, so number should align to iconX + iconSize (right edge of icon)
    const iconRightEdge = iconX + iconSize;
    largeNumberText.x = iconRightEdge - largeNumberText.width;
    largeNumberText.y = bottomY;

    // Update frame height to accommodate the number
    yOffset = bottomY + largeNumberText.height + bottomPadding;
  } else {
    yOffset += bottomPadding;
  }

  // Add Assignee in bottom left (if applicable, same size, aligned with number)
  // For templates with assignees (userStory, task, spike, test), always show assignee
  if (hasAssigneeField(templateType)) {
    const assigneeField = template.fields.find((f) => f.label === 'Assignee');
    const assigneeValue =
      (customData && customData['Assignee']) ||
      (assigneeField && assigneeField.value) ||
      'Unassigned';

    // Always show assignee (now defaults to '[Assignee]' for new cards)
    if (assigneeValue) {
      const assigneeText = figma.createText();
      assigneeText.characters = assigneeValue;
      assigneeText.fontSize = 24; // Same size as title and number
      // Make the assignee text bold
      try {
        assigneeText.fontName = { family: 'Inter', style: 'Bold' };
      } catch (e) {
        console.warn('Could not set Bold font for assignee, using default');
      }
      assigneeText.fills = [
        {
          type: 'SOLID',
          color: useLightText
            ? { r: 1, g: 1, b: 1 }
            : { r: 0.2, g: 0.2, b: 0.2 },
        },
      ];
      frame.appendChild(assigneeText);

      // Position in bottom left, left-justified
      // Same Y coordinate as number to ensure they're on the same baseline
      assigneeText.x = 20; // Left padding
      assigneeText.y = bottomY; // Same Y as number - aligned on same baseline

      // Update frame height if needed (should be same as number height since same font size)
      yOffset = Math.max(
        yOffset,
        bottomY + assigneeText.height + bottomPadding
      );
    }
  }

  // Resize frame to fit content (add extra padding at bottom)
  frame.resize(cardWidth, yOffset);

  // FigJam-specific enhancements
  if (figma.editorType === 'figjam') {
    // Cards are optimized for FigJam whiteboard experience
    // They're easily selectable, movable, and collaborative
  }

  // Add to current page
  figma.currentPage.appendChild(frame);

  return frame;
}

// Function to import cards from CSV
async function importCardsFromCSV(csvText: string) {
  console.log(
    'importCardsFromCSV called with csvText length:',
    (csvText && csvText.length) || 0
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

  // Helper function to extract Sprint value from issue
  // CSV may have multiple "Sprint" columns, coalesce them to get the first non-empty value
  function getSprintValue(issue: { [key: string]: string }): string {
    // Check all possible Sprint column variations
    // Since CSV parser may overwrite duplicate column names, check all keys
    const sprintKeys = Object.keys(issue).filter((key) =>
      key.toLowerCase().includes('sprint')
    );

    // Try each Sprint column in order
    for (const key of sprintKeys) {
      const value = issue[key];
      if (value && value.trim() !== '') {
        // Extract just the sprint name (e.g., "Triton 2025-25" from any format)
        const trimmed = value.trim();
        // If it looks like a sprint name (contains numbers or common patterns), use it
        if (trimmed.length > 0 && trimmed !== '[]') {
          return trimmed;
        }
      }
    }

    // Also check if the issue object has Sprint data in a different format
    // Sometimes CSV parsers handle duplicate columns differently
    const allKeys = Object.keys(issue);
    for (const key of allKeys) {
      if (key.toLowerCase().includes('sprint')) {
        const value = issue[key];
        if (value && value.trim() !== '' && value.trim() !== '[]') {
          return value.trim();
        }
      }
    }

    return 'Backlog'; // Default for issues without sprint
  }

  // Helper function to extract Sprint dates from issue
  // Looks for date fields related to sprints (e.g., "Sprint Start Date", "Sprint End Date")
  function getSprintDates(issue: { [key: string]: string }): string {
    // Check for common sprint date field names
    const dateKeys = Object.keys(issue).filter((key) => {
      const lowerKey = key.toLowerCase();
      return (
        lowerKey.includes('sprint') &&
        (lowerKey.includes('date') ||
          lowerKey.includes('start') ||
          lowerKey.includes('end'))
      );
    });

    // Try to find start and end dates
    let startDate = '';
    let endDate = '';

    for (const key of dateKeys) {
      const value = issue[key];
      if (value && value.trim() !== '') {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('start')) {
          startDate = value.trim();
        } else if (lowerKey.includes('end')) {
          endDate = value.trim();
        }
      }
    }

    // If we found both dates, format them
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    } else if (startDate) {
      return startDate;
    } else if (endDate) {
      return endDate;
    }

    // Return placeholder if no dates found
    return 'MM/DD/YYYY - MM/DD/YYYY';
  }

  // Group issues by Sprint
  const issuesBySprint: { [sprint: string]: typeof issues } = {};
  for (const issue of issues) {
    // Skip if no summary (likely empty/invalid row)
    if (!issue['Summary'] || issue['Summary'].trim() === '') {
      continue;
    }

    const sprint = getSprintValue(issue);
    if (!issuesBySprint[sprint]) {
      issuesBySprint[sprint] = [];
    }
    issuesBySprint[sprint].push(issue);
  }

  // Sort sprints for consistent ordering
  const sortedSprints = Object.keys(issuesBySprint).sort();

  const viewport = figma.viewport.center;
  const cardWidth = 500;
  const cardHeight = 500;
  const spacing = 50;
  const cardsPerColumn = 3; // 3 columns per sprint
  const sprintSpacing = 100; // Space between sprints

  let created = 0;
  let skipped = 0;
  const createdFrames: FrameNode[] = [];
  const totalIssues = issues.length;
  let processedCount = 0;
  const progressInterval = Math.max(1, Math.floor(totalIssues / 10)); // Show progress every 10%

  // Helper function to parse story points (handles "1.0", "3", "?", "#", etc.)
  function parseStoryPoints(value: string): number {
    if (!value || value.trim() === '' || value === '?' || value === '#') {
      return 0;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.round(parsed); // Round to whole number
  }

  // Helper function to calculate capacity per assignee for a sprint
  function calculateCapacity(issues: { [key: string]: string }[]): {
    [assignee: string]: number;
  } {
    const capacity: { [assignee: string]: number } = {};
    for (const issue of issues) {
      const assignee = issue['Assignee'] || 'Unassigned';
      const storyPointsStr = issue['Custom field (Story Points)'] || '';
      const points = parseStoryPoints(storyPointsStr);
      capacity[assignee] = (capacity[assignee] || 0) + points;
    }
    return capacity;
  }

  // Helper function to calculate capacity table height
  function calculateTableHeight(capacity: {
    [assignee: string]: number;
  }): number {
    const rowHeight = 28; // Increased to accommodate larger font
    const headerSpacing = 10; // Slightly increased spacing

    // Count non-zero assignees
    const dataRowCount = Object.values(capacity).filter(
      (points) => points > 0
    ).length;

    // Height = header row + spacing + data rows
    return rowHeight + headerSpacing + dataRowCount * rowHeight;
  }

  // Helper function to create a capacity table
  async function createCapacityTable(
    capacity: { [assignee: string]: number },
    x: number,
    y: number,
    width: number
  ): Promise<{ height: number; nodes: SceneNode[] }> {
    await ensureFontsLoaded();
    const nodes: SceneNode[] = [];
    const rowHeight = 28; // Increased to accommodate larger font
    const columnSpacing = 20;
    const headerFontSize = 18; // Increased from 14
    const dataFontSize = 16; // Increased from 12
    let currentY = y;

    // Create header row - Allocated first, then Assignee
    const headerAllocated = figma.createText();
    headerAllocated.characters = 'Allocated';
    headerAllocated.fontSize = headerFontSize;
    try {
      headerAllocated.fontName = { family: 'Inter', style: 'Bold' };
    } catch (e) {
      console.warn('Could not set Bold font for table header, using default');
    }
    headerAllocated.fills = [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, // Black for better readability
    ];
    headerAllocated.x = x; // First column
    headerAllocated.y = currentY;
    figma.currentPage.appendChild(headerAllocated);
    nodes.push(headerAllocated);

    const headerAssignee = figma.createText();
    headerAssignee.characters = 'Assignee';
    headerAssignee.fontSize = headerFontSize;
    try {
      headerAssignee.fontName = { family: 'Inter', style: 'Bold' };
    } catch (e) {
      console.warn('Could not set Bold font for table header, using default');
    }
    headerAssignee.fills = [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, // Black for better readability
    ];
    // Position second column (estimate width of first column as 100px for numbers)
    headerAssignee.x = x + 100 + columnSpacing;
    headerAssignee.y = currentY;
    figma.currentPage.appendChild(headerAssignee);
    nodes.push(headerAssignee);

    currentY += rowHeight + 10; // Add spacing after header (increased)

    // Sort assignees by allocation (highest to lowest)
    const sortedAssignees = Object.keys(capacity).sort((a, b) => {
      return capacity[b] - capacity[a]; // Descending order
    });

    // Create data rows
    for (const assignee of sortedAssignees) {
      const points = capacity[assignee];
      if (points === 0) continue; // Skip assignees with 0 points

      // Allocated column (first)
      const pointsText = figma.createText();
      pointsText.characters = points.toString();
      pointsText.fontSize = dataFontSize;
      pointsText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Black for better readability
      pointsText.x = x; // First column
      pointsText.y = currentY;
      figma.currentPage.appendChild(pointsText);
      nodes.push(pointsText);

      // Assignee column (second)
      const assigneeText = figma.createText();
      assigneeText.characters = assignee;
      assigneeText.fontSize = dataFontSize;
      assigneeText.fills = [
        { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, // Black for better readability
      ];
      assigneeText.x = x + 100 + columnSpacing; // Second column
      assigneeText.y = currentY;
      figma.currentPage.appendChild(assigneeText);
      nodes.push(assigneeText);

      currentY += rowHeight;
    }

    return { height: currentY - y, nodes };
  }

  // Process each sprint
  let sprintXOffset = 0; // X position for the current sprint
  for (const sprint of sortedSprints) {
    const sprintIssues = issuesBySprint[sprint];

    // Calculate capacity per assignee for this sprint
    const capacity = calculateCapacity(sprintIssues);

    // Fixed position for sprint label (doesn't move based on table size)
    const sprintLabelWidth = cardsPerColumn * (cardWidth + spacing) - spacing; // Total width of 3 columns
    const fixedSprintLabelY = viewport.y - 80; // Fixed Y position for sprint label
    const spacingBetweenTableAndLabel = 20; // Space between table and label

    // Calculate table height first (if table exists) - use helper function
    let capacityTableHeight = 0;
    if (Object.keys(capacity).length > 0) {
      capacityTableHeight = calculateTableHeight(capacity);

      // Create the table at the correct position (growing upward from fixed label position)
      const tableX = viewport.x + sprintXOffset;
      const tableY =
        fixedSprintLabelY - capacityTableHeight - spacingBetweenTableAndLabel;

      const tableResult = await createCapacityTable(
        capacity,
        tableX,
        tableY,
        sprintLabelWidth
      );

      // Add all table nodes to createdFrames for scrolling
      for (const node of tableResult.nodes) {
        createdFrames.push(node as any);
      }
    }

    // Create sprint label - large text spanning all 3 columns
    const sprintLabel = figma.createText();
    sprintLabel.characters = sprint;
    sprintLabel.fontSize = 48; // Extra large label
    try {
      sprintLabel.fontName = { family: 'Inter', style: 'Bold' };
    } catch (e) {
      console.warn('Could not set Bold font for sprint label, using default');
    }
    sprintLabel.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];

    // Position label centered above the sprint's 3 columns (fixed position)
    sprintLabel.x =
      viewport.x + sprintXOffset + (sprintLabelWidth - sprintLabel.width) / 2; // Center the label
    sprintLabel.y = fixedSprintLabelY; // Fixed Y position - never changes

    figma.currentPage.appendChild(sprintLabel);
    createdFrames.push(sprintLabel as any); // Add to frames for scrolling

    // Get sprint dates from the first issue in this sprint (if available)
    const sprintDates =
      sprintIssues.length > 0
        ? getSprintDates(sprintIssues[0])
        : 'MM/DD/YYYY - MM/DD/YYYY';

    // Create sprint dates text - smaller font, positioned under the sprint label
    const sprintDatesText = figma.createText();
    sprintDatesText.characters = sprintDates;
    sprintDatesText.fontSize = 14; // Same size as ticket text
    sprintDatesText.fills = [
      { type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } },
    ];

    // Position dates centered under the sprint label
    sprintDatesText.x =
      viewport.x +
      sprintXOffset +
      (sprintLabelWidth - sprintDatesText.width) / 2; // Center the dates
    sprintDatesText.y = sprintLabel.y + sprintLabel.height + 5; // Position below label with small spacing

    figma.currentPage.appendChild(sprintDatesText);
    createdFrames.push(sprintDatesText as any); // Add to frames for scrolling

    // Add a line under the sprint dates spanning all 3 columns
    const line = figma.createLine();
    const lineY = sprintDatesText.y + sprintDatesText.height + 15; // Position below the dates with more spacing
    const lineStartX = viewport.x + sprintXOffset;

    line.x = lineStartX;
    line.y = lineY;
    line.resize(sprintLabelWidth, 0); // Horizontal line spanning all 3 columns
    line.strokes = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    line.strokeWeight = 2;

    figma.currentPage.appendChild(line);
    createdFrames.push(line as any); // Add to frames for scrolling

    // Track position within this sprint (3 columns)
    const columnHeights = [0, 0, 0]; // Track height of each column
    const columnWidth = cardWidth + spacing;

    // Calculate starting Y position for cards (after the line with spacing)
    const spacingAfterLine = 25; // Space between line and first card
    const cardsStartY = lineY + spacingAfterLine;

    for (let i = 0; i < sprintIssues.length; i++) {
      const issue = sprintIssues[i];

      // Show progress feedback for large imports
      processedCount++;
      if (
        processedCount % progressInterval === 0 ||
        processedCount === totalIssues
      ) {
        const progress = Math.round((processedCount / totalIssues) * 100);
        figma.notify(
          `Processing ${processedCount}/${totalIssues} (${progress}%)...`,
          {
            timeout: 500,
          }
        );
      }

      const mapped = mapJiraIssueToTemplate(issue);
      if (!mapped) {
        skipped++;
        continue;
      }

      try {
        // Determine which column (0, 1, or 2) - find the shortest column
        // This creates a cascading effect where cards fill columns sequentially
        let columnIndex = 0;
        let minHeight = columnHeights[0];
        for (let col = 1; col < cardsPerColumn; col++) {
          if (columnHeights[col] < minHeight) {
            minHeight = columnHeights[col];
            columnIndex = col;
          }
        }

        // Calculate position within this sprint
        // Cards start after the line with proper spacing
        const x = viewport.x + sprintXOffset + columnIndex * columnWidth;
        const y = cardsStartY + columnHeights[columnIndex];

        // Create card with custom position
        const frame = await createTemplateCardWithPosition(
          mapped.templateType,
          mapped.data,
          x,
          y
        );
        createdFrames.push(frame);

        // Update column height for next card in this column
        columnHeights[columnIndex] += frame.height + spacing;

        created++;
      } catch (error) {
        skipped++;
        console.error('Error creating card:', error);
      }
    }

    // Move to next sprint position
    // Find the maximum height across all columns in this sprint
    const maxSprintHeight = Math.max(...columnHeights);
    // Move X position for next sprint (3 columns width + spacing)
    sprintXOffset += cardsPerColumn * columnWidth + sprintSpacing;
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
  title: string;
  fields: { label: string; value: string }[];
  issueKey?: string;
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

  // Extract title from the first text node (which is the title)
  // This ensures we get the updated title if the user edited it
  const titleNode = textNodes[0];
  const actualTitle = titleNode ? titleNode.characters.trim() : frame.name;

  // Skip the first text node (title) and process pairs (label, value)
  // But skip large text nodes at the bottom (Assignee and Story Points) - they'll be extracted separately
  let i = 1; // Skip title
  const bottomYThreshold = frame.height - 80; // Bottom area where large text nodes are

  while (i < textNodes.length) {
    const labelNode = textNodes[i];
    const valueNode = textNodes[i + 1];

    if (labelNode && valueNode) {
      // Skip if these are bottom-positioned large text nodes (they'll be extracted separately)
      const isBottomNode =
        labelNode.y > bottomYThreshold || valueNode.y > bottomYThreshold;

      if (!isBottomNode) {
        const label = labelNode.characters.replace(':', '').trim();
        const value = valueNode.characters.trim();
        // Skip if label is empty or looks like a value (not a label)
        if (label && !/^[\d?#]+$/.test(label)) {
          fields.push({ label, value });
        }
      }
      i += 2; // Move to next pair
    } else {
      i++;
    }
  }

  // Extract large number field (Story Points or Priority Rank) from bottom right FIRST
  // Do this before extracting Assignee to avoid confusion
  // These are displayed as large numbers (24px, bold) at the bottom of the card
  const largeNumberField = getLargeNumberField(
    cardType as keyof typeof TEMPLATES
  );
  if (largeNumberField) {
    // Find the large number text node
    // Large numbers are positioned at bottom right
    // Strategy: Find the rightmost text node at the bottom that looks like a number

    // Get all text nodes except title, sorted by Y (bottom to top), then by X (right to left)
    const candidateNodes = textNodes
      .filter((node) => node !== titleNode && node.characters.trim())
      .sort((a, b) => {
        // First sort by Y (bottom first)
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 10) return yDiff; // Different rows
        // Same row, sort by X (right first)
        return b.x - a.x;
      });

    // Look for the rightmost node at the bottom that matches number pattern
    for (const node of candidateNodes) {
      const text = node.characters.trim();
      const nodeX = node.x;

      // Check if text looks like a number (Story Points or Priority Rank)
      // Can be digits, '?', or '#'
      const looksLikeNumber = /^[\d?#]+$/.test(text);

      // Check if it's on the right side (right 50% of card)
      const isRightSide = nodeX > frame.width * 0.5;

      if (looksLikeNumber && isRightSide) {
        // This is likely the large number field
        const existingField = fields.find((f) => f.label === largeNumberField);
        if (!existingField) {
          fields.push({ label: largeNumberField, value: text });
        } else {
          existingField.value = text;
        }
        break; // Found it
      }
    }
  }

  // Extract Assignee from bottom left (if applicable)
  // Assignee is displayed as large text (24px, bold) at the bottom left
  if (hasAssigneeField(cardType as keyof typeof TEMPLATES)) {
    // Get all text nodes except title, sorted by Y (bottom to top), then by X (left to right)
    const candidateNodes = textNodes
      .filter((node) => node !== titleNode && node.characters.trim())
      .sort((a, b) => {
        // First sort by Y (bottom first)
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 10) return yDiff; // Different rows
        // Same row, sort by X (left first)
        return a.x - b.x;
      });

    // Look for the leftmost node at the bottom that doesn't match number pattern
    for (const node of candidateNodes) {
      const text = node.characters.trim();
      const nodeX = node.x;

      // Check if it's on the left side (left 50% of card)
      const isLeftSide = nodeX < frame.width * 0.5;

      // Check if this looks like an assignee (not a number, not empty)
      const isNotNumber = !/^[\d?#]+$/.test(text);

      if (isLeftSide && isNotNumber) {
        // Check if we already have Assignee
        const existingAssigneeField = fields.find(
          (f) => f.label === 'Assignee'
        );
        if (!existingAssigneeField) {
          fields.push({ label: 'Assignee', value: text });
          break; // Found it
        }
      }
    }
  }

  // Extract issue key from frame metadata if available
  const issueKey = frame.getPluginData('issueKey') || '';

  // Debug: Log extracted fields to help troubleshoot
  console.log(
    `Extracted fields for ${cardType}:`,
    fields.map((f) => `${f.label}: ${f.value}`).join(', ')
  );

  return {
    type: cardType,
    title: actualTitle, // Include the actual title from text node
    fields,
    issueKey: issueKey, // Include issue key if available
  };
}

/**
 * Maps internal field names back to original CSV column names
 */
function mapFieldToCSVColumn(fieldLabel: string, templateType: string): string {
  const mapping: { [key: string]: string } = {
    // Common fields
    Summary: 'Summary',
    Name: 'Summary', // Name also maps to Summary
    Description: 'Description',
    Priority: 'Priority',
    Assignee: 'Assignee',
    'Story Points': 'Custom field (Story Points)',
    'Acceptance Criteria': 'Custom field (Acceptance Criteria)',
    'Business Value': 'Custom field (Business Value)',
    'Target Date': 'Due Date',
    Dependencies: 'Outward issue link (Blocks)',
    Team: 'Custom field (Studio)',
    'Priority Rank': 'Custom field (Priority Rank)',
    'Test Type': 'Custom field (Test Type)',
  };

  return mapping[fieldLabel] || fieldLabel; // Return original if no mapping
}

/**
 * Maps template type to Issue Type for CSV export
 */
function mapTemplateTypeToIssueType(templateType: string): string {
  const mapping: { [key: string]: string } = {
    Theme: 'Theme',
    Initiative: 'Initiative',
    Milestone: 'Milestone',
    Epic: 'Epic',
    'User Story': 'Story',
    Task: 'Task',
    Spike: 'Spike',
    Test: 'Test',
  };

  return mapping[templateType] || templateType;
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
    issueKey?: string;
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
      // Skip milestones - they won't be exported to Jira
      if (cardData.type === 'Milestone') {
        continue;
      }

      // Get title from extracted card data (which comes from the actual text node)
      const title = cardData.title;

      // For user stories, concatenate As a/I want/So that into Description
      if (cardData.type === 'User Story') {
        const asA = cardData.fields.find((f) => f.label === 'As a');
        const iWant = cardData.fields.find((f) => f.label === 'I want');
        const soThat = cardData.fields.find((f) => f.label === 'So that');

        // If we have As a/I want/So that, concatenate them into Description
        if (asA && iWant && soThat) {
          // Format: "As a [user type], I want [feature], so that [benefit]"
          const description = `As a ${asA.value}, I want ${iWant.value}, so that ${soThat.value}`;

          // Remove As a/I want/So that fields
          cardData.fields = cardData.fields.filter(
            (f) =>
              f.label !== 'As a' &&
              f.label !== 'I want' &&
              f.label !== 'So that'
          );

          // Remove any existing Description field (in case it was imported)
          cardData.fields = cardData.fields.filter(
            (f) => f.label !== 'Description'
          );

          // Add Description at the beginning with concatenated values
          cardData.fields.unshift({ label: 'Description', value: description });
        }
      }

      // For test tickets, concatenate Given/When/Then into Description
      if (cardData.type === 'Test') {
        const given = cardData.fields.find((f) => f.label === 'Given');
        const when = cardData.fields.find((f) => f.label === 'When');
        const then = cardData.fields.find((f) => f.label === 'Then');

        // If we have Given/When/Then, concatenate them into Description
        if (given && when && then) {
          // Format: "Given [initial context], When [event occurs], Then [expected outcome]"
          const description = `Given ${given.value}, When ${when.value}, Then ${then.value}`;

          // Remove Given/When/Then fields
          cardData.fields = cardData.fields.filter(
            (f) =>
              f.label !== 'Given' && f.label !== 'When' && f.label !== 'Then'
          );

          // Remove any existing Description field (in case it was imported)
          cardData.fields = cardData.fields.filter(
            (f) => f.label !== 'Description'
          );

          // Add Description at the beginning with concatenated values
          cardData.fields.unshift({ label: 'Description', value: description });
        }
      }

      cards.push({
        type: cardData.type,
        title: title,
        fields: cardData.fields,
        issueKey: cardData.issueKey,
      });
    }
  }

  if (cards.length === 0) {
    figma.notify('❌ No template cards found on the page');
    return;
  }

  // Map all fields to CSV column names and collect unique CSV columns
  // Maps CSV column name to array of internal field labels (for fields that map to same column)
  const csvColumnMap = new Map<string, string[]>();
  const allCSVColumns = new Set<string>();

  cards.forEach((card) => {
    card.fields.forEach((field) => {
      // Skip fields with invalid labels (like "?" or empty)
      if (!field.label || field.label.trim() === '' || field.label === '?') {
        return;
      }

      const csvColumn = mapFieldToCSVColumn(field.label, card.type);

      // Skip if mapping returns invalid column name
      if (!csvColumn || csvColumn.trim() === '' || csvColumn === '?') {
        return;
      }

      // Handle fields that map to the same CSV column (e.g., Name and Summary both → Summary)
      if (!csvColumnMap.has(csvColumn)) {
        csvColumnMap.set(csvColumn, []);
      }
      const fieldLabels = csvColumnMap.get(csvColumn)!;
      if (!fieldLabels.includes(field.label)) {
        fieldLabels.push(field.label);
      }

      allCSVColumns.add(csvColumn);
    });

    // Add Issue key if available
    if (card.issueKey) {
      allCSVColumns.add('Issue key');
    }
  });

  // Build ordered list of CSV columns
  // Priority order: Summary, Issue key, Issue Type, then other fields
  const orderedCSVColumns: string[] = [];
  const remainingColumns: string[] = [];

  // Always include these columns first
  orderedCSVColumns.push('Summary'); // Always include Summary (title)
  if (allCSVColumns.has('Issue key')) {
    orderedCSVColumns.push('Issue key');
  }
  orderedCSVColumns.push('Issue Type'); // Always include Issue Type

  // Add remaining columns in a logical order
  const priorityOrder = [
    'Description',
    'Status',
    'Priority',
    'Assignee',
    'Custom field (Story Points)',
    'Custom field (Acceptance Criteria)',
    'Custom field (Business Value)',
    'Due Date',
    'Outward issue link (Blocks)',
    'Custom field (Studio)',
    'Custom field (Priority Rank)',
    'Custom field (Test Type)',
  ];

  priorityOrder.forEach((col) => {
    if (allCSVColumns.has(col)) {
      orderedCSVColumns.push(col);
    }
  });

  // Add any remaining columns alphabetically
  allCSVColumns.forEach((col) => {
    if (!orderedCSVColumns.includes(col) && col !== 'Issue Type') {
      remainingColumns.push(col);
    }
  });
  remainingColumns.sort();
  const finalCSVColumns = orderedCSVColumns.concat(remainingColumns);

  // Generate CSV header
  const header = finalCSVColumns.join(',');
  const rows = [header];

  // Generate CSV rows
  cards.forEach((card) => {
    const row: string[] = [];

    finalCSVColumns.forEach((csvColumn) => {
      let value = '';

      if (csvColumn === 'Summary') {
        value = card.title;
      } else if (csvColumn === 'Issue key') {
        value = card.issueKey || '';
      } else if (csvColumn === 'Issue Type') {
        value = mapTemplateTypeToIssueType(card.type);
      } else {
        // Find the internal field label(s) for this CSV column
        const internalLabels = csvColumnMap.get(csvColumn);
        if (internalLabels && internalLabels.length > 0) {
          // If multiple fields map to same column (e.g., Name and Summary), prefer Summary
          const preferredLabel = internalLabels.includes('Summary')
            ? 'Summary'
            : internalLabels[0];
          const field = card.fields.find((f) => f.label === preferredLabel);
          value = field ? field.value : '';
        }
      }

      // Escape quotes and wrap in quotes for CSV
      const escapedValue = value.replace(/"/g, '""');
      row.push(`"${escapedValue}"`);
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

// Function to handle card duplication detection
// When a card with an issue key is duplicated, remove the issue key from the copy
// so it's treated as a new card for export
function handleCardDuplication() {
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

  // Find all template cards on the current page
  const allFrames = figma.currentPage.findAll(
    (node) => node.type === 'FRAME' && templateNames.has(node.name)
  ) as FrameNode[];

  // Track issue keys and their associated node IDs (ordered by creation/position)
  const issueKeyToNodes = new Map<
    string,
    Array<{ id: string; created: number; frame: FrameNode; isCopy: boolean }>
  >();

  allFrames.forEach((frame) => {
    const issueKey = frame.getPluginData('issueKey');
    if (issueKey && issueKey.trim() !== '') {
      if (!issueKeyToNodes.has(issueKey)) {
        issueKeyToNodes.set(issueKey, []);
      }
      // Check if this card is already marked as a copy
      const isCopy = frame.getPluginData('isCopy');
      // Use a combination of x and y position as a proxy for creation order
      // (earlier cards are typically positioned first)
      // Also prioritize cards that are NOT marked as copies
      const position = frame.x + frame.y * 10000;
      const sortKey = isCopy === 'true' ? position + 1000000000 : position; // Push copies to end
      issueKeyToNodes.get(issueKey)!.push({
        id: frame.id,
        created: sortKey,
        frame: frame,
        isCopy: isCopy === 'true',
      });
      console.log(
        `Found card with issue key: ${issueKey}, isCopy: ${isCopy}, frame: ${frame.name}`
      );
    }
  });

  console.log(
    `Total cards with issue keys: ${
      Array.from(issueKeyToNodes.values()).flat().length
    }`
  );

  // If an issue key appears in multiple cards, remove it from duplicates
  // Keep the first one (not marked as copy, lowest position) as original
  issueKeyToNodes.forEach((nodes, issueKey) => {
    if (nodes.length > 1) {
      console.log(`Found ${nodes.length} cards with issue key: ${issueKey}`);
      // Sort: non-copies first, then by position
      nodes.sort((a, b) => {
        // If one is a copy and the other isn't, non-copy comes first
        if (a.isCopy !== b.isCopy) {
          return a.isCopy ? 1 : -1;
        }
        // Otherwise sort by position
        return a.created - b.created;
      });
      const original = nodes[0];
      const duplicates = nodes.slice(1);
      console.log(
        `Original: ${original.frame.name} (${original.id}), Duplicates: ${duplicates.length}`
      );

      duplicates.forEach((duplicate) => {
        const duplicateFrame = duplicate.frame;
        // Check if this duplicate hasn't been processed yet
        const isCopy = duplicateFrame.getPluginData('isCopy');
        const frameId = duplicateFrame.id;

        if (isCopy !== 'true' && !processedCards.has(frameId)) {
          // Remove issue key from duplicate so it's treated as a new card
          duplicateFrame.setPluginData('issueKey', '');
          // Mark as copy for tracking
          duplicateFrame.setPluginData('isCopy', 'true');
          // Track that we've processed this card
          processedCards.add(frameId);

          // Remove hyperlink from the title if it exists
          const textNodes = duplicateFrame.findAll(
            (node) => node.type === 'TEXT'
          ) as TextNode[];
          if (textNodes.length > 0) {
            const titleNode = textNodes[0]; // First text node is the title
            try {
              // Clear hyperlink by setting empty URL
              titleNode.setRangeHyperlink(0, titleNode.characters.length, {
                type: 'URL',
                value: '',
              });
            } catch (e) {
              // Hyperlink might not exist or already cleared, ignore error
            }
          }

          // Notify user that the card has been marked for export
          const cardTitle =
            textNodes.length > 0 ? textNodes[0].characters.trim() : 'Card';
          figma.notify(
            `📋 Copied card "${cardTitle}" marked for export (no issue key)`
          );
        }
      });
    }
  });
}

// Track processed cards to avoid duplicate notifications
const processedCards = new Set<string>();

// Function to check for duplicates with better detection
function checkForDuplicates() {
  handleCardDuplication();
}

// Run duplicate check immediately on plugin load
checkForDuplicates();

// Listen for selection changes to detect when cards are duplicated
figma.on('selectionchange', () => {
  // Small delay to ensure duplication is complete before checking
  setTimeout(() => {
    checkForDuplicates();
  }, 300);
});

// Also check periodically to catch any missed duplicates (especially from copy/paste)
// This ensures we catch duplicates even if selection doesn't change
setInterval(() => {
  checkForDuplicates();
}, 1500); // Check every 1.5 seconds for faster detection

// Check if running in FigJam (recommended for this plugin)
if (figma.editorType !== 'figjam') {
  figma.notify(
    '⚠️ This plugin is optimized for FigJam. Some features may not work as expected in Figma.'
  );
}

// Show the UI panel
figma.showUI(__html__, {
  width: 300,
  height: 500,
  themeColors: true,
});

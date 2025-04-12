const fs = require('fs');
const strip = require('strip-comments');
const glob = require('glob');

// Configuration
const config = {
  // File patterns to process
  patterns: ['src/**/*.{js,jsx,ts,tsx}', 'server/**/*.ts'],
  // Directories to exclude
  excludeDirs: ['node_modules', 'build', 'dist'],
  // Whether to preserve license comments
  preserveLicense: true
};

// Find all matching files
function findFiles() {
  let allFiles = [];
  config.patterns.forEach((pattern) => {
    const files = glob.sync(pattern, {
      ignore: config.excludeDirs.map((dir) => `**/${dir}/**`)
    });
    allFiles = allFiles.concat(files);
  });
  return allFiles;
}

// Process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const eslintComments = {};
    let placeholderIndex = 0;

    // 1. Find and replace eslint comments with placeholders
    const modifiedLines = lines.map((line, index) => {
      if (line.includes('eslint-disable') || line.includes('eslint-enable')) {
        const placeholder = `__ESLINT_COMMENT_PLACEHOLDER_${placeholderIndex}__`;
        eslintComments[placeholder] = line;
        placeholderIndex++;
        return placeholder;
      } else if (
        line.trim().startsWith('/* eslint-disable') ||
        line.trim().startsWith('/* eslint-enable')
      ) {
        // Handle block comments spanning multiple lines if needed (simple case for now)
        const placeholder = `__ESLINT_COMMENT_PLACEHOLDER_${placeholderIndex}__`;
        eslintComments[placeholder] = line;
        placeholderIndex++;
        return placeholder;
      }
      return line;
    });

    const modifiedContent = modifiedLines.join('\n');

    // 2. Strip other comments (excluding license comments if configured)
    const stripOptions = {
      preserveNewlines: true,
      line: true,
      block: true
    };
    if (config.preserveLicense) {
      stripOptions.keep = /@license|@preserve|@copyright|@author|@ts-nocheck/i;
    }
    let strippedContent = strip(modifiedContent, stripOptions);

    // 3. Restore eslint comments from placeholders
    Object.keys(eslintComments).forEach((placeholder) => {
      // Use a regex for safer replacement (avoids issues if placeholder appears in code)
      const placeholderRegex = new RegExp(
        placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
        'g'
      );
      strippedContent = strippedContent.replace(placeholderRegex, eslintComments[placeholder]);
    });

    // Only write if content changed significantly (ignoring potential whitespace changes from split/join)
    if (content.replace(/\s+/g, '') !== strippedContent.replace(/\s+/g, '')) {
      fs.writeFileSync(filePath, strippedContent, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`Processed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  const files = findFiles();
  // eslint-disable-next-line no-console
  console.log(`Found ${files.length} files to process`);

  let processed = 0;
  files.forEach((file) => {
    if (processFile(file)) {
      processed++;
    }
  });

  // eslint-disable-next-line no-console
  console.log(`Complete! Processed ${processed} files.`);
}

main();

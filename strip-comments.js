const fs = require('fs');
const strip = require('strip-comments');
const glob = require('glob');

// Configuration
const config = {
  // File patterns to process
  patterns: ['src/**/*.{js,jsx,ts,tsx}'],
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
    const options = {
      preserveNewlines: true,
      line: true,
      block: true
    };

    if (config.preserveLicense) {
      options.keep = /@license|@preserve|@copyright|@author/i;
    }

    const stripped = strip(content, options);

    // Only write if content changed
    if (content !== stripped) {
      fs.writeFileSync(filePath, stripped, 'utf8');
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

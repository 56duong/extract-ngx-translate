const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Function to capitalize the first letter of every word
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Function to insert spaces before numbers in a string
function insertSpacesBeforeNumbers(str) {
  return str.replace(/(\d+)/g, ' $1 ').replace(/\s+/g, ' ').trim();
}

// Regular expressions to match translation keys
const regexMap = {
  '.html': /['"]([^'"]*)['"]\s*\|\s*translate/g,
  '.ts': /translateService\.instant\(\s*['"]([^'"]*)['"]\s*\)/g,
};

// Function to recursively read files from a directory
function readFiles(dir, fileTypes, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      readFiles(filePath, fileTypes, fileList);
    } else if (fileTypes.some(ext => filePath.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Function to extract translation keys from a file
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  let match;

  Object.keys(regexMap).forEach(ext => {
    if (filePath.endsWith(ext)) {
      const regex = regexMap[ext];
      while ((match = regex.exec(content)) !== null) {
        keys.push(match[1]);
      }
    }
  });

  return keys;
}

// Function to set nested keys in an object
function setNestedKey(obj, key, value) {
  const keys = key.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Function to clean up existing translations by removing non-existing keys
function cleanTranslations(existing, newKeys) {
  for (const key in existing) {
    if (typeof existing[key] === 'object' && existing[key] !== null) {
      if (!newKeys[key]) {
        delete existing[key];
      } else {
        cleanTranslations(existing[key], newKeys[key]);
      }
    } else {
      if (!newKeys[key]) {
        delete existing[key];
      }
    }
  }
}

// Function to merge new keys into existing translations
function mergeTranslations(existing, newKeys) {
  for (const key in newKeys) {
    if (typeof newKeys[key] === 'object' && newKeys[key] !== null) {
      if (!existing[key]) {
        existing[key] = {};
      }
      mergeTranslations(existing[key], newKeys[key]);
    } else {
      if (!existing[key]) {
        existing[key] = newKeys[key];
      }
    }
  }
}

// Main function to extract keys and update existing JSON files
function extractTranslations() {
  const argv = yargs(hideBin(process.argv))
    .option('key-as-default-value', {
      alias: 'k',
      type: 'boolean',
      description: 'Use key as default value'
    })
    .option('key-as-initial-default-value', {
      alias: 'ki',
      type: 'boolean',
      description: 'Use key as initial default value'
    })
    .option('null-as-default-value', {
      alias: 'n',
      type: 'boolean',
      description: 'Use null as default value'
    })
    .option('string-as-default-value', {
      alias: 'd',
      type: 'string',
      description: 'Use string as default value'
    })
    .option('key-as-default-value-remove-underscore', {
      alias: 'kr',
      type: 'boolean',
      description: 'Use key as default value and remove underscores'
    })
    .option('uppercase', {
      alias: 'u',
      type: 'boolean',
      description: 'Convert key to uppercase'
    })
    .option('capitalize', {
      alias: 'c',
      type: 'boolean',
      description: 'Capitalize the first letter of every word in the key'
    })
    .option('lowercase', {
      alias: 'l',
      type: 'boolean',
      description: 'Convert key to lowercase'
    })
    .option('uppercase-first-value', {
      alias: 'ufv',
      type: 'boolean',
      description: 'Uppercase the first letter of the value'
    })
    .option('file-types', {
      alias: 'f',
      type: 'array',
      description: 'Specify file types to process',
      default: ['.html', '.ts']
    })
    .demandCommand(2)
    .argv;

  const inputDir = argv._[0];
  const outputPaths = argv._.slice(1); // Multiple output paths

  if (!inputDir || outputPaths.length === 0) {
    console.error('Usage: node extract-translations.js <inputDir> <outputPaths...> [options]');
    process.exit(1);
  }

  console.log(`Reading files from directory: ${inputDir}`);
  
  const files = readFiles(inputDir, argv.fileTypes);
  const newTranslations = {};

  allKeyCount = 0;
  files.forEach(file => {
    const keys = extractKeysFromFile(file);
    console.log(`Extracted keys from ${file}: ${keys}`);
    keys.forEach(key => {
      allKeyCount++;

      let transformedKey = key;
      let value = '';

      if (argv.k) {
        value = transformedKey;
      } else if (argv.ki) {
        value = transformedKey;
      } else if (argv.n) {
        value = null;
      } else if (argv.d) {
        value = argv.d;
      } else if (argv.kr) {
        value = transformedKey.replace(/_/g, ' ');
      }

      if (argv.u) {
        value = value.toUpperCase();
      } else if (argv.c) {
        value = capitalizeWords(value);
      } else if (argv.l) {
        value = value.toLowerCase();
      }

      if (argv.ufv && typeof value === 'string') {
        value = capitalizeFirstLetter(value);
      }

      // Insert spaces before numbers in the value
      if (typeof value === 'string') {
        value = insertSpacesBeforeNumbers(value);
      }

      setNestedKey(newTranslations, transformedKey, value);
    });
  });

  console.log(`________________________________________________________________________________________________________\n\nTotal keys found: ${allKeyCount}\n`);

  outputPaths.forEach(outputFilePath => {
    let existingTranslations = {};
    if (fs.existsSync(outputFilePath)) {
      existingTranslations = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
    }

    cleanTranslations(existingTranslations, newTranslations);
    mergeTranslations(existingTranslations, newTranslations);

    fs.writeFileSync(outputFilePath, JSON.stringify(existingTranslations, null, 2));
    console.log(`Unused keys removed, new keys added, and updated translations written to ${outputFilePath}`);
  });
}

// Run the extraction
extractTranslations();





// const fs = require('fs');
// const path = require('path');

// // Directory containing HTML and TypeScript files
// const inputDir = './src/app';
// const outputFilePath = './src/assets/i18n/template2.json';

// // Regular expressions to match translation keys
// const translateHtmlRegex = /['"]([^'"]*)['"]\s*\|\s*translate/g;
// const translateTsRegex = /translateService\.instant\(\s*['"]([^'"]*)['"]\s*\)/g;

// // Function to recursively read files from a directory
// function readFiles(dir, fileList = []) {
//   const files = fs.readdirSync(dir);
//   files.forEach(file => {
//     const filePath = path.join(dir, file);
//     if (fs.statSync(filePath).isDirectory()) {
//       readFiles(filePath, fileList);
//     } else if (filePath.endsWith('.html') || filePath.endsWith('.ts')) {
//       fileList.push(filePath);
//     }
//   });
//   return fileList;
// }

// // Function to extract translation keys from a file
// function extractKeysFromFile(filePath) {
//   const content = fs.readFileSync(filePath, 'utf8');
//   const keys = [];
//   let match;

//   if (filePath.endsWith('.html')) {
//     while ((match = translateHtmlRegex.exec(content)) !== null) {
//       keys.push(match[1]);
//     }
//   } else if (filePath.endsWith('.ts')) {
//     while ((match = translateTsRegex.exec(content)) !== null) {
//       keys.push(match[1]);
//     }
//   }

//   return keys;
// }

// // Function to set nested keys in an object
// function setNestedKey(obj, key, value) {
//   const keys = key.split('.');
//   let current = obj;
//   for (let i = 0; i < keys.length - 1; i++) {
//     if (!current[keys[i]]) {
//       current[keys[i]] = {};
//     }
//     current = current[keys[i]];
//   }
//   current[keys[keys.length - 1]] = value;
// }

// // Function to clean up existing translations by removing non-existing keys
// function cleanTranslations(existing, newKeys) {
//   for (const key in existing) {
//     if (typeof existing[key] === 'object' && existing[key] !== null) {
//       if (!newKeys[key]) {
//         delete existing[key];
//       } else {
//         cleanTranslations(existing[key], newKeys[key]);
//       }
//     } else {
//       if (!newKeys[key]) {
//         delete existing[key];
//       }
//     }
//   }
// }

// // Function to merge new keys into existing translations
// function mergeTranslations(existing, newKeys) {
//   for (const key in newKeys) {
//     if (typeof newKeys[key] === 'object' && newKeys[key] !== null) {
//       if (!existing[key]) {
//         existing[key] = {};
//       }
//       mergeTranslations(existing[key], newKeys[key]);
//     } else {
//       if (!existing[key]) {
//         existing[key] = newKeys[key];
//       }
//     }
//   }
// }

// // Main function to extract keys and update existing JSON file
// function extractTranslations() {
//   const files = readFiles(inputDir);
//   const newTranslations = {};

//   files.forEach(file => {
//     const keys = extractKeysFromFile(file);
//     keys.forEach(key => {
//       console.log(`Extracted key: ${key}`); // Debugging log
//       setNestedKey(newTranslations, key, '');
//     });
//   });

//   let existingTranslations = {};
//   if (fs.existsSync(outputFilePath)) {
//     existingTranslations = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
//   }

//   cleanTranslations(existingTranslations, newTranslations);
//   mergeTranslations(existingTranslations, newTranslations);

//   fs.writeFileSync(outputFilePath, JSON.stringify(existingTranslations, null, 2));
//   console.log(`Unused keys removed, new keys added, and updated translations written to ${outputFilePath}`);
// }

// // Run the extraction
// extractTranslations();

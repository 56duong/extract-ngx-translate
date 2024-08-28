#!/usr/bin/env node

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
function cleanTranslations(existing, newKeys, overwriteAll) {
  for (const key in existing) {
    if (typeof existing[key] === 'object' && existing[key] !== null) {
      if (existing[key]._preserve) {
        continue; // Skip this object if it contains the _preserve field
      }
      if (!newKeys[key]) {
        delete existing[key];
      } else {
        cleanTranslations(existing[key], newKeys[key], overwriteAll);
      }
    } else {
      if (!newKeys[key] && newKeys[key] !== null) {
        delete existing[key];
      } else if (overwriteAll) {
        existing[key] = newKeys[key];
      }
    }
  }
}

// Function to merge new keys into existing translations
function mergeTranslations(existing, newKeys, overwriteAll) {
  for (const key in newKeys) {
    if (typeof newKeys[key] === 'object' && newKeys[key] !== null) {
      if (existing[key] && existing[key]._preserve) {
        continue; // Skip this object if it contains the _preserve field
      }
      if (!existing[key]) {
        existing[key] = {};
      }
      mergeTranslations(existing[key], newKeys[key]);
    } else {
      if (overwriteAll || !existing[key]) {
        existing[key] = newKeys[key];
      }
    }
  }
}

// Main function to extract keys and update existing JSON files
function extractTranslations() {
  const argv = yargs(hideBin(process.argv))
    .option('key-as-default-value', {
      alias: 'kd',
      type: 'boolean',
      description: 'Use key as default value'
    })
    .option('null-as-default-value', {
      alias: 'nd',
      type: 'boolean',
      description: 'Use null as default value'
    })
    .option('string-as-default-value', {
      alias: 'esd',
      type: 'string',
      description: 'Use empty string as default value'
    })
    .option('remove-underscore', {
      alias: 'ru',
      type: 'boolean',
      description: 'Use key as default value and remove underscores'
    })
    .option('uppercase', {
      alias: 'up',
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
      type: 'string',
      description: 'Specify file types to process',
      default: '.html,.ts',
      coerce: arg => arg.split(',')
    })
    .option('overwrite', {
      alias: 'o',
      type: 'boolean',
      default: false,
      description: 'Overwrite all existing translations'
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
    keys.forEach(key => {
      allKeyCount++;

      let transformedKey = key;
      let value = '';

      if (argv.kd) {
        value = transformedKey;
      } else if (argv.nd) {
        value = null;
      } else if (argv.esd) {
        value = argv.esd;
      } 
      
      if (argv.ru) {
        value = value ? value.replace(/_/g, ' ') : value;
      }

      // Remove prefix from the value if it contains a dot
      if (value && typeof value === 'string' && value.includes('.')) {
        value = value.substring(value.lastIndexOf('.') + 1);
      }

      if (argv.up) {
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

    cleanTranslations(existingTranslations, newTranslations, argv.o);
    mergeTranslations(existingTranslations, newTranslations, argv.o);

    fs.writeFileSync(outputFilePath, JSON.stringify(existingTranslations, null, 2));
    console.log(`Unused keys removed, new keys added, and updated translations written to ${outputFilePath}`);
  });
}

// Run the extraction
extractTranslations();
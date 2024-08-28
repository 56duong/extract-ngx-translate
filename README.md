# extract-translations

`extract-translations` is a Node.js script designed to extract translation keys from your source files and update your translation JSON files. It supports various transformation options to format the keys and values as needed.


## Features

- Extracts translation keys from `.html` and `.ts` files.
- Supports various transformation options for keys and values.
- Cleans up unused keys in existing translation files.
- Merges new keys into existing translation files.


## Installation

You can install the package via npm:

```sh
npm i @56duong/extract-ngx-translate
```


## Usage

To run the script, use the following command:

```sh
npx @56duong/extract-ngx-translate <inputDir> <outputPaths...> [options]
```
By default, the script will add keys that do not exist or only update keys that do not have a value, the script will delete keys that no longer exist in the source files unless they have a `_preserve` key set to `true` to prevent removal. 


### Parameters

- `<inputDir>`: The directory containing the source files to scan for translation keys.
- `<outputPaths...>`: One or more paths to the translation JSON files to update.


### Options
```
File Type Option
  --file-types, -f: A string specifying the file types to process (default: '.ts,.html').

Default Value Options
  --key-as-default-value, --kd: Use key as default value.
  --null-as-default-value, --nd: Use null as default value.
  --string-as-default-value, --esd: Use a specific string as default value.
  If no specific value transformation argument (`--kd`, `--nd`, `--esd`) is provided, the default value is an empty string (`''`).

Key Transformation Options
  --remove-underscore, --ru: Use key as default value and remove underscores.
  --uppercase, --up: Convert key to uppercase.
  --capitalize, --c: Capitalize the first letter of every word in the key.
  --lowercase, --l: Convert key to lowercase.
  --uppercase-first-value, --ufv: Uppercase the first letter of the value.

Overwrite Option
  --overwrite, --o: Overwrite existing translation values with new ones. By default, the script only updates existing keys if they do not have a value. The --overwrite option cannot overwrite keys with the `_preserve` key set to `true`.
```


### Regular Expressions Used
The script uses regular expressions to identify translation keys in your source files. Below is the regexMap constant that defines the patterns for different file types:
```
const regexMap = {
  '.html': /['"]([^'"]*)['"]\s*\|\s*translate/g,
  '.ts': /translateService\.instant\(\s*['"]([^'"]*)['"]\s*\)/g,
};
```

#### Explanation
- HTML Files (.html):
  - The regular expression ```/'"['"]\s*\|\s*translate/g``` is used to match translation keys within HTML files.
  - It looks for strings enclosed in single or double quotes that are followed by the ```| translate``` pipe.
  - Example: ```<p>{{ 'hello_world' | translate }}</p>``` will match ```'hello_world'```.
  - The regular expression is flexible with spaces, so it will also match ```<p>{{'hello_world'|translate}}</p>```.

- TypeScript Files (.ts):
  - The regular expression ```/translateService\.instant\(\s*'"['"]\s*\)/g``` is used to match translation keys within TypeScript files.
  - It looks for strings enclosed in single or double quotes that are passed as arguments to the translateService.instant method.
  - Example: ```const hello = this.translateService.instant('hello_world');``` will match ```'hello_world'```.
  - Note: Make sure to name the service translateService as shown in the example above. 


### Example

```sh
npx @56duong/extract-ngx-translate ./src/app ./src/assets/i18n/en.json ./src/assets/i18n/fr.json ./src/assets/i18n/vi.json --file-types='.ts,.html' --key-as-default-value --uppercase-first-value --remove-underscore
```
or
```sh
npx @56duong/extract-ngx-translate ./src/app ./src/assets/i18n/en.json ./src/assets/i18n/fr.json ./src/assets/i18n/vi.json --file-types='.ts,.html' --kd --ufv --ru
```
This command will:

- Scan the `./src/app` directory for `.ts` and `.html` files.
- Extract translation keys and apply the specified transformations. Use key as default value, uppercase the first letter of the value and remove underscores. 
- Update the `en.json`, `fr.json`, and `vi.json` files with the new keys and values.


### Input Example

#### TypeScript File (`example.component.ts`)
```typescript
import { TranslateService } from '@ngx-translate/core';

export class ExampleComponent {
  constructor(private translateService: TranslateService) {}

  ngOnInit() {
    const hello = this.translateService.instant('hello_world');
    const welcome = this.translateService.instant('welcome_message');
  }
}

Note: Make sure to name the service translateService as shown in the example above.
```

#### HTML File (example.component.html)
```html
<p>{{ 'hello_world' | translate }}</p>
<p>{{ 'welcome_message' | translate }}</p>
```


### Output Example

#### English Translation File (en.json)
```json
{
  "hello_world": "Hello world",
  "welcome_message": "Welcome message"
}
```

#### French Translation File (fr.json)
```json
{
  "hello_world": "Hello world",
  "welcome_message": "Welcome message"
}
```

#### Vietnamese Translation File (vi.json)
```json
{
  "hello_world": "Hello world",
  "welcome_message": "Welcome message"
}
```


## License

This project is licensed under the MIT License.

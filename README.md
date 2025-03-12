# localizable-translate
## Overview

`localizable-translate` is a tool designed to translate `Localizable.xcstrings` files for different languages. It supports multiple translation models including OpenAI, Anthropic, and Google Generative AI (Gemini). This tool reads the languages and prompt configurations from specific files and translates the strings accordingly.

## Setup Requirements

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).

2. **Environment Variables**: Create a `.env` file in the root directory of your project to store your API keys. The required environment variables are:
   - `OPENAI_API_KEY` for OpenAI
   - `ANTHROPIC_API_KEY` for Anthropic
   - `GEMINI_API_KEY` for Google Generative AI

   Example `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
3. **Configuration Files**:
   - `.localizable_languages`: A file specifying the languages you want to translate to, with one language per line.
     Example:
     ```
     ar
     de
     fr
     es
     ```
   - `.localizable_prompt`: A file containing the prompt template for the translation. Use `{{LANGUAGES}}` as a placeholder for the languages list.

4. **Dependencies**: Install the necessary dependencies by running:
   ```bash
   npm install
   ```
## Usage

1. **Command Line Arguments**:
   - `--dry-run`: Perform a dry run without making actual translations.
   - `--verbose`: Enable verbose logging.
   - `--model=<model>`: Specify the translation model to use (`openai`, `anthropic`, or `gemini`). Defaults to `openai`.
   - `--chunk-size=<size>`: Specify the chunk size for processing translations. Defaults to 10.
   - `--output=<path>`: Specify the output file path. Defaults to input filename with "_translated_[timestamp]" suffix.

2. **Running the Script**:
   ```bash
   node dist/index.js [options] [path_to_Localizable.xcstrings]
   ```

   The input file path is optional and defaults to "./Localizable.xcstrings" if not specified.

   Example:
   ```bash
   # Using default input path with OpenAI
   node dist/index.js --verbose

   # Specifying input file and using Anthropic
   node dist/index.js --model=anthropic --chunk-size=5 ./MyStrings.xcstrings

   # Dry run with custom output path
   node dist/index.js --dry-run --output=./output.xcstrings ./input.xcstrings
   ```

## About

This tool powers the localization of [Time Awareness](https://apps.apple.com/us/app/time-awareness-visualizations/id6742592534), an iOS app that helps people with timeblindness visualize and understand the passage of time through engaging visual representations. The app features 24 different visualization types for tracking hours, days, weeks, months, years and human life spans.

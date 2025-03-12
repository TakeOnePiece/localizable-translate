# localizable-translate
## Overview

`localizable-translate` is a tool designed to translate `Localizable.xcstrings` files for different languages. It supports multiple translation models including OpenAI, Anthropic, and Google Generative AI (Gemini). This tool reads the languages and prompt configurations from specific files and translates the strings accordingly.

## Setup Requirements

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).

2. **Installation**: Install the package in your project:
   ```bash
   npm install --save-dev localizable-translate
   ```

3. **Environment Variables**: Create a `.env` file in the root directory of your project to store your API keys. The required environment variables are:
   - `OPENAI_API_KEY` for OpenAI
   - `ANTHROPIC_API_KEY` for Anthropic
   - `GEMINI_API_KEY` for Google Generative AI

   Example `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. **Configuration Files**:
   - `.localizable_languages`: A file specifying the languages you want to translate to, with one language per line.
     Example:
     ```
     ar
     de
     fr
     es
     ```
   - `.localizable_prompt`: A file containing the prompt template for the translation. Use `{{LANGUAGES}}` as a placeholder for the languages list.

## Usage

1. **Command Line Arguments**:
   ```bash
   npx localizable-translate [options] <input> [output]
   ```

   Where:
   - `input`: Path to input Localizable.xcstrings file (defaults to "./Localizable.xcstrings")
   - `output`: Path to output file (defaults to input filename with "_translated_[timestamp]" suffix)
   - Options:
     - `--dry-run`: Perform a dry run without making actual translations
     - `--verbose`: Enable verbose logging
     - `--model=<model>`: Specify translation model (`openai`, `anthropic`, or `gemini`, defaults to `openai`)
     - `--chunk-size=<size>`: Specify chunk size for processing translations (defaults to 10)

2. **Examples**:
   ```bash
   # Specify input and output paths
   npx localizable-translate input.xcstrings output.xcstrings

   # Use Anthropic model with custom chunk size
   npx localizable-translate --model=anthropic --chunk-size=5 input.xcstrings

   # Dry run with verbose logging
   npx localizable-translate --dry-run --verbose input.xcstrings
   ```

## About

This tool powers the localization of [Time Awareness](https://apps.apple.com/us/app/time-awareness-visualizations/id6742592534), an iOS app that helps people with timeblindness visualize and understand the passage of time through engaging visual representations. The app features 24 different visualization types for tracking hours, days, weeks, months, years and human life spans.

![Example](src/example.png)



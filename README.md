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
   - `.localizable_languages`: A JSON file specifying the languages you want to translate to.
     Example:
     ```json
     {
       "languages": ["ar", "de", "fr", "es"]
     }
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
   - `--model=<model>`: Specify the translation model to use (`openai`, `anthropic`, or `gemini`).
   - `--chunk-size=<size>`: Specify the chunk size for processing translations.

2. **Running the Script**:
   ```bash
   node dist/index.js [options] <path_to_Localizable.xcstrings>
   ```

   Example:
   ```bash
   node dist/index.js --model=openai --chunk-size=5 --verbose ./Localizable.xcstrings
   ```

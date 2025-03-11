#!/usr/bin/env node

import * as fs from "fs";
import { OpenAI } from "openai";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileContent, LocalizableConfig, StringEntry, StringsObject } from "./models";
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

// Load environment variables
dotenv.config();
// Read languages from .localizable_languages file if it exists
function readLanguagesFromConfig(): string[] {
  const configFile = ".localizable_languages";
  if (!fs.existsSync(configFile)) {
    console.error(`Error: ${configFile} file does not exist`);
    process.exit(1);
  }

  try {
    const config = fs.readFileSync(configFile, "utf8");
    const languages = config
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (languages.length === 0) {
      console.error("Error: No languages specified in config file");
      process.exit(1);
    }
    return languages;
  } catch (error) {
    console.error(`Error reading ${configFile} file:`, error);
    process.exit(1);
  }
}

// Read prompt from .localizable_prompt file if it exists
function readPromptFromFile(expectedLanguages: string[]): string {
  try {
    if (fs.existsSync(".localizable_prompt")) {
      const promptTemplate = fs.readFileSync(".localizable_prompt", "utf8");
      return promptTemplate.replace("{{LANGUAGES}}", expectedLanguages.join(", "));
    }
  } catch (error) {
    console.error("Error reading .localizable_prompt file:", error);
  }

  // Default prompt if file doesn't exist
  return `You are a translator of software interface. Our app is a consumer app and you want to use language that's modern and casual for the langauge. Add translations for ${expectedLanguages.join(
    ", "
  )} languages in the provided JSON structure. Keep existing translations.

Return a valid JSON object that matches this format for each string:
{
  "localizations": {
    "ar": {
      "stringUnit": {
        "state": "translated",
        "value": "Arabic translation"
      }
    },
    "de": {
      "stringUnit": {
        "state": "translated",
        "value": "German translation"
      }
    }
    // etc for other languages
  }
}`;
}

async function translateWithOpenAI(openai: OpenAI, chunkObj: Record<string, StringEntry>, expectedLanguages: string[]) {
  const systemPrompt = readPromptFromFile(expectedLanguages);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Original text and existing translations: ${JSON.stringify(chunkObj, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content) as StringsObject;
}

async function translateWithAnthropic(
  anthropic: Anthropic,
  chunkObj: Record<string, StringEntry>,
  expectedLanguages: string[]
) {
  const systemPrompt = readPromptFromFile(expectedLanguages);

  const completion = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Original text and existing translations: ${JSON.stringify(chunkObj, null, 2)}`,
      },
    ],
  });

  // Extract JSON from the response
  const content =
    completion.content[0].type === "text" ? completion.content[0].text : JSON.stringify(completion.content[0]);

  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
    content.match(/```\n([\s\S]*?)\n```/) || [null, content];
  return JSON.parse(jsonMatch[1]) as StringsObject;
}

async function translateWithGemini(
  genAI: GoogleGenerativeAI,
  chunkObj: Record<string, StringEntry>,
  expectedLanguages: string[]
) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const systemPrompt = readPromptFromFile(expectedLanguages);

  const prompt = `${systemPrompt}

Original text and existing translations: ${JSON.stringify(chunkObj, null, 2)}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Extract JSON from the response
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
  return JSON.parse(jsonMatch[1]) as StringsObject;
}

async function translateLocalizationChunks(
  filePath: string,
  outputPath: string,
  chunkSize: number = 10,
  apiKey: string,
  dryRun: boolean = false,
  verbose: boolean = false,
  model: string = "openai"
): Promise<void> {
  // Initialize clients based on model
  let openai: OpenAI | null = null;
  let anthropic: Anthropic | null = null;
  let genAI: GoogleGenerativeAI | null = null;

  if (model === "openai") {
    openai = new OpenAI({ apiKey });
  } else if (model === "anthropic") {
    anthropic = new Anthropic({ apiKey });
  } else if (model === "gemini") {
    genAI = new GoogleGenerativeAI(apiKey);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }

  // Read and parse the JSON file
  const fileContent: FileContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const strings = fileContent.strings;

  // Define expected languages based on .localizable file or default
  const expectedLanguages: string[] = readLanguagesFromConfig();

  if (verbose) console.log(`Using languages: ${expectedLanguages.join(", ")}`);

  // Find entries missing translations
  const entries = Object.entries(strings).filter(([key, value]) => {
    const localizations = value.localizations || {};
    const existingLanguages = Object.keys(localizations);
    return !!key && existingLanguages.length < expectedLanguages.length;
  });

  if (verbose) console.log(`Found ${entries.length} entries with missing translations`);

  // Split into chunks
  const chunks: Array<[string, StringEntry][]> = [];
  if (dryRun) {
    // For dry run, only take first entry that needs translation
    chunks.push(entries.slice(0, 1));
  } else {
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(entries.slice(i, i + chunkSize));
    }
  }

  if (verbose) console.log(`Split into ${chunks.length} chunks of size ${chunkSize}`);

  // Initialize progress bar
  const progressBar = new cliProgress.SingleBar({
    format: "CLI Progress |" + colors.cyan("{bar}") + "| {percentage}% || {value}/{total} Chunks || Speed: {speed}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  progressBar.start(entries.length, 0, {
    speed: "N/A",
  });

  // Process chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (verbose) console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} entries)`);

    try {
      // Convert chunk back to object for API call
      const chunkObj = Object.fromEntries(chunk);

      if (verbose) {
        console.log(`Calling ${model.toUpperCase()} API for chunk ${i + 1}...`);
        console.log("Converted chunk object:", JSON.stringify(chunkObj, null, 2));
      }

      // Call API to translate based on selected model
      let translatedChunk: StringsObject;

      if (model === "openai" && openai) {
        translatedChunk = await translateWithOpenAI(openai, chunkObj, expectedLanguages);
      } else if (model === "anthropic" && anthropic) {
        translatedChunk = await translateWithAnthropic(anthropic, chunkObj, expectedLanguages);
      } else if (model === "gemini" && genAI) {
        translatedChunk = await translateWithGemini(genAI, chunkObj, expectedLanguages);
      } else {
        throw new Error(`Model ${model} not properly initialized`);
      }

      if (verbose) console.log(`Received response for chunk ${i + 1}`);

      if (dryRun) {
        if (verbose) console.log("Sample translation for first chunk:", JSON.stringify(translatedChunk, null, 2));
        break;
      }

      // Merge translations back into main object
      if (verbose) {
        console.log("Merging translations:", {
          existingKeys: Object.keys(strings).length,
          newKeys: Object.keys(translatedChunk).length,
          sampleKey: Object.keys(translatedChunk)[0],
        });
      }
      Object.assign(strings, translatedChunk);
      if (verbose) console.log(`Merged translations for chunk ${i + 1}`);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      if (dryRun) return;
    } finally {
      if (verbose) console.log(`Saving progress for chunk ${i + 1}...`);

      // Validate and save current state
      try {
        JSON.stringify(fileContent); // Validate JSON structure
        fs.writeFileSync(outputPath, JSON.stringify(fileContent, null, 2));
        if (verbose) console.log(`Progress saved to ${outputPath}`);
      } catch (error) {
        console.error(`Error saving progress for chunk ${i + 1}:`, error);
      }
    }

    // Update progress bar
    progressBar.increment(chunk.length);
  }

  if (verbose) console.log("Validating final JSON structure...");

  // Validate final JSON structure
  try {
    JSON.stringify(fileContent);
    // Save to new file if valid
    fs.writeFileSync(outputPath, JSON.stringify(fileContent, null, 2));
    console.log(`Translations completed and saved to ${outputPath}`);
  } catch (error) {
    console.error("Invalid JSON structure:", error);
  }

  // Stop the progress bar
  progressBar.stop();
}

// Main function to run the script
async function main(): Promise<void> {
  try {
    // Read command line arguments
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const verbose = args.includes("--verbose");

    // Get model type
    const modelArg = args.find((arg) => arg.startsWith("--model="));
    const model = modelArg ? modelArg.split("=")[1] : "openai";

    if (verbose) console.log(`Using model: ${model}`);

    // Get file path
    const filePathArg = args.find((arg) => arg.endsWith(".xcstrings") && !arg.startsWith("--"));
    const filePath = filePathArg || "./Localizable.xcstrings";

    if (verbose) console.log(`Using file: ${filePath}`);

    // Get output path
    const outputArg = args.find((arg) => arg.startsWith("--output="));
    const outputPath = outputArg
      ? outputArg.split("=")[1]
      : filePath.replace(".xcstrings", `_translated_${new Date().toISOString().replace(/[:.]/g, "-")}.xcstrings`);

    if (verbose) console.log(`Using output path: ${outputPath}`);

    // Get chunk size
    const chunkSizeArg = args.find((arg) => arg.startsWith("--chunk-size="));
    const chunkSize = chunkSizeArg ? parseInt(chunkSizeArg.split("=")[1], 10) : 10;

    if (verbose) console.log(`Using chunk size: ${chunkSize}`);

    // Read OpenAI API key from environment variable or .env file
    let apiKey = process.env.OPENAI_API_KEY;

    if (model === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY;
    } else if (model === "gemini") {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      throw new Error(`${model.toUpperCase()}_API_KEY environment variable is not set`);
    }

    await translateLocalizationChunks(filePath, outputPath, chunkSize, apiKey, dryRun, verbose, model);
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

// Run the script
main();

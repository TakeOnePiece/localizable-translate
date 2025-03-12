#!/usr/bin/env node
import * as dotenv from "dotenv";
import { program } from "commander";
import { translateLocalizationChunks } from "./generate";

// Load environment variables
dotenv.config();

// Main function to run the script
async function main(): Promise<void> {
  try {
    program
      .option("--dry-run", "Run in dry-run mode")
      .option("--verbose", "Enable verbose logging")
      .option("--model <type>", "Model to use for translation", "openai")
      .option("--output <path>", "Output file path")
      .option("--chunk-size <size>", "Number of strings per chunk", "10")
      .argument("[filePath]", "Input .xcstrings file path", "./Localizable.xcstrings");

    program.parse();

    const options = program.opts();
    const filePath = program.args[0];

    const {
      dryRun = false,
      verbose = false,
      model = "openai",
      output: outputPath = filePath,
      chunkSize = 10,
    } = options;

    if (verbose) {
      console.log(`Using model: ${model}`);
      console.log(`Using file: ${filePath}`);
      console.log(`Using output path: ${outputPath}`);
      console.log(`Using chunk size: ${chunkSize}`);
    }

    // Read API key from environment variable based on model
    const apiKeyVar = `${model.toUpperCase()}_API_KEY`;
    const apiKey = process.env[apiKeyVar];

    if (!apiKey) {
      throw new Error(`${apiKeyVar} environment variable is not set`);
    }

    await translateLocalizationChunks(filePath, outputPath, Number(chunkSize), apiKey, dryRun, verbose, model);
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

// Run the script
main();

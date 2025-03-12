#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const commander_1 = require("commander");
const generate_1 = require("./generate");
// Load environment variables
dotenv.config();
// Main function to run the script
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            commander_1.program
                .option("--dry-run", "Run in dry-run mode")
                .option("--verbose", "Enable verbose logging")
                .option("--model <type>", "Model to use for translation", "openai")
                .option("--output <path>", "Output file path")
                .option("--chunk-size <size>", "Number of strings per chunk", "10")
                .argument("[filePath]", "Input .xcstrings file path", "./Localizable.xcstrings");
            commander_1.program.parse();
            const options = commander_1.program.opts();
            const filePath = commander_1.program.args[0];
            const { dryRun = false, verbose = false, model = "openai", output: outputPath = filePath, chunkSize = 10, } = options;
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
            yield (0, generate_1.translateLocalizationChunks)(filePath, outputPath, Number(chunkSize), apiKey, dryRun, verbose, model);
        }
        catch (error) {
            console.error("Error in main:", error);
            process.exit(1);
        }
    });
}
// Run the script
main();

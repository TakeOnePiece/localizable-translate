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
const fs = require("fs");
const openai_1 = require("openai");
const dotenv = require("dotenv");
const sdk_1 = require("@anthropic-ai/sdk");
const generative_ai_1 = require("@google/generative-ai");
const progress_1 = require("progress");
// Load environment variables
dotenv.config();
// Read languages from .localizable_languages file if it exists
function readLanguagesFromConfig() {
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
    }
    catch (error) {
        console.error(`Error reading ${configFile} file:`, error);
        process.exit(1);
    }
}
// Read prompt from .localizable_prompt file if it exists
function readPromptFromFile(expectedLanguages) {
    try {
        if (fs.existsSync(".localizable_prompt")) {
            const promptTemplate = fs.readFileSync(".localizable_prompt", "utf8");
            return promptTemplate.replace("{{LANGUAGES}}", expectedLanguages.join(", "));
        }
    }
    catch (error) {
        console.error("Error reading .localizable_prompt file:", error);
    }
    // Default prompt if file doesn't exist
    return `You are a translator of software interface. Our app is a consumer app and you want to use language that's modern and casual for the langauge. Add translations for ${expectedLanguages.join(", ")} languages in the provided JSON structure. Keep existing translations.

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
function translateWithOpenAI(openai, chunkObj, expectedLanguages) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = readPromptFromFile(expectedLanguages);
        const completion = yield openai.chat.completions.create({
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
        return JSON.parse(completion.choices[0].message.content);
    });
}
function translateWithAnthropic(anthropic, chunkObj, expectedLanguages) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = readPromptFromFile(expectedLanguages);
        const completion = yield anthropic.messages.create({
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
        const content = completion.content[0].type === "text" ? completion.content[0].text : JSON.stringify(completion.content[0]);
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
            content.match(/```\n([\s\S]*?)\n```/) || [null, content];
        return JSON.parse(jsonMatch[1]);
    });
}
function translateWithGemini(genAI, chunkObj, expectedLanguages) {
    return __awaiter(this, void 0, void 0, function* () {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const systemPrompt = readPromptFromFile(expectedLanguages);
        const prompt = `${systemPrompt}

Original text and existing translations: ${JSON.stringify(chunkObj, null, 2)}`;
        const result = yield model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        // Extract JSON from the response
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
        return JSON.parse(jsonMatch[1]);
    });
}
function translateLocalizationChunks(filePath_1) {
    return __awaiter(this, arguments, void 0, function* (filePath, chunkSize = 10, apiKey, dryRun = false, verbose = false, model = "openai") {
        // Initialize clients based on model
        let openai = null;
        let anthropic = null;
        let genAI = null;
        if (model === "openai") {
            openai = new openai_1.OpenAI({ apiKey });
        }
        else if (model === "anthropic") {
            anthropic = new sdk_1.default({ apiKey });
        }
        else if (model === "gemini") {
            genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        }
        else {
            throw new Error(`Unsupported model: ${model}`);
        }
        // Read and parse the JSON file
        const fileContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const strings = fileContent.strings;
        // Define expected languages based on .localizable file or default
        const expectedLanguages = readLanguagesFromConfig();
        if (verbose)
            console.log(`Using languages: ${expectedLanguages.join(", ")}`);
        // Find entries missing translations
        const entries = Object.entries(strings).filter(([key, value]) => {
            const localizations = value.localizations || {};
            const existingLanguages = Object.keys(localizations);
            return !!key && existingLanguages.length < expectedLanguages.length;
        });
        if (verbose)
            console.log(`Found ${entries.length} entries with missing translations`);
        // Split into chunks
        const chunks = [];
        if (dryRun) {
            // For dry run, only take first entry that needs translation
            chunks.push(entries.slice(0, 1));
        }
        else {
            for (let i = 0; i < entries.length; i += chunkSize) {
                chunks.push(entries.slice(i, i + chunkSize));
            }
        }
        if (verbose)
            console.log(`Split into ${chunks.length} chunks of size ${chunkSize}`);
        // Initialize progress bar
        const progressBar = new progress_1.default("Translating [:bar] :current/:total :percent :etas", {
            total: entries.length,
            width: 40,
        });
        // Process chunks
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (verbose)
                console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} entries)`);
            try {
                // Convert chunk back to object for API call
                const chunkObj = Object.fromEntries(chunk);
                if (verbose) {
                    console.log(`Calling ${model.toUpperCase()} API for chunk ${i + 1}...`);
                    console.log("Converted chunk object:", JSON.stringify(chunkObj, null, 2));
                }
                // Call API to translate based on selected model
                let translatedChunk;
                if (model === "openai" && openai) {
                    translatedChunk = yield translateWithOpenAI(openai, chunkObj, expectedLanguages);
                }
                else if (model === "anthropic" && anthropic) {
                    translatedChunk = yield translateWithAnthropic(anthropic, chunkObj, expectedLanguages);
                }
                else if (model === "gemini" && genAI) {
                    translatedChunk = yield translateWithGemini(genAI, chunkObj, expectedLanguages);
                }
                else {
                    throw new Error(`Model ${model} not properly initialized`);
                }
                if (verbose)
                    console.log(`Received response for chunk ${i + 1}`);
                if (dryRun) {
                    if (verbose)
                        console.log("Sample translation for first chunk:", JSON.stringify(translatedChunk, null, 2));
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
                if (verbose)
                    console.log(`Merged translations for chunk ${i + 1}`);
            }
            catch (error) {
                console.error(`Error processing chunk ${i + 1}:`, error);
                if (dryRun)
                    return;
            }
            finally {
                // Save progress after each chunk
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const outputPath = filePath.replace(".xcstrings", `_translated_${timestamp}.xcstrings`);
                if (verbose)
                    console.log(`Saving progress for chunk ${i + 1}...`);
                // Validate and save current state
                try {
                    JSON.stringify(fileContent); // Validate JSON structure
                    fs.writeFileSync(outputPath, JSON.stringify(fileContent, null, 2));
                    if (verbose)
                        console.log(`Progress saved to ${outputPath}`);
                }
                catch (error) {
                    console.error(`Error saving progress for chunk ${i + 1}:`, error);
                }
            }
            // Update progress bar
            progressBar.tick(chunk.length);
        }
        // Generate output filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const outputPath = filePath.replace(".xcstrings", `_translated_${timestamp}.xcstrings`);
        if (verbose)
            console.log("Validating final JSON structure...");
        // Validate final JSON structure
        try {
            JSON.stringify(fileContent);
            // Save to new file if valid
            fs.writeFileSync(outputPath, JSON.stringify(fileContent, null, 2));
            console.log(`Translations completed and saved to ${outputPath}`);
        }
        catch (error) {
            console.error("Invalid JSON structure:", error);
        }
    });
}
// Main function to run the script
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Read command line arguments
            const args = process.argv.slice(2);
            const dryRun = args.includes("--dry-run");
            const verbose = args.includes("--verbose");
            // Get model type
            const modelArg = args.find((arg) => arg.startsWith("--model="));
            const model = modelArg ? modelArg.split("=")[1] : "openai";
            if (verbose)
                console.log(`Using model: ${model}`);
            // Get file path
            const filePathArg = args.find((arg) => arg.endsWith(".xcstrings") && !arg.startsWith("--"));
            const filePath = filePathArg || "./Localizable.xcstrings";
            if (verbose)
                console.log(`Using file: ${filePath}`);
            // Get chunk size
            const chunkSizeArg = args.find((arg) => arg.startsWith("--chunk-size="));
            const chunkSize = chunkSizeArg ? parseInt(chunkSizeArg.split("=")[1], 10) : 10;
            if (verbose)
                console.log(`Using chunk size: ${chunkSize}`);
            // Read OpenAI API key from environment variable or .env file
            let apiKey = process.env.OPENAI_API_KEY;
            if (model === "anthropic") {
                apiKey = process.env.ANTHROPIC_API_KEY;
            }
            else if (model === "gemini") {
                apiKey = process.env.GEMINI_API_KEY;
            }
            if (!apiKey) {
                throw new Error(`${model.toUpperCase()}_API_KEY environment variable is not set`);
            }
            yield translateLocalizationChunks(filePath, chunkSize, apiKey, dryRun, verbose, model);
        }
        catch (error) {
            console.error("Error in main:", error);
            process.exit(1);
        }
    });
}
// Run the script
main();

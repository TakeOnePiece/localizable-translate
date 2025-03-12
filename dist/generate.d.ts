import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { StringEntry, StringsObject } from "./models";
export declare function translateWithOpenAI(openai: OpenAI, chunkObj: Record<string, StringEntry>, expectedLanguages: string[]): Promise<StringsObject>;
export declare function translateWithAnthropic(anthropic: Anthropic, chunkObj: Record<string, StringEntry>, expectedLanguages: string[]): Promise<StringsObject>;
export declare function translateWithGemini(genAI: GoogleGenerativeAI, chunkObj: Record<string, StringEntry>, expectedLanguages: string[]): Promise<StringsObject>;
export declare function translateLocalizationChunks(filePath: string, outputPath: string, chunkSize: number, apiKey: string, dryRun?: boolean, verbose?: boolean, model?: string): Promise<void>;

/**
 * hybrid-llm.test.ts - Unit tests for the HybridLLM backend.
 *
 * Verifies that the hybrid backend delegates operations to the correct inner
 * backend: embeddings/tokenization to local LlamaCpp, generate/expand/rerank
 * to OllamaLLM. The inner methods are stubbed so no real Ollama server or
 * GGUF model is loaded.
 */

import { describe, test, expect, vi, afterEach } from "vitest";
import {
  HybridLLM,
  LlamaCpp,
  OllamaLLM,
  createLLM,
  resolveBackend,
  type LLM,
} from "../src/llm.js";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.QMD_BACKEND;
  delete process.env.QMD_OLLAMA_API_KEY;
  delete process.env.QMD_OLLAMA_HOST;
  delete process.env.QMD_OLLAMA_EMBED;
  delete process.env.QMD_OLLAMA_GENERATE;
  delete process.env.QMD_OLLAMA_RERANK;
});

describe("backend selection", () => {
  test("defaults to local", () => {
    expect(resolveBackend()).toBe("local");
  });

  test("accepts hybrid via env", () => {
    process.env.QMD_BACKEND = "hybrid";
    expect(resolveBackend()).toBe("hybrid");
  });

  test("accepts hybrid via config", () => {
    expect(resolveBackend({ backend: "hybrid" })).toBe("hybrid");
  });

  test("createLLM returns HybridLLM for hybrid backend", () => {
    const llm = createLLM({ backend: "hybrid" });
    expect(llm).toBeInstanceOf(HybridLLM);
  });

  test("createLLM returns LlamaCpp for local backend", () => {
    const llm = createLLM({ backend: "local" });
    expect(llm).toBeInstanceOf(LlamaCpp);
  });
});

describe("HybridLLM delegation", () => {
  function makeHybrid(): { llm: HybridLLM; local: LLM; ollama: LLM } {
    const llm = new HybridLLM({});
    const local = (llm as unknown as { local: LLM }).local;
    const ollama = (llm as unknown as { ollama: LLM }).ollama;
    return { llm, local, ollama };
  }

  test("embed delegates to local LlamaCpp", async () => {
    const { llm, local, ollama } = makeHybrid();
    const localSpy = vi.spyOn(local, "embed").mockResolvedValue({ embedding: [1, 2], model: "local" });
    const ollamaSpy = vi.spyOn(ollama, "embed").mockResolvedValue({ embedding: [9], model: "ollama" });
    const result = await llm.embed("text");
    expect(localSpy).toHaveBeenCalled();
    expect(ollamaSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ embedding: [1, 2], model: "local" });
  });

  test("embedBatch delegates to local LlamaCpp", async () => {
    const { llm, local, ollama } = makeHybrid();
    const localSpy = vi.spyOn(local, "embedBatch").mockResolvedValue([{ embedding: [1], model: "local" }]);
    const ollamaSpy = vi.spyOn(ollama, "embedBatch").mockResolvedValue([{ embedding: [9], model: "ollama" }]);
    const result = await llm.embedBatch(["a"]);
    expect(localSpy).toHaveBeenCalled();
    expect(ollamaSpy).not.toHaveBeenCalled();
    expect(result).toEqual([{ embedding: [1], model: "local" }]);
  });

  test("generate delegates to OllamaLLM", async () => {
    const { llm, local, ollama } = makeHybrid();
    const localSpy = vi.spyOn(local, "generate").mockResolvedValue({ text: "local" } as never);
    const ollamaSpy = vi.spyOn(ollama, "generate").mockResolvedValue({ text: "ollama" } as never);
    const result = await llm.generate("prompt");
    expect(ollamaSpy).toHaveBeenCalled();
    expect(localSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ text: "ollama" });
  });

  test("expandQuery delegates to OllamaLLM", async () => {
    const { llm, local, ollama } = makeHybrid();
    const localSpy = vi.spyOn(local, "expandQuery").mockResolvedValue([]);
    const ollamaSpy = vi.spyOn(ollama, "expandQuery").mockResolvedValue([{ query: "q" } as never]);
    const result = await llm.expandQuery("q");
    expect(ollamaSpy).toHaveBeenCalled();
    expect(localSpy).not.toHaveBeenCalled();
    expect(result).toEqual([{ query: "q" }]);
  });

  test("rerank delegates to OllamaLLM", async () => {
    const { llm, local, ollama } = makeHybrid();
    const docs = [{ file: "a", text: "a" }];
    const localSpy = vi.spyOn(local, "rerank").mockResolvedValue({ query: "q", results: [] } as never);
    const ollamaSpy = vi.spyOn(ollama, "rerank").mockResolvedValue({ query: "q", results: [{ file: "a", score: 1 }] } as never);
    const result = await llm.rerank("q", docs);
    expect(ollamaSpy).toHaveBeenCalled();
    expect(localSpy).not.toHaveBeenCalled();
    expect(result.results).toEqual([{ file: "a", score: 1 }]);
  });

  test("modelExists combines local and ollama", async () => {
    const { llm, local, ollama } = makeHybrid();
    vi.spyOn(local, "modelExists").mockResolvedValue({ name: "m", exists: false });
    vi.spyOn(ollama, "modelExists").mockResolvedValue({ name: "m", exists: true });
    const result = await llm.modelExists("m");
    expect(result.exists).toBe(true);
  });

  test("modelExists false when neither backend has it", async () => {
    const { llm, local, ollama } = makeHybrid();
    vi.spyOn(local, "modelExists").mockResolvedValue({ name: "m", exists: false });
    vi.spyOn(ollama, "modelExists").mockResolvedValue({ name: "m", exists: false });
    const result = await llm.modelExists("m");
    expect(result.exists).toBe(false);
  });

  test("embedModelName comes from local, generate/rerank from ollama", () => {
    const { llm } = makeHybrid();
    expect(llm.embedModelName).toBe((llm as unknown as { local: { embedModelName: string } }).local.embedModelName);
    expect(llm.generateModelName).toBe((llm as unknown as { ollama: { generateModelName: string } }).ollama.generateModelName);
    expect(llm.rerankModelName).toBe((llm as unknown as { ollama: { rerankModelName: string } }).ollama.rerankModelName);
  });
});

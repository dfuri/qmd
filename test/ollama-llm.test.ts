/**
 * ollama-llm.test.ts - Unit tests for the Ollama LLM backend.
 *
 * These tests mock `fetch` so no real Ollama server is required.
 */

import { describe, test, expect, vi, afterEach } from "vitest";
import {
  OllamaLLM,
  createLLM,
  resolveBackend,
  resolveOllamaConfig,
  DEFAULT_OLLAMA_HOST,
  type LLM,
} from "../src/llm.js";

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<unknown>): void {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = await handler(url, init);
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => body,
    } as Response;
  }));
}

function mockFetchError(status: number, statusText: string): void {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: false,
    status,
    statusText,
    json: async () => ({}),
  }) as unknown as Response));
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.QMD_BACKEND;
  delete process.env.QMD_OLLAMA_HOST;
  delete process.env.QMD_OLLAMA_EMBED;
  delete process.env.QMD_OLLAMA_GENERATE;
  delete process.env.QMD_OLLAMA_RERANK;
  delete process.env.QMD_OLLAMA_API_KEY;
});

describe("backend selection", () => {
  test("defaults to local", () => {
    expect(resolveBackend()).toBe("local");
  });

  test("respects config backend", () => {
    expect(resolveBackend({ backend: "hybrid" })).toBe("hybrid");
    expect(resolveBackend({ backend: "local" })).toBe("local");
  });

  test("env QMD_BACKEND overrides config", () => {
    process.env.QMD_BACKEND = "hybrid";
    expect(resolveBackend({ backend: "local" })).toBe("hybrid");
  });

  test("legacy ollama backend maps to hybrid", () => {
    expect(resolveBackend({ backend: "ollama" as never })).toBe("hybrid");
    process.env.QMD_BACKEND = "ollama";
    expect(resolveBackend()).toBe("hybrid");
  });

  test("createLLM returns a non-Ollama LLM for local backend", () => {
    const llm = createLLM({ backend: "local" });
    expect(llm).toBeDefined();
    expect(llm).not.toBeInstanceOf(OllamaLLM);
  });
});

describe("ollama config resolution", () => {
  test("uses defaults when nothing configured", () => {
    const cfg = resolveOllamaConfig();
    expect(cfg.host).toBe(DEFAULT_OLLAMA_HOST);
    expect(cfg.embed).toBe("nomic-embed-text");
    expect(cfg.generate).toBe("qwen3");
    expect(cfg.rerank).toBe("awenleven/Qwen3-Reranker-4B:Q4_K_M");
  });

  test("config overrides defaults", () => {
    const cfg = resolveOllamaConfig({ host: "http://example:11434", embed: "e", generate: "g", rerank: "r" });
    expect(cfg.host).toBe("http://example:11434");
    expect(cfg.embed).toBe("e");
    expect(cfg.generate).toBe("g");
    expect(cfg.rerank).toBe("r");
  });

  test("config takes precedence over env (consistent with model resolution)", () => {
    process.env.QMD_OLLAMA_HOST = "http://env:11434";
    process.env.QMD_OLLAMA_EMBED = "env-embed";
    const cfg = resolveOllamaConfig({ host: "http://cfg:11434", embed: "cfg-embed" });
    expect(cfg.host).toBe("http://cfg:11434");
    expect(cfg.embed).toBe("cfg-embed");
  });

  test("env is used when config is absent", () => {
    process.env.QMD_OLLAMA_HOST = "http://env:11434";
    process.env.QMD_OLLAMA_EMBED = "env-embed";
    const cfg = resolveOllamaConfig();
    expect(cfg.host).toBe("http://env:11434");
    expect(cfg.embed).toBe("env-embed");
  });

  test("apiKey defaults to empty", () => {
    const cfg = resolveOllamaConfig();
    expect(cfg.apiKey).toBe("");
  });

  test("apiKey from config", () => {
    const cfg = resolveOllamaConfig({ apiKey: "cfg-key" });
    expect(cfg.apiKey).toBe("cfg-key");
  });

  test("apiKey from QMD_OLLAMA_API_KEY env", () => {
    process.env.QMD_OLLAMA_API_KEY = "env-key";
    const cfg = resolveOllamaConfig();
    expect(cfg.apiKey).toBe("env-key");
  });
});

describe("OllamaLLM.embed", () => {
  test("posts to /api/embed and maps the first embedding", async () => {
    let calledUrl = "";
    let calledBody: unknown;
    mockFetch((url, init) => {
      calledUrl = url;
      calledBody = JSON.parse(String(init?.body));
      return { embeddings: [[0.1, 0.2, 0.3]] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434", embed: "nomic-embed-text" });
    const result = await llm.embed("hello");
    expect(calledUrl).toBe("http://localhost:11434/api/embed");
    expect(calledBody).toMatchObject({ model: "nomic-embed-text", input: "task: search result | query: hello" });
    expect(result).toEqual({ embedding: [0.1, 0.2, 0.3], model: "nomic-embed-text" });
  });

  test("returns null on HTTP error", async () => {
    mockFetchError(500, "Internal Server Error");
    const llm = new OllamaLLM();
    expect(await llm.embed("hello")).toBeNull();
  });
});

describe("OllamaLLM auth", () => {
  test("sends Authorization Bearer header when apiKey is set", async () => {
    let sentHeaders: Record<string, string> | undefined;
    mockFetch((url, init) => {
      sentHeaders = (init?.headers as Record<string, string>) ?? {};
      return { embeddings: [[0.1]] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434", apiKey: "secret-key" });
    await llm.embed("hello");
    expect(sentHeaders["Authorization"]).toBe("Bearer secret-key");
  });

  test("sends Authorization Bearer header from QMD_OLLAMA_API_KEY env", async () => {
    process.env.QMD_OLLAMA_API_KEY = "env-secret";
    let sentHeaders: Record<string, string> | undefined;
    mockFetch((url, init) => {
      sentHeaders = (init?.headers as Record<string, string>) ?? {};
      return { embeddings: [[0.1]] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434" });
    await llm.embed("hello");
    expect(sentHeaders["Authorization"]).toBe("Bearer env-secret");
  });

  test("does not send Authorization header when no apiKey", async () => {
    let sentHeaders: Record<string, string> | undefined;
    mockFetch((url, init) => {
      sentHeaders = (init?.headers as Record<string, string>) ?? {};
      return { embeddings: [[0.1]] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434" });
    await llm.embed("hello");
    expect(sentHeaders["Authorization"]).toBeUndefined();
    expect(sentHeaders["Content-Type"]).toBe("application/json");
  });
});

describe("OllamaLLM.embedBatch", () => {
  test("posts multiple inputs and maps embeddings", async () => {
    let calledBody: unknown;
    mockFetch((url, init) => {
      calledBody = JSON.parse(String(init?.body));
      return { embeddings: [[1], [2], [3]] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434", embed: "nomic-embed-text" });
    const results = await llm.embedBatch(["a", "b", "c"]);
    expect(calledBody).toMatchObject({ model: "nomic-embed-text", input: ["title: none | text: a", "title: none | text: b", "title: none | text: c"] });
    expect(results.map((r) => r?.embedding[0])).toEqual([1, 2, 3]);
  });

  test("returns nulls on HTTP error", async () => {
    mockFetchError(500, "Internal Server Error");
    const llm = new OllamaLLM();
    expect(await llm.embedBatch(["a", "b"])).toEqual([null, null]);
  });
});

describe("OllamaLLM.expandQuery", () => {
  test("parses lex/vec/hyde lines from chat response", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:11434/api/chat");
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("qwen3");
      return { message: { content: "lex: foo\nvec: foo bar\nhyde: foo baz" } };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434", generate: "qwen3" });
    const result = await llm.expandQuery("foo");
    expect(result).toEqual([
      { type: "lex", text: "foo" },
      { type: "vec", text: "foo bar" },
      { type: "hyde", text: "foo baz" },
    ]);
  });

  test("falls back to original query on error", async () => {
    mockFetchError(500, "Internal Server Error");
    const llm = new OllamaLLM();
    const result = await llm.expandQuery("foo");
    expect(result.some((q) => q.type === "vec" && q.text === "foo")).toBe(true);
  });
});

describe("OllamaLLM.rerank", () => {
  test("parses document numbers from chat response", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:11434/api/chat");
      return { message: { content: "2, 1, 3" } };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434", rerank: "reranker" });
    const result = await llm.rerank("query", [
      { file: "a", text: "doc a" },
      { file: "b", text: "doc b" },
      { file: "c", text: "doc c" },
    ]);
    expect(result.results.map((r) => r.file)).toEqual(["b", "a", "c"]);
    expect(result.model).toBe("reranker");
  });

  test("returns empty results on error", async () => {
    mockFetchError(500, "Internal Server Error");
    const llm = new OllamaLLM();
    const result = await llm.rerank("query", [{ file: "a", text: "doc a" }]);
    expect(result.results).toEqual([]);
  });
});

describe("OllamaLLM.modelExists", () => {
  test("checks /api/tags for the model", async () => {
    let calledUrl = "";
    mockFetch((url) => {
      calledUrl = url;
      return { models: [{ name: "qwen3" }, { name: "nomic-embed-text" }] };
    });
    const llm = new OllamaLLM({ host: "http://localhost:11434" });
    expect(calledUrl).toBe("");
    expect((await llm.modelExists("qwen3")).exists).toBe(true);
    expect(calledUrl).toBe("http://localhost:11434/api/tags");
    expect((await llm.modelExists("missing")).exists).toBe(false);
  });
});

describe("OllamaLLM tokenize/countTokens", () => {
  test("approximates token count by characters", async () => {
    const llm = new OllamaLLM();
    expect(await llm.countTokens("abcdefgh")).toBe(2);
    expect((await llm.tokenize("abcdefgh")).length).toBe(2);
  });
});

describe("OllamaLLM implements LLM", () => {
  test("satisfies the LLM interface", () => {
    const llm: LLM = new OllamaLLM();
    expect(llm).toBeDefined();
  });
});

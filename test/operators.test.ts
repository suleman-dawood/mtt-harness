import { describe, it, expect } from "vitest";
import { generateMutants, applyMutant } from "../src/engine/operators";

describe("generateMutants (JS/TS)", () => {
  it("swaps relational and arithmetic operators", async () => {
    const src = "function f(a){ return a > 2 + 1; }";
    const m = await generateMutants(src, "javascript");
    const ops = m.filter((x) => x.operator === "binary-op");
    expect(ops.map((o) => `${o.original}->${o.replacement}`)).toEqual(
      expect.arrayContaining([">->>=", "+->-"]),
    );
  });

  it("swaps logical operators", async () => {
    const src = "const x = a && b;";
    const m = await generateMutants(src, "javascript");
    expect(m.some((x) => x.original === "&&" && x.replacement === "||")).toBe(
      true,
    );
  });

  it("swaps boolean literals", async () => {
    const src = "const x = true;";
    const m = await generateMutants(src, "typescript");
    const b = m.find((x) => x.operator === "boolean-literal");
    expect(b?.replacement).toBe("false");
  });

  it("negates an if condition", async () => {
    const src = "function f(a){ if (a > 1) { return 1; } return 0; }";
    const m = await generateMutants(src, "javascript");
    const neg = m.find((x) => x.operator === "negate-condition");
    expect(neg?.replacement.startsWith("!(")).toBe(true);
  });

  it("removes an expression statement", async () => {
    const src = "function f(){ log(); return 1; }";
    const m = await generateMutants(src, "javascript");
    expect(m.some((x) => x.operator === "remove-statement")).toBe(true);
  });

  it("applyMutant produces the mutated source", async () => {
    const src = "const x = a > b;";
    const m = (await generateMutants(src, "javascript")).find(
      (x) => x.original === ">",
    )!;
    expect(applyMutant(src, m)).toBe("const x = a >= b;");
  });

  it("is deterministic across runs", async () => {
    const src = "function f(a){ return a > 2 && a + 1 < 5; }";
    const a = await generateMutants(src, "javascript");
    const b = await generateMutants(src, "javascript");
    expect(a).toEqual(b);
  });
});

describe("generateMutants (Python)", () => {
  const SRC = `def classify(age, active):
    if age >= 18 and active:
        return True
    x = age + 1
    return False
`;

  it("swaps comparison and arithmetic operators", async () => {
    const m = await generateMutants(SRC, "python");
    expect(m.some((x) => x.original === ">=" && x.replacement === ">")).toBe(
      true,
    );
    expect(m.some((x) => x.original === "+" && x.replacement === "-")).toBe(
      true,
    );
  });

  it("swaps and/or boolean operators", async () => {
    const m = await generateMutants(SRC, "python");
    expect(m.some((x) => x.original === "and" && x.replacement === "or")).toBe(
      true,
    );
  });

  it("swaps True/False with correct casing", async () => {
    const m = await generateMutants(SRC, "python");
    const t = m.find((x) => x.operator === "boolean-literal" && x.original === "True");
    expect(t?.replacement).toBe("False");
  });

  it("negates a condition with `not`", async () => {
    const m = await generateMutants(SRC, "python");
    const neg = m.find((x) => x.operator === "negate-condition");
    expect(neg?.replacement.startsWith("not (")).toBe(true);
  });

  it("removes a statement with `pass`", async () => {
    const m = await generateMutants(SRC, "python");
    const rm = m.find((x) => x.operator === "remove-statement");
    expect(rm?.replacement).toBe("pass");
  });

  it("does not mutate docstrings (equivalent-mutant noise)", async () => {
    const src = `def f():
    """This is a docstring."""
    return 1
`;
    const m = await generateMutants(src, "python");
    expect(
      m.some(
        (x) => x.operator === "remove-statement" && x.original.includes("docstring"),
      ),
    ).toBe(false);
  });
});

describe("generateMutants (Go)", () => {
  it("swaps operators and boolean literals in Go", async () => {
    const src = `package main
func Big(a int) bool {
	if a > 10 {
		return true
	}
	return false
}`;
    const m = await generateMutants(src, "go");
    expect(m.some((x) => x.operator === "binary-op" && x.original === ">")).toBe(
      true,
    );
    expect(m.some((x) => x.operator === "boolean-literal")).toBe(true);
    expect(m.some((x) => x.operator === "negate-condition")).toBe(true);
  });
});

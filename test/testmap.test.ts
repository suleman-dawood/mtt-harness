import { describe, it, expect } from "vitest";
import { findTests } from "../src/engine/testmap";

describe("findTests", () => {
  const py = [
    "pipeline/utils/error_classifier.py",
    "tests/unit/utils/test_error_classifier.py",
    "tests/unit/utils/test_error_classifier_anthropic.py",
    "tests/unit/test_billing_depleted_classifier.py",
    "tests/unit/utils/test_settings.py",
  ];

  it("maps a Python module to test_<name> and suffixed variants", () => {
    const t = findTests("pipeline/utils/error_classifier.py", ".", py);
    expect(t).toContain("tests/unit/utils/test_error_classifier.py");
    expect(t).toContain("tests/unit/utils/test_error_classifier_anthropic.py");
    expect(t).not.toContain("tests/unit/utils/test_settings.py");
  });

  it("maps JS/TS by .test/.spec convention", () => {
    const files = [
      "src/pricing.ts",
      "src/pricing.test.ts",
      "src/pricing.spec.ts",
      "src/other.test.ts",
    ];
    const t = findTests("src/pricing.ts", ".", files);
    expect(t).toEqual(
      expect.arrayContaining(["src/pricing.test.ts", "src/pricing.spec.ts"]),
    );
    expect(t).not.toContain("src/other.test.ts");
  });

  it("maps Go by _test.go sibling", () => {
    const files = ["pkg/pricing/pricing.go", "pkg/pricing/pricing_test.go"];
    const t = findTests("pkg/pricing/pricing.go", ".", files);
    expect(t).toEqual(["pkg/pricing/pricing_test.go"]);
  });

  it("ranks closer (mirror-dir) test files first", () => {
    const files = [
      "a/b/util.ts",
      "tests/util.test.ts",
      "a/b/util.test.ts",
    ];
    const t = findTests("a/b/util.ts", ".", files);
    expect(t[0]).toBe("a/b/util.test.ts");
  });

  it("returns empty for unsupported languages", () => {
    expect(findTests("main.rb", ".", ["main_test.rb"])).toEqual([]);
  });
});

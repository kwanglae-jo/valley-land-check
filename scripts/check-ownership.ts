import assert from "node:assert/strict";
import { buildVerdict, classifyOwnership, jimokName } from "../src/lib/ownership.ts";

assert.equal(classifyOwnership("01", "개인"), "private");
assert.equal(classifyOwnership("02", "국유"), "public");
assert.equal(classifyOwnership("03", null), "public");
assert.equal(classifyOwnership(null, "시유"), "public");
assert.equal(classifyOwnership(null, "법인"), "private");
assert.equal(classifyOwnership(null, null), "unknown");

assert.equal(jimokName("17"), "하천");
assert.equal(jimokName("05", "임야"), "임야");

const privateVerdict = buildVerdict("private", "개인", "임야");
assert.match(privateVerdict.label, /사유지/);

const publicVerdict = buildVerdict("public", "국유", "하천");
assert.match(publicVerdict.label, /공공/);

console.log("ownership checks passed");

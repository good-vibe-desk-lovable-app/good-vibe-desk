from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location(
    "emit_knowledge_work_suitability", SCRIPTS / "emit-knowledge-work-suitability.py"
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load the work-suitability emitter module.")
EMITTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EMITTER)

PAYLOAD_MARKER = EMITTER.PAYLOAD_MARKER
SourceContractError = EMITTER.SourceContractError
extract_pal_records = EMITTER.extract_pal_records


class WorkSuitabilityPayloadContractTests(unittest.TestCase):
    def test_extracts_the_expected_embedded_record_array(self) -> None:
        expected = [{"id": f"sample-{index}"} for index in range(600)]
        source = f"prefix{PAYLOAD_MARKER}{json.dumps(expected)}')}}suffix"
        self.assertEqual(extract_pal_records(source), expected)

    def test_missing_module_marker_hard_fails(self) -> None:
        with self.assertRaisesRegex(SourceContractError, "marker"):
            extract_pal_records("no module payload")

    def test_duplicate_module_marker_hard_fails(self) -> None:
        source = f"{PAYLOAD_MARKER}[]')}}{PAYLOAD_MARKER}[]')}}"
        with self.assertRaisesRegex(SourceContractError, "duplicated"):
            extract_pal_records(source)

    def test_unclosed_module_literal_hard_fails(self) -> None:
        with self.assertRaisesRegex(SourceContractError, "did not close"):
            extract_pal_records(f"{PAYLOAD_MARKER}[]")


if __name__ == "__main__":
    unittest.main()

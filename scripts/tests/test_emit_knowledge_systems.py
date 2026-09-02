import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import importlib.util


class SystemsEmitterContractTests(unittest.TestCase):
    def test_emit_knowledge_systems_module_executes(self):
        emitter_path = Path(__file__).resolve().parents[1] / "emit-knowledge-systems.py"
        self.assertTrue(emitter_path.exists(), "emit-knowledge-systems.py must exist")

        spec = importlib.util.spec_from_file_location("emit_knowledge_systems", emitter_path)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertTrue(hasattr(mod, "main"))


if __name__ == "__main__":
    unittest.main()

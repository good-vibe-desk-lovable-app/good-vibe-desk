import unittest
from pathlib import Path
import sys

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from palworld_source_contracts import SourceContractError, require_exact_section


class RequireExactSectionTests(unittest.TestCase):
    def test_returns_only_nodes_before_next_same_level_heading(self):
        soup = BeautifulSoup(
            "<h2>Skills</h2><p>First field</p><h3>Detail</h3><p>Second field</p><h2>Drops</h2><p>Ignore</p>",
            "html.parser",
        )
        section = require_exact_section(soup, page="fixture", title="Skills")
        self.assertEqual("First field Detail Second field", " ".join(node.get_text(" ", strip=True) for node in section.nonempty_nodes()))

    def test_missing_section_fails(self):
        soup = BeautifulSoup("<h2>Drops</h2><p>Item</p>", "html.parser")
        with self.assertRaisesRegex(SourceContractError, "exactly once; found 0"):
            require_exact_section(soup, page="fixture", title="Skills")

    def test_duplicate_section_fails(self):
        soup = BeautifulSoup("<h2>Skills</h2><p>A</p><h2>Skills</h2><p>B</p>", "html.parser")
        with self.assertRaisesRegex(SourceContractError, "exactly once; found 2"):
            require_exact_section(soup, page="fixture", title="Skills")

    def test_empty_section_fails(self):
        soup = BeautifulSoup("<h2>Skills</h2><h2>Drops</h2><p>Item</p>", "html.parser")
        with self.assertRaisesRegex(SourceContractError, "is empty"):
            require_exact_section(soup, page="fixture", title="Skills")


if __name__ == "__main__":
    unittest.main()

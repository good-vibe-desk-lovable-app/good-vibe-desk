import unittest
from pathlib import Path
import sys
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from palworld_source_contracts import SourceContractError, require_exact_section


class StructuresContractTests(unittest.TestCase):
    def test_require_exact_section_structures(self):
        html = "<h5>Structures /498</h5><div><div class='col'><div class='d-flex border rounded'>Card</div></div></div>"
        soup = BeautifulSoup(html, "html.parser")
        section = require_exact_section(soup, page="test", title="Structures /498")
        self.assertEqual("Structures /498 Card", " ".join(node.get_text(" ", strip=True) for node in [section.heading] + list(section.nodes)))

    def test_require_exact_section_missing_fails(self):
        html = "<h5>Other Section</h5><div>Content</div>"
        soup = BeautifulSoup(html, "html.parser")
        with self.assertRaises(SourceContractError):
            require_exact_section(soup, page="test", title="Structures /498")

    def test_require_exact_section_empty_fails(self):
        html = "<h5>Structures /498</h5>"
        soup = BeautifulSoup(html, "html.parser")
        with self.assertRaises(SourceContractError):
            require_exact_section(soup, page="test", title="Structures /498")


if __name__ == "__main__":
    unittest.main()

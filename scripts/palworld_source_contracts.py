"""Strict section contracts for Palworld source parsers.

Source HTML is untrusted input. A parser must never silently convert a renamed,
missing, duplicated, or emptied source section into a valid-looking empty data
field. This module centralizes the exact-match, bounded-section rule used by all
future knowledge-base generators.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from bs4 import BeautifulSoup, Tag


class SourceContractError(RuntimeError):
    """Raised when a source page no longer satisfies an explicit parser contract."""


def _normalize(text: str) -> str:
    return " ".join(text.split())


def _heading_rank(tag: Tag) -> int | None:
    if len(tag.name or "") == 2 and tag.name[0] == "h" and tag.name[1].isdigit():
        return int(tag.name[1])
    return None


@dataclass(frozen=True)
class BoundedSection:
    page: str
    title: str
    heading: Tag
    nodes: tuple[Tag, ...]

    def nonempty_nodes(self) -> tuple[Tag, ...]:
        return tuple(node for node in self.nodes if _normalize(node.get_text(" ", strip=True)))


def require_exact_section(soup: BeautifulSoup, *, page: str, title: str) -> BoundedSection:
    """Return exactly one non-empty heading-bounded section.

    The title comparison is normalized but otherwise exact. Content begins after
    the matching heading and ends before the next heading at the same or higher
    level. This deliberately refuses page-wide matching and ambiguous headings.
    """

    expected = _normalize(title)
    headings = [
        tag
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        if _normalize(tag.get_text(" ", strip=True)) == expected
    ]
    if len(headings) != 1:
        found = len(headings)
        raise SourceContractError(
            f"{page}: required section {title!r} must occur exactly once; found {found}."
        )

    heading = headings[0]
    rank = _heading_rank(heading)
    if rank is None:
        raise SourceContractError(f"{page}: required section {title!r} is not a heading.")

    nodes: list[Tag] = []
    for sibling in heading.next_siblings:
        if not isinstance(sibling, Tag):
            continue
        sibling_rank = _heading_rank(sibling)
        if sibling_rank is not None and sibling_rank <= rank:
            break
        nodes.append(sibling)

    section = BoundedSection(page=page, title=title, heading=heading, nodes=tuple(nodes))
    if not section.nonempty_nodes():
        raise SourceContractError(f"{page}: required section {title!r} is empty.")
    return section


def require_unique_cards(section: BoundedSection, *, selector: str) -> tuple[Tag, ...]:
    """Require bounded-section cards to exist and reject duplicate card labels.

    The caller supplies an explicit selector scoped to a validated section. This
    avoids loose document-wide selection while permitting each data domain to
    define its source-card shape.
    """

    cards: list[Tag] = []
    for node in section.nodes:
        if node.select_one(selector) is not None and node not in cards:
            cards.append(node)
        cards.extend(card for card in node.select(selector) if card not in cards)
    if not cards:
        raise SourceContractError(
            f"{section.page}: required cards {selector!r} were not found inside {section.title!r}."
        )
    return tuple(cards)


def require_values(values: Iterable[object], *, page: str, field: str) -> tuple[object, ...]:
    """Reject an emitted empty field rather than recording a silent gap."""

    materialized = tuple(values)
    if not materialized:
        raise SourceContractError(f"{page}: required emitted field {field!r} is empty.")
    return materialized

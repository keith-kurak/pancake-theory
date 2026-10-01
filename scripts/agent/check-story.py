#!/usr/bin/env python3
"""Check that an issue description has a user story and fit criteria.

Used by .github/workflows/agent-start-from-issue.yml before it opens a PR. No
development starts until the issue says who wants what and why, and how anyone
will know it is done.

The description needs two headings, at any level, each with content under it:

    ## User story
    As a <who>, I want <what>, so that <why>.

    ## Fit criteria
    - <an observable result that shows the story is done>

Reads the description from the ISSUE_BODY environment variable, or from stdin.
Exits 0 when both are present. Otherwise exits 1 and prints a markdown message
for the issue that says what is missing.

Local check:
    ISSUE_BODY="$(gh issue view 51 --json body --jq .body)" \\
      python3 scripts/agent/check-story.py
"""

import os
import re
import sys

HEADING = re.compile(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$")
LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?\S")
STORY_HEADING = re.compile(r"\buser\s+stor(?:y|ies)\b", re.IGNORECASE)
FIT_HEADING = re.compile(r"\bfit\s+criteri(?:a|on)\b", re.IGNORECASE)

# The three parts of a Connextra user story, in order. "so that" is the part
# most often dropped, and it is the part that says why the work matters.
STORY = re.compile(
    r"\bas\s+(?:a|an|the)\b.+?\bi\s+(?:want|need)\b.+?\bso\s+that\b\s*\S",
    re.IGNORECASE | re.DOTALL,
)

# The template's own placeholders, such as "<who>". A story or criterion that
# still contains one was never filled in.
PLACEHOLDER = re.compile(
    r"<(?:who|what|why|an observable result[^>]*|another one)>", re.IGNORECASE
)

TEMPLATE = """\
```markdown
## User story

As a <who>, I want <what>, so that <why>.

## Fit criteria

- <an observable result in the app that shows the story is done>
- <another one>
```"""


def sections(body):
    """Map each heading's text to the lines under it, up to the next heading.

    Headings inside fenced code blocks are ignored, so a pasted example does not
    count as the real thing.
    """
    found = []
    current = None
    in_fence = False
    for line in body.splitlines():
        if line.lstrip().startswith(("```", "~~~")):
            in_fence = not in_fence
            if current is not None:
                current[1].append(line)
            continue
        match = None if in_fence else HEADING.match(line)
        if match:
            current = (match.group(1), [])
            found.append(current)
        elif current is not None:
            current[1].append(line)
    return found


def first(found, pattern):
    for title, lines in found:
        if pattern.search(title):
            return lines
    return None


def check(body):
    """Return a list of problems. An empty list means the issue is ready."""
    found = sections(body or "")
    problems = []

    story = first(found, STORY_HEADING)
    if story is None:
        problems.append("There is no **User story** heading.")
    elif not "\n".join(story).strip():
        problems.append("The **User story** section is empty.")
    elif PLACEHOLDER.search("\n".join(story)):
        problems.append("The **User story** still has template placeholders such as `<who>`.")
    elif not STORY.search("\n".join(story)):
        problems.append(
            "The **User story** section does not read "
            "\"As a …, I want …, so that …\". All three parts are needed."
        )

    fit = first(found, FIT_HEADING)
    if fit is None:
        problems.append("There is no **Fit criteria** heading.")
    elif not any(LIST_ITEM.match(line) and not PLACEHOLDER.search(line) for line in fit):
        problems.append(
            "The **Fit criteria** section has no filled-in list items. "
            "Write each criterion as a `-` or numbered item."
        )

    return problems


def main():
    body = os.environ.get("ISSUE_BODY")
    if body is None:
        body = sys.stdin.read()

    problems = check(body)
    if not problems:
        print("The issue has a user story and fit criteria.")
        return 0

    print("I did not start an agent run, because this issue is not ready for development.\n")
    for problem in problems:
        print(f"- {problem}")
    print(
        "\nFix this in the issue **description** (`/agent` comments do not count), "
        "then apply the `agent-start` label again. For example:\n"
    )
    print(TEMPLATE)
    print(
        "\nEach fit criterion should be something a tester can see in the running app. "
        "The agent validates against them, and the verifier treats each one as a requirement."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())

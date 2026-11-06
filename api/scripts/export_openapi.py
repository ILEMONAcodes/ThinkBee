import argparse
import json
from pathlib import Path

from app.main import app


def write_openapi_schema(output: Path) -> None:
    output.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the Think Bee OpenAPI schema.")
    parser.add_argument("--output", type=Path, default=Path("openapi.json"))
    args = parser.parse_args()
    write_openapi_schema(args.output)


if __name__ == "__main__":
    main()

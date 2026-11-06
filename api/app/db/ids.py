import secrets
import time
from uuid import UUID


def uuid7() -> UUID:
    """RFC 9562 UUIDv7 with random sub-millisecond bits (Python 3.12)."""
    milliseconds = time.time_ns() // 1_000_000
    value = (
        (milliseconds << 80)
        | (7 << 76)
        | (secrets.randbits(12) << 64)
        | (2 << 62)
        | secrets.randbits(62)
    )
    return UUID(int=value)

"""Seed official chat communities without a farmer account."""

import sqlalchemy as sa
from alembic import op

revision = "20261122_0004"
down_revision = "9f01ee170b0e"
branch_labels = None
depends_on = None

communities = (
    (
        "ed7bf8bd-ce41-41e6-9ace-2c80b70b734d",
        "Beekeepers",
        "Hives and honey",
        "/photos/brood-comb.webp",
    ),
    (
        "f34d15c0-39af-4b38-97be-7b60df811816",
        "General Farmers",
        "Crops and fieldwork",
        "/photos/olive-foliage.webp",
    ),
)

spaces = sa.table(
    "chat_spaces",
    sa.column("id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("description", sa.String()),
    sa.column("kind", sa.String()),
    sa.column("visibility", sa.String()),
    sa.column("avatar_key", sa.String()),
    sa.column("is_system", sa.Boolean()),
)
memberships = sa.table("chat_space_members", sa.column("space_id", sa.Uuid()))
messages = sa.table("chat_messages", sa.column("space_id", sa.Uuid()))


def upgrade() -> None:
    op.alter_column("chat_spaces", "creator_id", existing_type=sa.Uuid(), nullable=True)
    for space_id, name, description, cover in communities:
        already_seeded = sa.select(spaces.c.id).where(
            spaces.c.is_system.is_(True), spaces.c.name == op.inline_literal(name)
        )
        values = sa.select(
            op.inline_literal(space_id).cast(sa.Uuid()),
            op.inline_literal(name),
            op.inline_literal(description),
            op.inline_literal("community"),
            op.inline_literal("public"),
            op.inline_literal(cover),
            sa.true(),
        ).where(~already_seeded.exists())
        op.execute(sa.insert(spaces).from_select(list(spaces.c.keys()), values))


def downgrade() -> None:
    # Restore the old constraint only if no creatorless spaces contain data.
    op.execute(
        sa.delete(spaces).where(
            spaces.c.is_system.is_(True),
            spaces.c.id.in_(
                [op.inline_literal(row[0]).cast(sa.Uuid()) for row in communities]
            ),
            ~sa.exists(
                sa.select(memberships.c.space_id).where(memberships.c.space_id == spaces.c.id)
            ),
            ~sa.exists(sa.select(messages.c.space_id).where(messages.c.space_id == spaces.c.id)),
        )
    )
    op.alter_column("chat_spaces", "creator_id", existing_type=sa.Uuid(), nullable=False)

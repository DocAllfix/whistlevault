"""The seeded default questionnaire must be realistic: multi-step, with a
conditional field, a voice field, a file field and scored options."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.db.models import Field, Questionnaire, Step


@pytest.mark.asyncio
async def test_seed_questionnaire_is_rich(seeded, engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        q = await s.scalar(
            select(Questionnaire)
            .where(Questionnaire.name == "default")
            .options(
                selectinload(Questionnaire.steps).selectinload(Step.fields).selectinload(Field.options)
            )
        )
    fields = [f for st in q.steps for f in st.fields]
    types = {f.type for f in fields}
    assert len(q.steps) >= 3, "questionario multi-step"
    assert {"voice", "file", "select", "textarea"} <= types
    assert any(f.trigger_field_key for f in fields), "almeno un campo condizionale"
    assert any(o.score > 0 for f in fields for o in f.options), "scoring di rischio presente"

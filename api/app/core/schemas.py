from typing import Self

from pydantic import BaseModel, ConfigDict, model_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class PatchModel(InputModel):
    @model_validator(mode="after")
    def require_changes(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to change.")
        return self

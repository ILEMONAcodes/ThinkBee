from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.schemas import InputModel, PatchModel

FarmKind = Literal["crops", "bees", "both"]
UnitKind = Literal["hive", "crop_block"]


class FarmCreate(InputModel):
    client_id: UUID
    name: str = Field(min_length=1, max_length=120)
    kind: FarmKind
    state: str | None = Field(default=None, min_length=1, max_length=80)
    lga: str | None = Field(default=None, min_length=1, max_length=100)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def valid_location(self) -> Self:
        if (self.lat is None) != (self.lng is None):
            raise ValueError("Provide both coordinates or neither.")
        if self.lga and not self.state:
            raise ValueError("Choose a state for your LGA.")
        return self


class FarmPatch(PatchModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    kind: FarmKind | None = None
    state: str | None = Field(default=None, min_length=1, max_length=80)
    lga: str | None = Field(default=None, min_length=1, max_length=100)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("name", "kind")
    @classmethod
    def reject_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be empty.")
        return value

    @model_validator(mode="after")
    def paired_coordinates(self) -> Self:
        supplied = self.model_fields_set & {"lat", "lng"}
        if supplied and (supplied != {"lat", "lng"} or (self.lat is None) != (self.lng is None)):
            raise ValueError("Change or clear both coordinates together.")
        return self


class FarmResponse(FarmCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class FarmPage(BaseModel):
    items: list[FarmResponse]
    next_cursor: UUID | None


class UnitDetails(InputModel):
    hive_type: str | None = Field(default=None, min_length=1, max_length=80)
    crop: str | None = Field(default=None, min_length=1, max_length=80)
    area_hectares: float | None = Field(default=None, gt=0, le=1_000_000)


class UnitCreate(InputModel):
    client_id: UUID
    kind: UnitKind
    name: str = Field(min_length=1, max_length=120)
    details: UnitDetails = Field(default_factory=UnitDetails)

    @model_validator(mode="after")
    def appropriate_details(self) -> Self:
        if self.kind == "hive" and (self.details.crop or self.details.area_hectares is not None):
            raise ValueError("Crop details belong to a crop block.")
        if self.kind == "crop_block" and self.details.hive_type:
            raise ValueError("Hive type belongs to a hive.")
        return self


class UnitPatch(PatchModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    details: UnitDetails | None = None

    @field_validator("name", "details")
    @classmethod
    def reject_null(cls, value: str | UnitDetails | None) -> str | UnitDetails:
        if value is None:
            raise ValueError("This field cannot be empty.")
        return value


class UnitResponse(UnitCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    created_at: datetime
    updated_at: datetime


class UnitPage(BaseModel):
    items: list[UnitResponse]
    next_cursor: UUID | None

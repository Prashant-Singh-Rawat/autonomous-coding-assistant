from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    jwt_secret_key: str = Field(min_length=32, validation_alias='JWT_SECRET_KEY')
    vector_store_hmac_key: str = Field(min_length=32, validation_alias='VECTOR_STORE_HMAC_KEY')
    openai_api_key: str = Field(validation_alias='OPENAI_API_KEY')
    database_url: str = Field(
        default="postgresql://user:password@localhost:5432/antigravity",
        validation_alias='DATABASE_URL'
    )

    model_config = SettingsConfigDict(env_file='.env')


settings = Settings()

from decouple import config

BASE_URL       = "https://api.eia.gov/v2/nuclear-outages/generator-nuclear-outages/data/"
PAGE_SIZE      = 5000
RETRY_ATTEMPTS = 5
RETRY_BACKOFF  = 3.0
REQUEST_DELAY  = 0.6

def get_api_key() -> str:
    key = config("API_KEY", default="")
    if not key:
        raise EnvironmentError("API_KEY is not set.")
    return key
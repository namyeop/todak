from dotenv import load_dotenv

from .worker import run


def main() -> None:
    load_dotenv()
    run()

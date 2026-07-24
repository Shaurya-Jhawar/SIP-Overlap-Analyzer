from .common_hdfc import parse_hdfc


def parse(file_path):
    return parse_hdfc(
        file_path,
        "MIDCAP",
    )

#!/usr/bin/env python3
import os.path

import requests
import logging
import typing
import dataclasses
import time
import json
import shutil

@dataclasses.dataclass
class PrankWebResponse:
    status: int
    body: typing.Dict


logger = logging.getLogger("prankweb")
logger.setLevel(logging.DEBUG)

_server_url = None

_server_directory = None


def initialize(server_url: str, server_directory: typing.Optional[str]):
    global _server_url
    _server_url = server_url
    global _server_directory
    _server_directory = server_directory


def retrieve_info(pdb_code: str) -> PrankWebResponse:
    if _server_directory is None:
        return _retrieve_info_url(pdb_code)
    else:
        return _retrieve_info_directory(pdb_code)


def _retrieve_info_url(pdb_code: str) -> PrankWebResponse:
    # Sleep to give prankweb some time.
    time.sleep(2)
    url = f"{_server_url}/api/v2/prediction/{database()}/{pdb_code}"
    try:
        response = requests.get(url)
    except:
        return PrankWebResponse(-1, {})
    return PrankWebResponse(response.status_code, response.json())


def _retrieve_info_directory(pdb_code: str) -> PrankWebResponse:
    path = os.path.join(
        str(_server_directory), pdb_code[1:3].upper(), pdb_code.upper(),
        "info.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as stream:
            content = json.load(stream)
        return PrankWebResponse(200, content)
    else:
        return _retrieve_info_url(pdb_code)


def database() -> str:
    return "v4-conservation-hmm"


def retrieve_archive(pdb_code: str, destination: str):
    if _server_directory is None:
        _retrieve_archive_url(pdb_code, destination)
    else:
        _retrieve_archive_directory(pdb_code, destination)


def _retrieve_archive_url(pdb_code: str, destination: str):
    url = f"{_server_url}/api/v2/prediction/{database()}/{pdb_code}/" \
          "public/prankweb.zip"
    response = requests.get(url)
    if not 199 < response.status_code < 299:
        raise RuntimeError(f"Invalid response code: '{response.status_code}'")
    open(destination, "wb").write(response.content)


def _retrieve_archive_directory(pdb_code: str, destination: str):
    path = os.path.join(
        str(_server_directory), pdb_code[1:3].upper(), pdb_code.upper(),
        "public", "prankweb.zip")
    if not os.path.exists(path):
        raise RuntimeError(f"Missing file: '{path}'")
    shutil.copy(path, destination)


def prediction_url_template() -> str:
    return f"{_server_url}/analyze?database={database()}&code=" + "{}"

#!/usr/bin/env python3
#
# Create a new database including computation for all PDB entries.
#
import argparse
import logging
import os
import typing
import sys
import requests
import re
import json
import datetime
import dataclasses

# Create a symlink to the directory to allow typed imports
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.join(script_dir, ".."))
    sys.path.append(os.path.join(script_dir, "../executor-p2rank"))
    sys.path.append(os.path.join(script_dir, "../conservation/hmm_based"))
    sys.path.append(os.path.join(script_dir, "../conservation/alignment_based"))

    os.symlink(os.path.join(script_dir, "..", "executor-p2rank"), os.path.join(script_dir, "..", "executor_p2rank"), target_is_directory=True)
except FileExistsError:
    print("Symlinks already exist")

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Define a schema for the prediction.
# We use a schema that corresponds to DatabaseV3 from web_server.src.database_v3
from executor_p2rank.run_p2rank_task import execute_directory_task

@dataclasses.dataclass
class Prediction:
    # Directory with given prediction task.
    directory: str
    # User identifier of given task.
    identifier: str
    # Name of a database.
    database: str
    # Name of a conservation to compute.
    conservation: str
    # If true structure is not modified before predictions.
    structure_sealed: bool
    # Configuration file for p2rank.
    p2rank_configuration: str
    # Additional metadata to save to info file.
    metadata: typing.Dict
    # Identification of experimental structure.
    structure_code: typing.Optional[str] = None
    # File with user provided structure.
    structure_file: typing.Optional[str] = None
    # Identification of predicted structure.
    uniprot_code: typing.Optional[str] = None
    # Restriction to given chains.
    chains: typing.Optional[list[str]] = None


def _init_logging():
    logging.basicConfig(
        filename="create_pdb_database.log",
        filemode='a',
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

def _end_logging():
    logging.shutdown()


def _read_arguments() -> typing.Dict[str, str]:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output_directory", required=True,
        help="Output directory for the database.")
    parser.add_argument(
        "--database_name", required=True,
        help="Name of the database (e.g. 'v3')")
    parser.add_argument(
        "--input_pdbs",
        help="Path to the JSON file with PDB IDs that will be merged with all current PDB entries available online.")
    parser.add_argument(
        "--compute_conservation", action="store_true",
        help="If set, conservation will be computed for all PDB entries.")
    

    return vars(parser.parse_args())

def _create_folders(args: typing.Dict[str, str]):
    folder_names = ["", "-alphafold", "-alphafold-conservation-hmm", "-conservation-hmm", "-user-upload"]
    for folder_name in folder_names:
        folder_path = os.path.join(args["output_directory"], args["database_name"] + folder_name)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            logger.info(f"Created folder {folder_path}")
    
    logger.info("All folders created")

def _get_pdb_entries(args: typing.Dict[str, str]):
    # First, get a list of all PDB entries from the following endpoint
    url_entries = "https://data.rcsb.org/rest/v1/holdings/current/entry_ids"

    response = requests.get(url_entries)
    if response.status_code != 200:
        logger.error(f"Failed to get PDB entries: {response.text}")
        sys.exit(1)

    entries = response.json()
    logger.info(f"Number of PDB entries: {len(entries)}")

    # If the input_pdbs is provided, we need to merge the entries with the input_pdbs
    if args["input_pdbs"]:
        print(args["input_pdbs"])
        with open(args["input_pdbs"], "r") as f:
            input_pdbs = json.load(f)

        entries = set(entries)
        entries.update(input_pdbs)
        logger.info(f"Merged PDB entries with the input_pdbs: {len(entries)}")
        logger.info(f"Final number of PDB entries: {len(entries)}")

    entries_list = list(entries)

    logger.info("Returning list of PDB entries")

    return entries_list

def _get_directory(identifier: str, args: typing.Dict[str, str]) -> typing.Optional[str]:
    """Return directory for task with given identifier."""
    if not re.match(r"[_,\w]+", identifier):
        return None
    directory = identifier[1:3]
    db = _get_database_name(args)
    return os.path.join(args["output_directory"], db, directory, identifier)


def _get_database_name(args: typing.Dict[str, str]) -> str:
    return args["database_name"] + "-conservation-hmm" if args["compute_conservation"] else args["database_name"]

def _parser_identifier(identifier: str):
    """2SRC_A,B into 2SRC, [A,B]"""
    if "_" not in identifier:
        return identifier, []
    code, chains = identifier.split("_")
    return code.upper(), [chain.upper() for chain in chains.split(",")]

def _prepare_prediction_directory(prediction: Prediction):
    """Initialize content of a directory for given task."""
    info = _create_info_file(prediction)
    _save_json(_info_file(prediction), info)
    input_directory = os.path.join(prediction.directory, "input")
    os.makedirs(input_directory, exist_ok=True)
    _save_json(
        os.path.join(input_directory, "configuration.json"),
        {
            "p2rank_configuration": prediction.p2rank_configuration,
            "structure_file": prediction.structure_file,
            "structure_code": prediction.structure_code,
            "structure_sealed": prediction.structure_sealed,
            "structure_uniprot": prediction.uniprot_code,
            "conservation": prediction.conservation,
            "chains": prediction.chains,
        })
    return info

def _create_info_file(prediction: Prediction):
    now = datetime.datetime.today().strftime("%Y-%m-%dT%H:%M:%S")
    return {
        "id": prediction.identifier,
        "database": prediction.database,
        "created": now,
        "lastChange": now,
        "status": "queued",
        "metadata": prediction.metadata,
    }

def _info_file(prediction: Prediction) -> str:
    return os.path.join(prediction.directory, "info.json")

def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)


def _run_predictions(args: typing.Dict[str, str], entries_list: typing.List[str]):
    successful_entries = []
    for entry in entries_list:
        logger.info(f"Running prediction for entry {entry}")

        directory = _get_directory(entry, args)
        if directory is None:
            logger.error(f"Invalid entry directory: {entry}")
            continue

        logger.info(f"Preparing prediction for entry {entry}")

        pdb_code, chains = _parser_identifier(entry)
        
        prediction = Prediction(
            directory=directory,
            identifier=entry,
            database=_get_database_name(args),
            structure_sealed=len(chains) == 0,
            conservation="hmm" if args["compute_conservation"] else "none",
            p2rank_configuration="conservation_hmm" if args["compute_conservation"] else "default",
            structure_code=pdb_code,
            chains=chains,
            metadata={},
        )

        try:
            os.makedirs(prediction.directory, exist_ok=True)
        except OSError:
            logger.error(f"Failed to create directory {prediction.directory}")
            continue
        
        _prepare_prediction_directory(prediction)

        logger.info(f"Running prediction for entry {entry}")

        execute_directory_task(prediction.directory, keep_working=False, stdout=False)
        
        successful_entries.append(entry)

    logger.info(f"Number of successful entries: {len(successful_entries)}")
    logger.info(f"Number of unsuccessful entries: {len(entries_list) - len(successful_entries)}")

    logger.info("Successful entries:")
    logger.info(successful_entries)

    logger.info("Unsuccessful entries:")
    logger.info([entry for entry in entries_list if entry not in successful_entries])

    logger.info("All predictions done")


if __name__ == "__main__":

    args = _read_arguments()
    _init_logging()
    logger.info("Creating a new database ...")

    _create_folders(args)
    pdb_entries = _get_pdb_entries(args)

    _run_predictions(args, pdb_entries)

    _end_logging()
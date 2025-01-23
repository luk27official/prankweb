#!/usr/bin/env python3
import os
import zipfile
import json
import csv
import logging
import collections
import gzip
import shutil

from model import *

logger = logging.getLogger("prankweb.output_prankweb")
logger.setLevel(logging.DEBUG)

ResidueScore = collections.namedtuple("ResidueScore", ["code", "value"])


def prepare_output_prankweb(
        p2rank_output: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        configuration: Execution) -> ExecutionResult:
    output_directory = configuration.output_directory
    os.makedirs(output_directory, exist_ok=True)

    _copy_conservation(
        conservation, os.path.join(p2rank_output, "conservation"))
    _prepare_prediction_file(
        os.path.join(output_directory, "prediction.json"),
        structure,
        conservation,
        p2rank_output,
        configuration)

    # Copy the prediction file to the p2rank_output directory temporarily for the zip
    shutil.copy(os.path.join(output_directory, "prediction.json"), p2rank_output)
    _zip_directory(
        p2rank_output, os.path.join(output_directory, "prankweb.zip"))
    # Remove the prediction file from the p2rank_output directory
    os.remove(os.path.join(p2rank_output, "prediction.json"))

    output_structure_name = "structure." + _extension(
        structure.raw_structure_file)
    output_structure_file = os.path.join(
        output_directory, output_structure_name + ".gz")

    with open(structure.raw_structure_file, "rb") as input_stream, \
            gzip.open(output_structure_file, "wb") as output_stream:
        shutil.copyfileobj(input_stream, output_stream)

    return ExecutionResult(output_structure_file=output_structure_name)


def _copy_conservation(conservation: typing.Dict[str, str], destination: str):
    os.makedirs(destination, exist_ok=True)
    for source in conservation.values():
        file_name = os.path.basename(source)
        target = os.path.join(destination, file_name)
        shutil.copy(source, target)


def _zip_directory(directory_to_zip: str, output: str):
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as stream:
        for root, dirs, files in os.walk(directory_to_zip):
            for file in files:
                path_in_zip = os.path.relpath(
                    os.path.join(root, file), os.path.join(directory_to_zip))
                stream.write(os.path.join(root, file), path_in_zip)


def _extension(file_name: str) -> str:
    """For 'name.ext' return 'ext'."""
    return file_name[file_name.rindex(".") + 1:]

def _get_p2rank_version(file_name: str) -> str:
    """Returns the P2rank version from the params file.
    Supposes that one of the parameters starts with 'version:',
    otherwise returns 'unknown'."""

    with open(file_name) as stream:
        for line in stream:
            if line.startswith("version:"):
                return line.split(":")[1].strip()
    return "unknown"

def _prepare_prediction_file(
        output_file: str,
        structure: Structure,
        conservation: typing.Dict[str, str],
        p2rank_output: str,
        configuration: Execution):
    predictions_file = os.path.join(
        p2rank_output,
        f"structure.{configuration.structure_extension}_predictions.csv")

    structure_file = os.path.join(
        configuration.working_directory, "structure-information.json")

    parameters_file = os.path.join(
        p2rank_output, "params.txt")

    configuration.execute_command(
        f"{configuration.java_tools} structure-info"
        f" --input={structure.raw_structure_file}"
        f" --output={structure_file}"
    )

    with open(output_file, "w", encoding="utf-8") as stream:
        json.dump({
            "structure": load_structure_file(structure_file, conservation),
            "pockets": load_pockets(predictions_file),
            "metadata": {
                **structure.metadata,
                "p2rank_version": _get_p2rank_version(parameters_file)
            },
        }, stream, indent=2)


def load_pockets(predictions_file: str):
    with open(predictions_file) as stream:
        reader = csv.reader(stream)
        head = [value.strip() for value in next(reader)]
        predictions = [{
            key: value.strip()
            for key, value in zip(head, row)
        } for row in reader]
    return [
        {
            "name": prediction["name"],
            "rank": prediction["rank"],
            "score": prediction["score"],
            "probability": prediction["probability"],
            "center": [
                prediction["center_x"],
                prediction["center_y"],
                prediction["center_z"]
            ],
            "residues": prediction["residue_ids"].split(" "),
            "surface": prediction["surf_atom_ids"].split(" ")
        }
        for prediction in predictions
    ]


def load_structure_file(
        structure_file: str, conservation: typing.Dict[str, str]):
    with open(structure_file, encoding="utf-8") as stream:
        structure = json.load(stream)

    scores = {
        **structure["scores"]
    }

    if conservation := _prepare_conservation(structure, conservation):
        scores["conservation"] = conservation

    return {
        "indices": structure["indices"],
        "sequence": structure["sequence"],
        "binding": structure["binding"],
        "regions": [
            {
                "name": region["name"],
                "start": region["start"],
                "end": region["end"],
            }
            for region in structure["regions"]
        ],
        "scores": scores
    }


def _prepare_conservation(structure, conservation: typing.Dict[str, str]):
    if len(conservation) == 0:
        return None
    result = []

    parsed_region_length = 0

    for region in structure["regions"]:
        chain = region["name"]
        conservation_file = conservation.get(chain, None)
        if not conservation_file:
            raise RuntimeError(f"Missing conservation for '{chain}'")

        # We want to get rid of all "X" AAs in the structure_seq
        # and we want to get rid of all "X" AAs in the chain_scores
        chain_scores = _read_conservation_file(conservation_file)
        chain_scores_cut = [score for score in chain_scores if score.code != "X"]

        region_start = region["start"]
        region_end = region["end"] + 1
        region_original_size = region_end - region_start

        structure_seq: str = "".join(structure["sequence"])
        region_to_cut = structure_seq[parsed_region_length : parsed_region_length + region_original_size]
        region_cut = region_to_cut.replace("X", "")

        # Check the lengths of the region and the chain_scores
        # It still might happen that the chain_scores are longer than the region because of non-standard AAs marked by a different letter than "X"
        # In this case, we fill the missing values with 0
        if len(region_cut) > len(chain_scores_cut):
            new_chain_scores_cut = []
            j = 0
            for i in range(len(region_cut)):
                if j < len(chain_scores_cut) and region_cut[i] == chain_scores_cut[j].code:
                    new_chain_scores_cut.append(chain_scores_cut[j])
                    j += 1
                else:
                    new_chain_scores_cut.append(ResidueScore(region_cut[i], 0))
                    logger.debug(f"Filled a missing conservation score with 0 at index {i}, chain {chain}, residue {region_cut[i]}")

            chain_scores_cut = new_chain_scores_cut

            logger.debug("Filled missing scores with 0, " \
                f"original length: {len(region_cut)} " \
                f"filled length: {len(chain_scores_cut)}")

        # Otherwise, if the chain_scores are shorter than the region, we raise an error
        elif len(region_cut) < len(chain_scores_cut):
            actual_sequence = ''.join(
                [item.code for item in chain_scores_cut])
            message = f"Sequences for chain {chain} " \
                    f"region ({region_start}, {region_end}) " \
                    f"expected: '{region_cut}' " \
                    f"actual: '{actual_sequence}' " \
                    "must have same size " \
                    f"({region_original_size}, {len(chain_scores_cut)})."
            raise RuntimeError(message)

        for index, score in zip(range(len(region_cut)), chain_scores_cut):
            expected_code = region_cut[index]
            actual_code = score.code
            if not expected_code == actual_code:
                logger.debug(
                    f'{chain} {index} '
                    f'expected: "{expected_code}" '
                    f'actual: "{actual_code}"')
            result.append(score.value)

        parsed_region_length += region_original_size

    return result


def _read_conservation_file(path: str) -> typing.List[ResidueScore]:
    result = []
    with open(path, encoding="utf-8") as stream:
        for index, line in enumerate(stream):
            index, value, code = line.strip().split("\t")
            # We utilize 0 as the minimal value not.
            final_value = max(0, float(value))
            result.append(ResidueScore(code, final_value))
    return result

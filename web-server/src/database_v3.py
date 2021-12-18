import os
import datetime
import json
import typing
import flask
import dataclasses
import time
import uuid
import re
from .database import Database, NestedReadOnlyDatabase
from .submission import submit_directory_for_execution


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


class DatabaseV3(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03")

    def name(self) -> str:
        return "v3"

    def create(self, files):
        # Post is not supported.
        return super().create(files)

    def get_info(self, identifier: str):
        identifier = identifier.upper()
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        pdb_code, chains = _parser_identifier(identifier)
        prediction = Prediction(
            directory=directory,
            identifier=identifier,
            database=self.name(),
            conservation="none",
            structure_sealed=len(chains) == 0,
            p2rank_configuration="default",
            structure_code=pdb_code,
            chains=chains,
            metadata={},
        )
        return _create_new_prediction(prediction)


class DatabaseV3ConservationHmm(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-conservation-hmm")

    def name(self) -> str:
        return "v3-conservation-hmm"

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        pdb_code, chains = _parser_identifier(identifier)
        prediction = Prediction(
            directory=directory,
            identifier=identifier,
            database=self.name(),
            structure_sealed=len(chains) == 0,
            p2rank_configuration="conservation_hmm",
            structure_code=pdb_code,
            chains=chains,
            conservation="hmm",
            metadata={},
        )
        return _create_new_prediction(prediction)


class DatabaseV3UserUpload(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-user-upload")

    def name(self) -> str:
        return "v3-user-upload"

    def create(self, files):
        if "configuration" not in files or "structure" not in files:
            return "", 400
        identifier = _create_identifier()
        user_configuration = json.load(files["configuration"])
        structure_name = self._secure_filename(files["structure"].filename)
        prediction = _configuration_to_prediction(
            self.root, identifier, self.name(),
            user_configuration, structure_name)
        if not _is_prediction_valid(prediction):
            return "", 400
        # Create prediction directories and files.
        os.makedirs(prediction.directory)
        info = _prepare_prediction_directory(prediction)
        input_directory = os.path.join(prediction.directory, "input")
        structure_path = os.path.join(input_directory, structure_name)
        files["structure"].save(structure_path)
        submit_directory_for_execution(prediction.directory)
        return flask.make_response(flask.jsonify(info), 201)

    def _get_directory(self, identifier: str) -> typing.Optional[str]:
        """Return directory for task with given identifier."""
        if not re.match("[\-_,\w]+", identifier):
            return None
        return os.path.join(self.root, identifier)


class DatabaseV3AlphaFold(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-alphafold")

    def name(self) -> str:
        return "v3-alphafold"

    def create(self, files):
        # Post is not supported.
        return super().create(files)

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        prediction = Prediction(
            directory=directory,
            identifier=identifier,
            database=self.name(),
            structure_sealed=True,
            p2rank_configuration="alphafold",
            uniprot_code=identifier,
            conservation="none",
            metadata={
                "predictedStructure": True
            },
        )
        return _create_new_prediction(prediction)


class DatabaseV3AlphaFoldConservationHmm(NestedReadOnlyDatabase):

    def __init__(self):
        super().__init__()
        self.root = os.path.join(
            self._get_database_directory(),
            "v03-alphafold-conservation-hmm")

    def name(self) -> str:
        return "v3-alphafold-conservation-hmm"

    def create(self, files):
        # Post is not supported.
        return super().create(files)

    def get_info(self, identifier: str):
        directory = self._get_directory(identifier)
        if directory is None:
            return "", 404
        if os.path.exists(directory):
            return self._response_file(directory, "info.json")
        prediction = Prediction(
            directory=directory,
            identifier=identifier,
            database=self.name(),
            structure_sealed=True,
            p2rank_configuration="alphafold_conservation_hmm",
            uniprot_code=identifier,
            conservation="hmm",
            metadata={
                "predictedStructure": True
            },
        )
        return _create_new_prediction(prediction)


def _parser_identifier(identifier: str):
    """2SRC_A,B into 2SRC, [A,B]"""
    if "_" not in identifier:
        return identifier, []
    code, chains = identifier.split("_")
    return code.upper(), [chain.upper() for chain in chains.split(",")]


def _create_new_prediction(prediction: Prediction, force=False):
    try:
        os.makedirs(prediction.directory, exist_ok=True)
    except OSError:
        if not force:
            return _prediction_can_not_be_created(prediction)
    info = _prepare_prediction_directory(prediction)
    submit_directory_for_execution(prediction.directory)
    return flask.make_response(flask.jsonify(info), 201)


def _prediction_can_not_be_created(prediction: Prediction):
    # Not the best, but it is possible that someone else created
    # the task before us, so we wait some time, so they can finish the
    # initialization.
    time.sleep(1)
    if os.path.isdir(prediction.directory) and \
            os.path.isfile(_info_file(prediction)):
        # Somebody else created the task.
        return flask.send_from_directory(
            prediction.directory, "info.json",
            mimetype="application/json")
    else:
        return "", 500


def _info_file(prediction: Prediction) -> str:
    return os.path.join(prediction.directory, "info.json")


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


def _save_json(path: str, content):
    with open(path, "w", encoding="utf-8") as stream:
        json.dump(content, stream, ensure_ascii=True)


def _create_identifier():
    today = datetime.datetime.today().strftime('%Y-%m-%d-%H-%M-%S')
    return today + "-" + str(uuid.uuid4()).upper()


def _configuration_to_prediction(
        root_directory: str, identifier: str, database: str,
        user_configuration, structure_file: str):
    chains = list({
        chain.upper()
        for chain in user_configuration.get("chains", [])
    })
    conservation = user_configuration.get("compute-conservation", False)
    return Prediction(
        directory=os.path.join(root_directory, identifier),
        identifier=identifier,
        database=database,
        chains=chains,
        structure_sealed=user_configuration.get("structure-sealed", False),
        p2rank_configuration="conservation_hmm" if conservation else "default",
        structure_file=structure_file,
        conservation="hmm" if conservation else "none",
        metadata={},
    )


def _is_prediction_valid(prediction: Prediction) -> bool:
    if len(prediction.chains) and not prediction.structure_sealed:
        return False
    return True


def register_database_v3() -> list[Database]:
    v3 = DatabaseV3()
    os.makedirs(v3.root, exist_ok=True)
    v3_conservation_hmm = DatabaseV3ConservationHmm()
    os.makedirs(v3_conservation_hmm.root, exist_ok=True)
    v3_user_upload = DatabaseV3UserUpload()
    os.makedirs(v3_user_upload.root, exist_ok=True)
    v3_alpha_fold = DatabaseV3AlphaFold()
    os.makedirs(v3_alpha_fold.root, exist_ok=True)
    v3_alpha_fold_conservation_hmm = DatabaseV3AlphaFoldConservationHmm()
    os.makedirs(v3_alpha_fold_conservation_hmm.root, exist_ok=True)
    return [v3, v3_conservation_hmm, v3_user_upload,
            v3_alpha_fold, v3_alpha_fold_conservation_hmm]

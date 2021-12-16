import flask
from flask import Blueprint
from .database_v1 import register_database_v1
from .database_v2 import register_database_v2
from .database_v3 import register_database_v3

api_v2 = Blueprint("api_v2", __name__)

databases = {
    database.name(): database
    for database in [
        *register_database_v1(),
        *register_database_v2(),
        *register_database_v3()
    ]
}


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>",
    methods=["GET"]
)
def route_get_info(database_name: str, prediction_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_info(prediction_name)


@api_v2.route(
    "/predictions/<database_name>",
    methods=["POST"]
)
def route_post(database_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "Database", 404
    return database.create(flask.request.files)


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>/log",
    methods=["GET"]
)
def route_get_log(database_name: str, prediction_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_log(prediction_name)


@api_v2.route(
    "/prediction/<database_name>/<prediction_name>/public/<file_name>",
    methods=["GET"]
)
def route_get_file(database_name: str, prediction_name: str, file_name: str):
    database = databases.get(database_name, None)
    if database is None:
        return "", 404
    return database.get_file(prediction_name, file_name)

# More at : https://code-maven.com/hello-world-with-flask-and-python
# Project template https://github.com/rochacbruno/flask-project-template/tree/main/project_name
# Celery https://docs.celeryproject.org/en/stable/getting-started/first-steps-with-celery.html
# Flask and JSON https://stackoverflow.com/questions/13081532/return-json-response-from-flask-view
# Flask and upload file https://pythonbasics.org/flask-upload-file/
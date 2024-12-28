#!/usr/bin/env python3
import os
import celery.signals
import run_task

prankweb = celery.Celery("prankweb")

if "CELERY_BROKER_URL" in os.environ:
    prankweb.conf.update(
        {
            "broker_url": os.environ["CELERY_BROKER_URL"],
            "broker_connection_retry_on_startup": True,
        }
    )
elif "CELERY_BROKER_PATH" in os.environ:
    folder = os.environ["CELERY_BROKER_PATH"]
    prankweb.conf.update(
        {
            "broker_url": "filesystem://",
            "broker_transport_options": {
                "data_folder_in": folder + "/queue/",
                "data_folder_out": folder + "/queue/",
                "data_folder_processed": folder + "/processed/",
            },
            "broker_connection_retry_on_startup": True,
        }
    )


# when uncommented, this will disable logging for Celery (including prints to stdout)
@celery.signals.setup_logging.connect
def setup_celery_logging(**kwargs):
    # We do nothing here to disable logging.
    ...


# https://github.com/celery/celery/issues/2509
prankweb.log.setup()


@prankweb.task(name="tunnels")
def celery_run_tunnels(directory: str, taskId):
    if os.path.isdir(directory):
        run_task.execute_directory_task(directory, taskId)
    else:
        print(f"Given directory does not exist {directory}")

import os
import celery

prankweb = celery.Celery("prankweb")

prankweb.conf.update({
    "task_routes": {
        # the key is the name of the task, the value is the name of the queue
        'prediction': 'p2rank',
        'docking': 'docking',
        'tunnels': 'tunnels',
    }
})

if "CELERY_BROKER_URL" in os.environ:
    prankweb.conf.update({
        "broker_url": os.environ["CELERY_BROKER_URL"]
    })
elif "CELERY_BROKER_PATH" in os.environ:
    folder = os.environ["CELERY_BROKER_PATH"]
    prankweb.conf.update({
        "broker_url": "filesystem://",
        "broker_transport_options": {
            "data_folder_in": folder + "/queue/",
            "data_folder_out": folder + "/queue/",
            "data_folder_processed": folder + "/processed/"
        },
    })


def submit_directory_for_execution(directory):
    prankweb.send_task("prediction", args=[directory])

def submit_directory_for_docking(directory, taskId):
    prankweb.send_task("docking", args=[directory, taskId])

def submit_directory_for_tunnels(directory, taskId):
    prankweb.send_task("tunnels", args=[directory, taskId])

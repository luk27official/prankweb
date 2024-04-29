import { PredictionInfo } from "../prankweb-api";
import { PocketData, Point3D, ServerTaskInfo, ServerTaskLocalStorageData } from "../custom-types";

import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { md5 } from 'hash-wasm';

/**
 * Computes distance of 2 points in 3D space.
 * @param point1 First point
 * @param point2 Second point
 * @returns Distance between the points
*/
function twoPointsDistance(point1: Point3D, point2: Point3D) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2) + Math.pow(point1.z - point2.z, 2));
}

/**
 * Computes a bounding box for the given pocket.
 * @param plugin Mol* plugin
 * @param pocket Pocket data
 * @returns Bounding box
*/
function computeBoundingBox(plugin: PluginUIContext, pocket: PocketData) {
    const coords: Point3D[] = getPocketAtomCoordinates(plugin, pocket.surface);

    const center: Point3D = {
        x: Number(pocket.center[0]),
        y: Number(pocket.center[1]),
        z: Number(pocket.center[2])
    };
    //compute max distance from the center
    let maxDistance = 0;
    coords.forEach(coord => {
        const distance = twoPointsDistance(coord, center);
        if (distance > maxDistance) {
            maxDistance = distance;
        }
    });

    let diagonal = maxDistance * 2;
    let sideLength = diagonal / Math.sqrt(3);

    return {
        center: {
            x: center.x,
            y: center.y,
            z: center.z
        },
        size: {
            x: Math.ceil(sideLength) + 5, // the bounding box is a bit larger than the pocket for more accurate results
            y: Math.ceil(sideLength) + 5,
            z: Math.ceil(sideLength) + 5
        }
    };
}

/**
 * Sends requests to the backend to compute the docking task and periodically checks if the task is finished.
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @param smiles SMILES ligand identifier
 * @param plugin Mol* plugin
 * @param exhaustiveness exhaustiveness value (for Autodock Vina)
 * @returns Completed task data
 */
export async function computeDockingTaskOnBackend(prediction: PredictionInfo, pocket: PocketData, smiles: string, plugin: PluginUIContext, exhaustiveness: string): Promise<any> {
    if (smiles === "") {
        return;
    }

    const box = computeBoundingBox(plugin, pocket);

    const hash = await dockingHash(pocket.rank, smiles, exhaustiveness);

    await fetch(`./api/v2/docking/${prediction.database}/${prediction.id}/post`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
            "pocket": pocket.rank,
            "smiles": smiles,
            "exhaustiveness": exhaustiveness,
            "bounding_box": box
        }),
    }).then((res) => {
        console.log(res);
    }
    ).catch(err => {
        console.log(err);
    });
    return;
}

/**
 * Returns a hash that identifies this task.
 * @param pocket Pocket identifier
 * @param smiles SMILES identifier
 * @param exhaustiveness exhaustiveness value (for Autodock Vina)
 * @returns Computed hash
*/
export async function dockingHash(pocket: string, smiles: string, exhaustiveness: string) {
    return await md5(`${pocket}_${smiles}_${exhaustiveness}`);
}

/**
 * Downloads the result of the task.
 * @param smiles SMILES identifier
 * @param fileURL URL to download the result from
 * @param pocket Pocket identifier
 * @param exhaustiveness exhaustiveness value (for Autodock Vina)
 * @returns void
*/
export async function downloadDockingResult(smiles: string, fileURL: string, pocket: string, exhaustiveness: string) {
    // https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js
    fetch(fileURL)
        .then((response) => response.blob())
        .then((blob) => {
            // Create blob link to download
            const url = window.URL.createObjectURL(
                new Blob([blob]),
            );
            const link = document.createElement('a');
            const today = new Date();
            link.href = url;
            link.setAttribute(
                'download',
                `result-${today.toISOString()}.zip`,
            );

            document.body.appendChild(link);
            link.click();
            link.parentNode!.removeChild(link);
        });
}

/**
 * A method that is meant to be called periodically to check if any of the tasks has finished.
 * @param predictionInfo Prediction info
 * @returns null if no task has finished, otherwise the finished task
 */
export async function pollForDockingTask(predictionInfo: PredictionInfo) {
    let taskStatusJSON = await fetch(`./api/v2/docking/${predictionInfo.database}/${predictionInfo.id}/tasks`, { cache: "no-store" })
        .then(res => res.json())
        .catch(err => {
            return;
        }); //we could handle the error, but we do not care if the poll fails sometimes

    if (taskStatusJSON) {
        //look into the local storage and check if there are any updates
        let savedTasks = localStorage.getItem(`${predictionInfo.id}_serverTasks`);
        if (!savedTasks) savedTasks = "[]";
        const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
        if (tasks.length === 0) return;
        if (tasks.every((task: ServerTaskLocalStorageData) => task.status === "successful" || task.status === "failed")) return;
        tasks.forEach(async (task: ServerTaskLocalStorageData, i: number) => {
            if (task.status === "successful" || task.status === "failed") return;

            const expectedHash = await dockingHash(task.pocket.toString(), task.params[0], task.params[1]);

            const individualTask: ServerTaskInfo = taskStatusJSON["tasks"].find((t: ServerTaskInfo) => t.initialData.hash === expectedHash);
            if (individualTask) {
                if (individualTask.status !== task.status) {
                    //update the status
                    tasks[i].status = individualTask.status;

                    //download the computed data
                    if (individualTask.status === "successful") {
                        const hash = await dockingHash(task.pocket.toString(), individualTask.initialData.smiles, individualTask.initialData.exhaustiveness);
                        const data = await fetch(`./api/v2/docking/${predictionInfo.database}/${predictionInfo.id}/${hash}/public/result.json`)
                            .then(res => res.json()).catch(err => console.log(err));
                        tasks[i].responseData = data;
                    }

                    //save the updated tasks
                    localStorage.setItem(`${predictionInfo.id}_serverTasks`, JSON.stringify(tasks));
                }
            }
        });
    }
    return localStorage.getItem(`${predictionInfo.id}_serverTasks`);
}

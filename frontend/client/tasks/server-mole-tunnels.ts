import { PredictionInfo, getApiEndpoint } from "../prankweb-api";
import { getLocalStorageKey, PocketData, ServerTaskInfo, ServerTaskLocalStorageData } from "../custom-types";

import { md5 } from 'hash-wasm';

/**
 * Sends requests to the backend to compute the tunnels task.
 * @param prediction Prediction info
 * @param pocket Pocket data
 * @returns Completed task data
 */
export async function computeTunnelsTaskOnBackend(prediction: PredictionInfo, pocket: PocketData): Promise<any> {
    const hash = await tunnelsHash(pocket.rank);

    const apiEndpoint = getApiEndpoint(prediction.database, prediction.id, "tunnels");

    await fetch(`${apiEndpoint}/post`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash,
            "pocket": pocket
        }),
    }).then((res) => {
        return res.json();
    }).catch(err => {
        console.error(err);
        return null;
    });
}

/**
 * Returns a hash that identifies this task.
 * @param pocket Pocket identifier
 * @returns Computed hash
*/
export async function tunnelsHash(pocket: string) {
    return await md5(`${pocket}`);
}

/**
 * Downloads the result of the task.
 * @param fileURL URL to download the result from
 * @returns void
*/
export async function downloadTunnelsResult(fileURL: string) {
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
export async function pollForTunnelsTask(predictionInfo: PredictionInfo) {
    const apiEndpoint = getApiEndpoint(predictionInfo.database, predictionInfo.id, "tunnels");
    let taskStatusJSON = await fetch(`${apiEndpoint}/tasks`, { cache: "no-store" })
        .then(res => res.json())
        .catch(err => {
            return;
        }); //we could handle the error, but we do not care if the poll fails sometimes

    const localStorageKey = getLocalStorageKey(predictionInfo, "serverTasks");

    if (taskStatusJSON) {
        //look into the local storage and check if there are any updates
        let savedTasks = localStorage.getItem(localStorageKey);
        if (!savedTasks) savedTasks = "[]";
        const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
        if (tasks.length === 0) return;
        if (tasks.every((task: ServerTaskLocalStorageData) => task.status === "successful" || task.status === "failed")) return;
        // get the count of "queued" tasks
        const queuedTasks = taskStatusJSON["tasks"].filter((t: ServerTaskInfo) => t.status === "queued" || t.status === "running").length;
        tasks.forEach(async (task: ServerTaskLocalStorageData, i: number) => {
            if (task.status === "successful" || task.status === "failed") return;

            const expectedHash = await tunnelsHash(task.pocket.toString());

            const individualTask: ServerTaskInfo = taskStatusJSON["tasks"].find((t: ServerTaskInfo) => t.initialData.hash === expectedHash);
            if (individualTask) {
                if (individualTask.status !== task.status) {
                    //update the status
                    tasks[i].status = `${individualTask.status}`;

                    //download the computed data
                    if (individualTask.status === "successful") {
                        const hash = await tunnelsHash(task.pocket.toString());
                        const data = await fetch(`${apiEndpoint}/${hash}/public/result.json`)
                            .then(res => res.json()).catch(err => console.log(err));
                        tasks[i].responseData = data;
                    } else if (individualTask.status === "queued") {
                        tasks[i].status += ` (${queuedTasks} in queue)`;
                    }

                    //save the updated tasks
                    localStorage.setItem(localStorageKey, JSON.stringify(tasks));
                }
            }
        });
    }
    return localStorage.getItem(localStorageKey);
}
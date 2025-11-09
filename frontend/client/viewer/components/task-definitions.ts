import { ClientTaskLocalStorageData, ClientTaskType, PocketData, ServerTaskLocalStorageData, ServerTaskType, getLocalStorageKey } from "../../custom-types";
import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend, generateBashScriptForDockingTask } from "../../tasks/server-docking-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { computePocketVolume } from "../../tasks/client-atoms-volume";
import { computeTunnelsTaskOnBackend } from "../../tasks/server-mole-tunnels";

export enum TaskType {
    Client,
    Server
}

export type TaskTypeMenuItem = {
    id: number,
    specificType: ServerTaskType | ClientTaskType;
    type: TaskType,
    name: string,
    compute: (params: string[], customName: string, pocketIndex: number) => void;
    parameterDescriptions: string[];
    parameterDefaults?: string[];
};

export interface TaskDefinitionsParams {
    pockets: PocketData[];
    predictionInfo: PredictionInfo;
    plugin: PluginUIContext;
    setInvalidInputMessage: (message: string) => void;
    setDockingScript: (script: string) => void;
}

export function createTaskDefinitions(params: TaskDefinitionsParams): TaskTypeMenuItem[] {
    const { pockets, predictionInfo, plugin, setInvalidInputMessage, setDockingScript } = params;

    return [
        {
            id: 1,
            specificType: ServerTaskType.Docking,
            type: TaskType.Server,
            name: "Docking",
            compute: async (taskParams, customName, pocketIndex) => {
                const smiles = taskParams[0].replaceAll(" ", "");

                const handleInvalidDockingInput = (baseMessage: string) => {
                    if (baseMessage === "") {
                        setInvalidInputMessage("");
                        return;
                    }

                    setInvalidInputMessage(`${baseMessage} Running docking with these parameters might take too long. If you want to run the docking locally, please do so via the script provided through clicking the button below.`);
                    setDockingScript(generateBashScriptForDockingTask(smiles, pockets[pocketIndex], plugin, predictionInfo));
                };

                // check if exhaustiveness is a number
                const exhaustiveness = taskParams[1].replaceAll(",", ".").replaceAll(" ", "");
                if (isNaN(parseInt(exhaustiveness))) {
                    handleInvalidDockingInput("Exhaustiveness must be an integer.");
                    return;
                }

                // 1-64 is the allowed range
                if (Number(exhaustiveness) < 1 || Number(exhaustiveness) > 64) {
                    handleInvalidDockingInput("Exhaustiveness must be in the range 1-64.");
                    return;
                }

                // check if SMILES is < 300 characters, otherwise
                if (smiles.length > 300) {
                    handleInvalidDockingInput("SMILES must be shorter than 300 characters.");
                    return;
                }

                handleInvalidDockingInput("");

                const localStorageKey = getLocalStorageKey(predictionInfo, "serverTasks");

                let savedTasks = localStorage.getItem(localStorageKey);
                if (!savedTasks) savedTasks = "[]";
                const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
                tasks.push({
                    "name": customName,
                    "params": taskParams,
                    "pocket": pocketIndex + 1,
                    "created": new Date().toISOString(),
                    "status": "queued",
                    "type": ServerTaskType.Docking,
                    "responseData": null,
                    "discriminator": "server",
                });
                localStorage.setItem(localStorageKey, JSON.stringify(tasks));
                const taskPostRequest = await computeDockingTaskOnBackend(predictionInfo, pockets[pocketIndex], smiles, plugin, exhaustiveness);
                if (taskPostRequest === null) {
                    tasks[tasks.length - 1].status = "failed";
                }
            },
            parameterDescriptions: [
                "Enter the molecule in SMILES format (e.g. c1ccccc1), max 300 characters",
                "Enter the exhaustiveness for Autodock Vina (recommended: 32, allowed range: 1-64)"
            ],
            parameterDefaults: ["", "32"]
        },
        {
            id: 2,
            specificType: ServerTaskType.Tunnels,
            type: TaskType.Server,
            name: "MOLE 2.5 tunnels",
            compute: async (taskParams, customName, pocketIndex) => {
                const localStorageKey = getLocalStorageKey(predictionInfo, "serverTasks");
                let savedTasks = localStorage.getItem(localStorageKey);
                if (!savedTasks) savedTasks = "[]";
                const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
                tasks.push({
                    "name": customName,
                    "params": taskParams,
                    "pocket": pocketIndex + 1,
                    "created": new Date().toISOString(),
                    "status": "queued",
                    "type": ServerTaskType.Tunnels,
                    "responseData": null,
                    "discriminator": "server",
                });
                localStorage.setItem(localStorageKey, JSON.stringify(tasks));
                const taskPostRequest = await computeTunnelsTaskOnBackend(predictionInfo, pockets[pocketIndex]);
                if (taskPostRequest === null) {
                    tasks[tasks.length - 1].status = "failed";
                }
            },
            parameterDescriptions: [],
            parameterDefaults: []
        },
        {
            id: 3,
            specificType: ClientTaskType.Volume,
            type: TaskType.Client,
            name: "Volume",
            compute: (taskParams, customName, pocketIndex) => {
                const localStorageKey = getLocalStorageKey(predictionInfo, "clientTasks");

                let savedTasks = localStorage.getItem(localStorageKey);
                if (savedTasks) {
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);
                    const task = tasks.find(task => task.pocket === (pocketIndex + 1) && task.type === ClientTaskType.Volume);
                    if (task) {
                        // do not compute the same task twice
                        return;
                    }
                }

                const promise = computePocketVolume(plugin, pockets[pocketIndex]);
                promise.then((volume: number) => {
                    savedTasks = localStorage.getItem(localStorageKey);
                    if (!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.Volume,
                        "created": new Date().toISOString(),
                        "data": volume,
                        "discriminator": "client",
                    });

                    localStorage.setItem(localStorageKey, JSON.stringify(tasks));
                });
            },
            parameterDescriptions: []
        },
    ];
}

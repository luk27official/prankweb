import React from "react";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { ClientTaskLocalStorageData, ClientTaskType, PocketData, ServerTaskLocalStorageData, ServerTaskType } from "../../custom-types";
import { Button, Paper, Typography } from "@mui/material";

import "./tasks-tab.css";
import { PredictionInfo } from "../../prankweb-api";
import { computeDockingTaskOnBackend } from "../../tasks/server-docking-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { computePocketVolume } from "../../tasks/client-atoms-volume";
import { TasksTable } from "./tasks-table";
import NoPockets from "./no-pockets";

enum TaskType {
    Client,
    Server
}

type TaskTypeMenuItem = {
    id: number,
    specificType: ServerTaskType | ClientTaskType;
    type: TaskType,
    name: string,
    compute: (params: string[], customName: string, pocketIndex: number) => void;
    parameterDescriptions: string[];
    parameterDefaults?: string[];
};

export default function TasksTab(props: { pockets: PocketData[], predictionInfo: PredictionInfo, plugin: PluginUIContext, initialPocket: number; }) {
    const tasks: TaskTypeMenuItem[] = [
        {
            id: 1,
            specificType: ClientTaskType.Volume,
            type: TaskType.Client,
            name: "Volume",
            compute: (params, customName, pocketIndex) => {
                let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                if (savedTasks) {
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);
                    const task = tasks.find(task => task.pocket === (pocketIndex + 1) && task.type === ClientTaskType.Volume);
                    if (task) {
                        // do not compute the same task twice
                        return;
                    }
                }

                const promise = computePocketVolume(props.plugin, props.pockets[pocketIndex]);
                promise.then((volume: number) => {
                    savedTasks = localStorage.getItem(`${props.predictionInfo.id}_clientTasks`);
                    if (!savedTasks) savedTasks = "[]";
                    const tasks: ClientTaskLocalStorageData[] = JSON.parse(savedTasks);

                    tasks.push({
                        "pocket": (pocketIndex + 1),
                        "type": ClientTaskType.Volume,
                        "created": new Date().toISOString(),
                        "data": volume,
                        "discriminator": "client",
                    });

                    localStorage.setItem(`${props.predictionInfo.id}_clientTasks`, JSON.stringify(tasks));
                });
            },
            parameterDescriptions: []
        },
        {
            id: 2,
            specificType: ServerTaskType.Docking,
            type: TaskType.Server,
            name: "Docking",
            compute: (params, customName, pocketIndex) => {
                // check if exhaustiveness is a number
                const exhaustiveness = params[1].replaceAll(",", ".").replaceAll(" ", "");
                if (isNaN(parseFloat(exhaustiveness))) {
                    setInvalidInput(true);
                    return;
                }

                // 1-64 is the allowed range
                if (Number(exhaustiveness) < 1 || Number(exhaustiveness) > 64) {
                    setInvalidInput(true);
                    return;
                }

                setInvalidInput(false);
                const smiles = params[0].replaceAll(" ", "");

                let savedTasks = localStorage.getItem(`${props.predictionInfo.id}_serverTasks`);
                if (!savedTasks) savedTasks = "[]";
                const tasks: ServerTaskLocalStorageData[] = JSON.parse(savedTasks);
                tasks.push({
                    "name": customName,
                    "params": params,
                    "pocket": pocketIndex + 1,
                    "created": new Date().toISOString(),
                    "status": "queued",
                    "type": ServerTaskType.Docking,
                    "responseData": null,
                    "discriminator": "server",
                });
                localStorage.setItem(`${props.predictionInfo.id}_serverTasks`, JSON.stringify(tasks));
                computeDockingTaskOnBackend(props.predictionInfo, props.pockets[pocketIndex], smiles, props.plugin, exhaustiveness);
            },
            parameterDescriptions: [
                "Enter the molecule in SMILES format (e.g. c1ccccc1)",
                "Enter the exhaustiveness for Autodock Vina (recommended: 32, allowed range: 1-64)"
            ],
            parameterDefaults: ["", "32"]
        }
    ];

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketRank, setPocketRank] = React.useState<number>(props.initialPocket);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string[]>([]);
    const [forceUpdate, setForceUpdate] = React.useState<number>(0);
    const [invalidInput, setInvalidInput] = React.useState<boolean>(false);

    const handleTaskTypeChange = (event: SelectChangeEvent) => {
        const newTask = tasks.find(task => task.id == Number(event.target.value))!;
        setTask(newTask);
        if (newTask.parameterDefaults) setParameters(newTask.parameterDefaults);
        else setParameters(Array(newTask.parameterDescriptions.length).fill(""));
    };

    const handlePocketRankChange = (event: SelectChangeEvent) => {
        setPocketRank(Number(event.target.value));
    };

    const handleSubmitButton = async () => {
        task.compute(parameters, name, pocketRank - 1);
        setTimeout(forceComponentUpdate, 250);
    };

    const forceComponentUpdate = () => {
        setForceUpdate(prevState => prevState + 1);
    };

    if (props.pockets.length === 0) return <NoPockets />;

    return (
        <div>
            <Paper>
                <Typography variant="h6" style={{ padding: 10 }}>Create task</Typography>
                <table className="create-task-table">
                    <tbody>
                        <tr>
                            <td>
                                <FormControl sx={{ width: "100%" }}>
                                    <InputLabel>Task type</InputLabel>
                                    <Select
                                        labelId="task"
                                        id="select-task-create-type"
                                        value={task?.id.toString() || ""}
                                        label="Task type"
                                        onChange={handleTaskTypeChange}
                                    >
                                        {tasks.map((task: TaskTypeMenuItem) => <MenuItem value={task.id} key={task.id}>{task.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </td>
                            <td>
                                <FormControl sx={{ width: "100%" }}>
                                    <InputLabel>Pocket rank</InputLabel>
                                    <Select
                                        labelId="pocket-rank"
                                        id="select-pocket-rank"
                                        value={pocketRank.toString()}
                                        label="Pocket rank"
                                        onChange={handlePocketRankChange}
                                    >
                                        {props.pockets.map((pocket: PocketData) => <MenuItem value={pocket.rank} key={pocket.rank}>{pocket.rank}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </td>
                        </tr>
                        {// allow to name only server tasks
                            task?.type === TaskType.Server &&
                            <tr>
                                <td colSpan={2}>
                                    <FormControl sx={{ width: "100%" }}>
                                        <TextField
                                            label="Enter task name"
                                            variant="standard"
                                            value={name}
                                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                setName(event.target.value);
                                            }}
                                        />
                                    </FormControl>
                                </td>
                            </tr>
                        }

                        {// render parameter input fields
                            task?.parameterDescriptions.map((description: string, i: number) =>
                                <tr key={i}>
                                    <td colSpan={2}>
                                        <FormControl sx={{ width: "100%" }}>
                                            <TextField
                                                label={description}
                                                multiline
                                                maxRows={8}
                                                variant="standard"
                                                value={parameters[i]}
                                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                    const newParameters = [...parameters];
                                                    newParameters[i] = event.target.value;
                                                    setParameters(newParameters);
                                                }}
                                            />
                                        </FormControl>
                                    </td>
                                </tr>
                            )
                        }
                        {
                            invalidInput &&
                            <tr>
                                <td colSpan={2}>
                                    <Typography variant="body1" style={{ color: "red" }}>Error: The task could not be created. Check the formatting.</Typography>
                                </td>
                            </tr>
                        }
                        <tr>
                            <td>
                                <Button variant="contained" onClick={handleSubmitButton}>Create task</Button>
                            </td>
                            <td>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </Paper>
            &nbsp;
            <Paper>
                <Typography variant="h6" style={{ padding: 10 }}>Finished tasks</Typography>
                <TasksTable pocket={null} predictionInfo={props.predictionInfo} />
            </Paper>
        </div>
    );
}
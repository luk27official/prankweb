import React from "react";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { PocketData } from "../../custom-types";
import { Button, Paper, Typography } from "@mui/material";

import "./tasks-tab.css";
import { PredictionInfo } from "../../prankweb-api";
import { downloadDockingBashScript } from "../../tasks/server-docking-task";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { TasksTable } from "./tasks-table";
import NoPockets from "./no-pockets";
import { TaskType, TaskTypeMenuItem, createTaskDefinitions } from "./task-definitions";

export default function TasksTab(props: { pockets: PocketData[], predictionInfo: PredictionInfo, plugin: PluginUIContext, initialPocket: number; }) {
    const [invalidInputMessage, setInvalidInputMessage] = React.useState<string>("");
    const [dockingScript, setDockingScript] = React.useState<string>("");

    const tasks: TaskTypeMenuItem[] = createTaskDefinitions({
        pockets: props.pockets,
        predictionInfo: props.predictionInfo,
        plugin: props.plugin,
        setInvalidInputMessage,
        setDockingScript
    });

    const [task, setTask] = React.useState<TaskTypeMenuItem>(tasks[0]);
    const [pocketRank, setPocketRank] = React.useState<number>(props.initialPocket);
    const [name, setName] = React.useState<string>("");
    const [parameters, setParameters] = React.useState<string[]>([]);
    const [forceUpdate, setForceUpdate] = React.useState<number>(0);

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
                            invalidInputMessage === "" ? null :
                                <tr>
                                    <td colSpan={2}>
                                        <Typography variant="body1" style={{ color: "red" }}>{invalidInputMessage}</Typography>
                                    </td>
                                </tr>
                        }
                        <tr>
                            <td>
                                <Button variant="contained" onClick={handleSubmitButton}>Create task</Button>
                                {dockingScript !== "" && <>&nbsp;<Button onClick={() => downloadDockingBashScript(dockingScript)} variant="contained" color="warning">Download the script</Button></>}
                            </td>
                            <td>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </Paper>
            &nbsp;
            <Paper>
                <Typography variant="h6" style={{ padding: 10 }}>Tasks</Typography>
                <TasksTable pocket={null} predictionInfo={props.predictionInfo} />
            </Paper>
        </div>
    );
}
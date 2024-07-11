import React, { useEffect } from "react";
import "../app.css";
import "./right-panel.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Model, DockingTaskProps } from "./types";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography, Button, Tooltip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { UpdateTrajectory } from "molstar/lib/mol-plugin-state/actions/structure";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { StateTransformer } from "molstar/lib/mol-state";
import { ModelFromTrajectory } from "molstar/lib/mol-plugin-state/transforms/model";

function Row(props: { row: Model; setModel: (model: number) => void; currentModel: number; }) {
    const { row, setModel, currentModel } = props;
    const [open, setOpen] = React.useState(false);

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                    &nbsp;
                    <button
                        type="button"
                        style={{
                            "display": "inline",
                            "padding": "0.25rem",
                            "backgroundColor": currentModel === row.number ? "#007bff" : "transparent",
                            "color": currentModel === row.number ? "#ffffff" : "#000000"
                        }}
                        title="Focus/highlight to this model."
                        className="btn btn-outline-secondary btnIcon"
                        onClick={() => setModel(row.number)}
                    >
                        <i className="bi bi-search" style={{ "display": "block", "fontSize": "small" }}></i>
                    </button>
                </TableCell>
                <TableCell align="center">{row.number}</TableCell>
                <TableCell align="right">{row.vinaResult[0]}</TableCell>
                <TableCell align="right">{row.vinaResult[1]}</TableCell>
                <TableCell align="right">{row.vinaResult[2]}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, whiteSpace: "pre-line" }}>
                            <pre>
                                {row.originalContent}
                            </pre>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export function DockingTaskRightPanel({ pdbqtModels, dp, plugin }: { pdbqtModels: Model[], dp: DockingTaskProps, plugin: PluginUIContext; }) {
    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([dp.content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `result-${new Date().toISOString()}.pdbqt`;
        document.body.appendChild(element); // Required for this to work in Firefox
        element.click();
    };

    const [model, setModel] = React.useState(1);
    const updating = React.useRef(false);

    useEffect(() => {
        const updateModel = async () => {
            if (plugin === undefined) {
                return;
            }

            updating.current = true;

            await PluginCommands.State.ApplyAction(plugin, {
                state: plugin.state.data,
                action: UpdateTrajectory.create({ action: 'reset' })
            });

            updating.current = false;

            await PluginCommands.State.ApplyAction(plugin, {
                state: plugin.state.data,
                action: UpdateTrajectory.create({ action: 'advance', by: model - 1 })
            });
        };

        if (updating.current) {
            return;
        }

        updateModel();
    }, [model]);

    useEffect(() => {
        if (plugin === undefined) {
            return;
        }

        plugin.state.data.events.changed.subscribe(() => {
            if (updating.current) {
                return;
            }

            const state = plugin.state.data;
            const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

            if (models.length < 2) {
                return;
            }

            const ligandModel = models[1];
            const idx = (ligandModel.transform.params! as StateTransformer.Params<ModelFromTrajectory>).modelIndex + 1;

            setModel(idx);
        });

    }, [plugin]);

    const tableLabels: { name: string, tooltip: string, align: "left" | "center" | "right"; }[] = [
        {
            name: "Rank",
            tooltip: "Rank of the Vina result",
            align: "center"
        },
        {
            name: "Energy (kcal/mol)",
            tooltip: "Predicted binding affinity",
            align: "right"
        },
        {
            name: "rmsd/lb (Å)",
            tooltip: "RMSD lower bound relative to the first model",
            align: "right"
        },
        {
            name: "rmsd/ub (Å)",
            tooltip: "RMSD upper bound relative to the first model",
            align: "right"
        }
    ];

    return (
        <>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            {tableLabels.map((cell) => (
                                <TableCell key={cell.name} align={cell.align}>
                                    {cell.tooltip === "" ?
                                        <span>{cell.name}</span> :
                                        <Tooltip title={cell.tooltip} placement="top">
                                            <span>{cell.name}</span>
                                        </Tooltip>
                                    }
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pdbqtModels.map((row) => (
                            <Row key={row.number + row.vinaResult.join(", ")} row={row} setModel={setModel} currentModel={model} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Button variant="contained" onClick={handleDownload} style={{ marginTop: "1em" }}>Download result</Button>
        </>
    );
}
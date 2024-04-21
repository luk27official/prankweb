import React, { useEffect } from "react";
import "../app.css";
import "./right-panel.css";
import { Model, DockingTaskProps } from "./types";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography, Button } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { UpdateTrajectory } from "molstar/lib/mol-plugin-state/actions/structure";

function Row(props: { row: Model; plugin: PluginUIContext; }) {
    const { row, plugin } = props;
    const [open, setOpen] = React.useState(false);
    const [model, setModel] = React.useState(1);

    useEffect(() => {
        const updateModel = async () => {
            if (plugin === undefined) {
                return;
            }

            await PluginCommands.State.ApplyAction(plugin, {
                state: plugin.state.data,
                action: UpdateTrajectory.create({ action: 'reset' })
            });

            await PluginCommands.State.ApplyAction(plugin, {
                state: plugin.state.data,
                action: UpdateTrajectory.create({ action: 'advance', by: model - 1 })
            });
        };

        updateModel();
    }, [model]);

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell align="center">{row.number}</TableCell>
                <TableCell align="right">{row.vinaResult[0]}</TableCell>
                <TableCell align="right">{row.vinaResult[1]}</TableCell>
                <TableCell align="right">{row.vinaResult[2]}</TableCell>
                <TableCell align="right"><a href="#" onClick={() => setModel(row.number)}>click</a></TableCell>
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

    return (
        <>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell align="center">Number</TableCell>
                            <TableCell align="right">Energy</TableCell>
                            <TableCell align="right">??</TableCell>
                            <TableCell align="right">??</TableCell>
                            <TableCell align="right">Show in Mol*</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pdbqtModels.map((row) => (
                            <Row key={row.number + row.vinaResult.join(", ")} row={row} plugin={plugin} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Button variant="contained" onClick={handleDownload}>Download result</Button>
        </>
    );
}
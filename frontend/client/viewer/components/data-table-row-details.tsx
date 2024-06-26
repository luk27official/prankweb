import * as React from 'react';
import Table from '@mui/material/Table';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { Button, Paper, TableBody } from '@mui/material';
import { PocketData } from "../../custom-types";
import { TasksTable } from "./tasks-table";
import { PredictionInfo } from "../../prankweb-api";

export default function DataTableRowDetails(props: { pocket: PocketData; setTab: (tab: number, initialPocket?: number) => void, predictionInfo: PredictionInfo; }) {
    const pocket = props.pocket;

    const handleCreateTask = () => {
        //the tab index is 2
        props.setTab(2, Number(props.pocket.rank));
    };

    type shownProperty = {
        name: string;
        value: any;
    };

    const shownProperties: shownProperty[] = [
        {
            name: "Rank",
            value: pocket.rank
        },
        {
            name: "Score",
            value: pocket.score
        },
        {
            name: "Probability",
            value: pocket.probability
        },
        {
            name: "Number of residues",
            value: pocket.residues.length
        },
    ];

    if (pocket.avgAlphaFold) shownProperties.push({
        name: "Average AlphaFold score",
        value: pocket.avgAlphaFold!
    });

    if (pocket.avgConservation) shownProperties.push({
        name: "Average conservation score",
        value: pocket.avgConservation!
    });

    return (
        <div>
            <Paper>
                <Table size="small">
                    <TableBody>
                        {shownProperties.map((property, index) =>
                            <TableRow key={index}>
                                <TableCell>{property.name}</TableCell>
                                <TableCell>{property.value}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
            &nbsp;
            <Paper>
                {/*<span style={{ padding: 10, paddingTop: 15, fontSize: "1.25rem", display: "block" }}>Tasks for pocket {pocket.rank}</span>*/}
                <TasksTable pocket={props.pocket} predictionInfo={props.predictionInfo} />
                <Button variant="outlined" onClick={handleCreateTask} style={{ margin: 10 }}>Create task</Button>
            </Paper>
        </div>
    );
}
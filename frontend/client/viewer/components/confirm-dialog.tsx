import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { ServerTaskLocalStorageData } from "../../custom-types";

export default function ConfirmDialog(props: { setOpenDialog: React.Dispatch<React.SetStateAction<boolean>>; callback: () => void; task: ServerTaskLocalStorageData; }) {
    const handleClose = () => {
        props.setOpenDialog(false);
    };

    const handleYes = () => {
        props.callback();
        handleClose();
    };

    return (
        <>
            <Dialog
                open={true}
                onClose={handleClose}
            >
                <DialogTitle id="alert-dialog-title">
                    {"Delete the selected task?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete the task with the following parameters?
                        <ul>
                            <li>Name: {props.task.name}</li>
                            <li>Timestamp: {props.task.created}</li>
                            <li>Pocket: {props.task.pocket}</li>
                        </ul>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleYes} autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
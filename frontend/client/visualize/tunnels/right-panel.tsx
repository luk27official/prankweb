import React from "react";
import { TunnelData, TunnelsTaskProps } from "./types";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography, Button, Tooltip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import "./right-panel.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { StateObjectSelector } from "molstar/lib/mol-state";

function TunnelRow(props: {
    tunnel: TunnelData;
    tunnelNumber: number;
    isVisible: boolean;
    handleToggle: (tunnelNumber: number) => void;
}) {
    const { tunnel, tunnelNumber, isVisible, handleToggle } = props;
    const [open, setOpen] = React.useState(false);

    // Calculate statistics
    const minRadius = Math.min(...tunnel.Profile.map(p => p.Radius));
    const maxRadius = Math.max(...tunnel.Profile.map(p => p.Radius));
    const avgRadius = tunnel.Profile.reduce((sum, p) => sum + p.Radius, 0) / tunnel.Profile.length;
    const length = tunnel.Profile[tunnel.Profile.length - 1].Distance;

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
                            "backgroundColor": isVisible ? "#007bff" : "transparent",
                            "color": isVisible ? "#ffffff" : "#000000"
                        }}
                        title="Toggle tunnel visibility"
                        className="btn btn-outline-secondary btnIcon"
                        onClick={() => handleToggle(tunnelNumber)}
                    >
                        {isVisible ? <i className="bi bi-check" style={{ "display": "block", "fontSize": "small" }}></i>
                            : <i className="bi bi-x" style={{ "display": "block", "fontSize": "small" }}></i>}
                    </button>
                </TableCell>
                <TableCell align="center">{tunnelNumber}</TableCell>
                <TableCell align="right">{length.toFixed(2)}</TableCell>
                <TableCell align="right">{minRadius.toFixed(2)}</TableCell>
                <TableCell align="right">{avgRadius.toFixed(2)}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="subtitle2" gutterBottom component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Tunnel Details
                            </Typography>

                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <Tooltip title="Classification of the tunnel (e.g., Tunnel, Path, or Pore)" arrow placement="left">
                                                <TableCell sx={{ fontWeight: 'medium', width: '40%' }}>Type</TableCell>
                                            </Tooltip>
                                            <TableCell>{tunnel.Type}</TableCell>
                                        </TableRow>
                                        {tunnel.Fingerprint && (
                                            <TableRow>
                                                <Tooltip title="Unique identifier describing the tunnel's path through the structure" arrow placement="left">
                                                    <TableCell sx={{ fontWeight: 'medium' }}>Fingerprint</TableCell>
                                                </Tooltip>
                                                <TableCell>{tunnel.Fingerprint}</TableCell>
                                            </TableRow>
                                        )}
                                        {tunnel.Cavity && (
                                            <TableRow>
                                                <Tooltip title="Internal cavity connected to this tunnel" arrow placement="left">
                                                    <TableCell sx={{ fontWeight: 'medium' }}>Cavity</TableCell>
                                                </Tooltip>
                                                <TableCell>{tunnel.Cavity}</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <Tooltip title="Number of points sampled along the tunnel centerline" arrow placement="left">
                                                <TableCell sx={{ fontWeight: 'medium' }}>Profile Points</TableCell>
                                            </Tooltip>
                                            <TableCell>{tunnel.Profile.length}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <Tooltip title="Maximum radius found along the tunnel - widest point" arrow placement="left">
                                                <TableCell sx={{ fontWeight: 'medium' }}>Max Radius</TableCell>
                                            </Tooltip>
                                            <TableCell>{maxRadius.toFixed(2)} Å</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {tunnel.Properties && (
                                <>
                                    <Typography variant="subtitle2" gutterBottom component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                                        Chemical Properties
                                    </Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableBody>
                                                {tunnel.Properties.Charge !== undefined && (
                                                    <TableRow>
                                                        <Tooltip title="Net electrostatic charge of residues lining the tunnel" arrow placement="left">
                                                            <TableCell sx={{ fontWeight: 'medium', width: '40%' }}>Charge</TableCell>
                                                        </Tooltip>
                                                        <TableCell>{tunnel.Properties.Charge}</TableCell>
                                                    </TableRow>
                                                )}
                                                {tunnel.Properties.Hydrophobicity !== undefined && (
                                                    <TableRow>
                                                        <Tooltip title="Measure of water-repelling character - higher values indicate more hydrophobic tunnels" arrow placement="left">
                                                            <TableCell sx={{ fontWeight: 'medium' }}>Hydrophobicity</TableCell>
                                                        </Tooltip>
                                                        <TableCell>{tunnel.Properties.Hydrophobicity.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {tunnel.Properties.Hydropathy !== undefined && (
                                                    <TableRow>
                                                        <Tooltip title="Combined measure of hydrophobic and hydrophilic character of the tunnel lining" arrow placement="left">
                                                            <TableCell sx={{ fontWeight: 'medium' }}>Hydropathy</TableCell>
                                                        </Tooltip>
                                                        <TableCell>{tunnel.Properties.Hydropathy.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {tunnel.Properties.Polarity !== undefined && (
                                                    <TableRow>
                                                        <Tooltip title="Proportion of polar (charged) residues lining the tunnel" arrow placement="left">
                                                            <TableCell sx={{ fontWeight: 'medium' }}>Polarity</TableCell>
                                                        </Tooltip>
                                                        <TableCell>{tunnel.Properties.Polarity.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {tunnel.Properties.Mutability !== undefined && (
                                                    <TableRow>
                                                        <Tooltip title="Average evolutionary conservation score - lower values indicate more conserved residues" arrow placement="left">
                                                            <TableCell sx={{ fontWeight: 'medium' }}>Mutability</TableCell>
                                                        </Tooltip>
                                                        <TableCell>{tunnel.Properties.Mutability}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export function TunnelsTaskRightPanel({ tunnelsData, visibleTunnels, toggleTunnel, tp, plugin, tunnelRepresentations }: {
    tunnelsData: TunnelData[];
    visibleTunnels: number[];
    toggleTunnel: (tunnelNumber: number) => void;
    tp: TunnelsTaskProps;
    plugin: PluginUIContext;
    tunnelRepresentations: StateObjectSelector[];
}) {
    if (tunnelsData.length === 0) {
        return (
            <div style={{ padding: "20px" }}>
                <Typography variant="h6">No tunnels found</Typography>
                <Typography variant="body2">
                    MOLE did not find any tunnels in this structure.
                </Typography>
            </div>
        );
    }

    const handleResultDownload = () => {
        const link = document.createElement('a');
        link.href = `./api/v2/tunnels/${tp.database}/${tp.id}/${tp.hash}/public/results.zip`;
        link.download = `tunnels-results-${new Date().toISOString()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDataJsonDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(tp.dataJson, null, 2)], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `tunnels-data-${new Date().toISOString()}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div style={{ overflowY: "auto", maxHeight: "80vh", padding: "10px" }}>
            <Typography variant="h6" gutterBottom>
                Tunnels ({tunnelsData.length} found)
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <Tooltip title="Tunnel identifier" arrow>
                                <TableCell align="center">ID</TableCell>
                            </Tooltip>
                            <Tooltip title="Total length of the tunnel from start to end point" arrow>
                                <TableCell align="right">Length (Å)</TableCell>
                            </Tooltip>
                            <Tooltip title="Minimum radius along the tunnel profile - indicates the bottleneck" arrow>
                                <TableCell align="right">Min R (Å)</TableCell>
                            </Tooltip>
                            <Tooltip title="Average radius along the tunnel profile" arrow>
                                <TableCell align="right">Avg R (Å)</TableCell>
                            </Tooltip>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tunnelsData.map((tunnel, index) => (
                            <TunnelRow
                                key={tunnel.Id}
                                tunnel={tunnel}
                                tunnelNumber={index + 1}
                                isVisible={visibleTunnels.includes(index + 1)}
                                handleToggle={toggleTunnel}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                    variant="outlined"
                    onClick={handleResultDownload}
                    startIcon={<i className="bi bi-download"></i>}
                >
                    Download Results (ZIP)
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleDataJsonDownload}
                    startIcon={<i className="bi bi-file-earmark-code"></i>}
                >
                    Download Data (JSON)
                </Button>
            </Box>
        </div>
    );
}

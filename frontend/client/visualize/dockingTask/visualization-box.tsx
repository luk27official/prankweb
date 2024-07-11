import React from "react";
import { PocketData, PocketsViewType, PolymerViewType } from "../../custom-types";
import { FormControl, FormHelperText, MenuItem, Select, Button } from "@mui/material";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { updatePolymerView, focusOnSecondLoadedStructure, focusOnPocket } from "../../viewer/molstar-visualise";
import "../app.css";
import "../../viewer/components/visualization-tool-box.css";

export function DockingTaskVisualizationBox({ plugin, changePocketsView, pocket }: { plugin: PluginUIContext; changePocketsView: (pocketsView: PocketsViewType) => void; pocket: PocketData | undefined; }) {
    const [polymerView, setPolymerView] = React.useState<PolymerViewType>(PolymerViewType.Gaussian_Surface);
    const [pocketsView, setPocketsView] = React.useState<PocketsViewType>(PocketsViewType.Surface_Atoms_Color);

    const changePolymerView = (polymerView: PolymerViewType) => {
        setPolymerView(polymerView);
        updatePolymerView(polymerView, plugin!, false);
    };

    const changePocketsViewLocal = (pocketsView: PocketsViewType) => {
        setPocketsView(pocketsView);
        changePocketsView(pocketsView);
    };

    const focusPocket = () => {
        if (!pocket) return;
        focusOnPocket(plugin, pocket);
    };

    const focusLigand = () => {
        // Focus on the ligand with extra radius of 7 Å.
        focusOnSecondLoadedStructure(plugin, 7);
    };

    const resetCamera = () => {
        plugin.canvas3d?.requestCameraReset();
    };

    return (
        <>
            <div id="molstar-wrapper" style={{ width: "100%", position: "relative", height: "75vh" }}></div>
            <div className="visualization-toolbox-container" id="visualization-toolbox">
                <div className="visualization-toolbox-row">
                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Select
                                    labelId="protein-select-label"
                                    id="protein-select"
                                    value={polymerView}
                                    onChange={(event) => changePolymerView(event.target.value as PolymerViewType)}
                                    className="visualization-toolbox-select"
                                >
                                    <MenuItem value={PolymerViewType.Atoms}>Balls and Sticks</MenuItem>
                                    <MenuItem value={PolymerViewType.Gaussian_Surface}>Surface</MenuItem>
                                    <MenuItem value={PolymerViewType.Cartoon}>Cartoon</MenuItem>
                                </Select>
                                <FormHelperText sx={{ textAlign: "center" }}>Protein visualization</FormHelperText>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Select
                                    labelId="pockets-select-label"
                                    id="pockets-select"
                                    value={pocketsView}
                                    onChange={(event) => changePocketsViewLocal(event.target.value as PocketsViewType)}
                                    className="visualization-toolbox-select"
                                >
                                    <MenuItem value={PocketsViewType.Ball_Stick_Atoms_Color}>Balls and Sticks (atoms)</MenuItem>
                                    <MenuItem value={PocketsViewType.Ball_Stick_Residues_Color}>Balls and Sticks (residues)</MenuItem>
                                    <MenuItem value={PocketsViewType.Surface_Atoms_Color}>Surface (atoms)</MenuItem>
                                    <MenuItem value={PocketsViewType.Surface_Residues_Color}>Surface (residues)</MenuItem>
                                </Select>
                                <FormHelperText sx={{ textAlign: "center" }}>Pocket visualization</FormHelperText>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">

                        </div>
                    </div>
                </div>
                <div className="visualization-toolbox-row">
                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Button variant="outlined" onClick={() => focusPocket()}>Focus pocket</Button>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Button variant="outlined" onClick={() => focusLigand()}>Focus ligand</Button>
                            </FormControl>
                        </div>
                    </div>

                    <div className="visualization-toolbox-option">
                        <div className="visualization-toolbox-option-description">
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Button variant="outlined" onClick={() => resetCamera()}>Reset camera</Button>
                            </FormControl>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
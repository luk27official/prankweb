import React from "react";
import { PocketData, PocketsViewType, PolymerRepresentation, PolymerViewType } from "../../custom-types";
import { FormControl, FormHelperText, MenuItem, Select, Button, Slider, Tooltip } from "@mui/material";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { updatePolymerView, focusOnSecondLoadedStructure, focusOnPocket, setStructureTransparency } from "../../viewer/molstar-visualise";
import "../../viewer/components/visualization-tool-box.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export function DockingTaskVisualizationBox({ plugin, changePocketsView, pocket, changeBoundingBoxRefs, polymerRepresentations }: {
    plugin: PluginUIContext;
    changePocketsView: (pocketsView: PocketsViewType) => void;
    pocket: PocketData | undefined;
    changeBoundingBoxRefs: () => void;
    polymerRepresentations: PolymerRepresentation[];
}) {
    const [polymerView, setPolymerView] = React.useState<PolymerViewType>(PolymerViewType.Cartoon);
    const [pocketsView, setPocketsView] = React.useState<PocketsViewType>(PocketsViewType.Ball_Stick_Residues_Color);

    const changePolymerView = (polymerView: PolymerViewType) => {
        setPolymerView(polymerView);
        updatePolymerView(polymerView, plugin!, polymerRepresentations, [], false);
    };

    const changePocketsViewLocal = (pocketsView: PocketsViewType) => {
        setPocketsView(pocketsView);
        changePocketsView(pocketsView);
    };

    const toggleBoundingBox = () => {
        changeBoundingBoxRefs();
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

    const tooltipText = `Ligands shown in blue color are a part of the loaded structure.\nLigands colored by element symbols are the docked ligands.\n\nNote that the bounding box does not represent the actual bounding box size and is shown for reference only.`;

    return (
        <>
            <div id="molstar-wrapper" style={{ width: "100%", position: "relative", height: "74vh" }}></div>
            <div id="visualization-tooltip">
                <Tooltip title={<span style={{ fontSize: "1.5em", whiteSpace: "pre-wrap" }}>{tooltipText}</span>} placement="left-end">
                    <i className="bi bi-info-circle" style={{ "display": "block", zIndex: "1", position: "absolute", left: "62.5%", top: "76.5vh" }}></i>
                </Tooltip>
            </div>
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
                            <FormControl size="small" className="visualization-toolbox-formcontrol">
                                <Button variant="outlined" onClick={() => toggleBoundingBox()}>Toggle bounding box</Button>
                            </FormControl>
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
                <div className="visualization-toolbox-row">
                    <Slider size="small"
                        defaultValue={50}
                        aria-label="Structure opacity"
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                        onChange={(event, value) => {
                            setStructureTransparency(plugin, 1 - (value as number / 100), polymerRepresentations);
                        }}
                    />
                </div>
            </div>
        </>
    );
}
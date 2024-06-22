import React from "react";
import { PocketsViewType, PolymerViewType } from "../../custom-types";
import { FormControl, FormHelperText, MenuItem, Select, Button } from "@mui/material";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { updatePolymerView, focusOnSecondLoadedStructure } from "../../viewer/molstar-visualise";
import "../app.css";

export function DockingTaskVisualizationBox({ plugin, changePocketsView }: { plugin: PluginUIContext; changePocketsView: (pocketsView: PocketsViewType) => void; }) {
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

    const focusLigand = () => {
        focusOnSecondLoadedStructure(plugin);
    };

    return (
        <>
            <div id="molstar-wrapper" style={{ width: "100%", position: "relative", height: "70vh" }}></div>
            <div>
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
                <FormControl size="small" className="visualization-toolbox-formcontrol">
                    <Button variant="contained" onClick={() => focusLigand()}>Focus</Button>
                </FormControl>
            </div>
        </>
    );
}
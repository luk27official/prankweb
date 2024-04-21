import React from "react";
import { PolymerViewType } from "../../custom-types";
import { FormControl, FormHelperText, MenuItem, Select } from "@mui/material";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { updatePolymerView } from "../../viewer/molstar-visualise";
import "../app.css";

export function DockingTaskVisualizationBox({ plugin }: { plugin: PluginUIContext; }) {
    const [polymerView, setPolymerView] = React.useState<PolymerViewType>(PolymerViewType.Gaussian_Surface);

    const changePolymerView = (polymerView: PolymerViewType) => {
        setPolymerView(polymerView);
        updatePolymerView(polymerView, plugin!, false);
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
            </div>
        </>
    );
}
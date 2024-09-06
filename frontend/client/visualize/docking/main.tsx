import React, { useEffect } from "react";

import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { createBoundingBoxForPocket, createPocketsGroupFromJson, loadStructureIntoMolstar, setStructureTransparency, showPocketInCurrentRepresentation, updatePolymerView } from "../../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { getApiEndpoint } from "../../prankweb-api";
import { Model, DockingTaskProps } from "./types";
import parsePdbqt from "./pdbqt-parser";

import { DockingTaskVisualizationBox } from "./visualization-box";
import { DockingTaskRightPanel } from "./right-panel";
import { StateObjectSelector } from "molstar/lib/mol-state";
import { PocketData, PocketsViewType, PolymerViewType, PredictionData } from "../../custom-types";
import { Color } from "molstar/lib/mol-util/color";
import { setSubtreeVisibility } from "molstar/lib/mol-plugin/behavior/static/state";

export function DockingTask(dp: DockingTaskProps) {
    const [plugin, setPlugin] = React.useState<PluginUIContext | undefined>(undefined);
    const [pdbqtModels, setPdbqtModels] = React.useState<Model[]>([]);
    const [pocketRank, setPocketRank] = React.useState<string>("");
    const [prediction, setPrediction] = React.useState<PredictionData | undefined>(undefined);
    const [ligandRepresentations, setLigandRepresentations] = React.useState<StateObjectSelector[]>([]);

    // this is a hook that runs when the component is mounted
    useEffect(() => {
        const loadPlugin = async (parsedModels: Model[]) => {
            const plugin: PluginUIContext = await createMolstarViewer();
            setPlugin(plugin);

            // if the plugin is maximized, hide the React components
            plugin.layout.events.updated.subscribe(() => {
                const contentWrapper = document.getElementById('content-wrapper')!;
                const visualizationToolbox = document.getElementById('visualization-toolbox')!;
                const tooltip = document.getElementById('visualization-tooltip')!;

                contentWrapper.style.display = plugin.layout.state.isExpanded ? "none" : "block";
                visualizationToolbox.style.display = plugin.layout.state.isExpanded ? "none" : "block";
                tooltip.style.display = plugin.layout.state.isExpanded ? "none" : "block";
            });

            const baseUrl: string = getApiEndpoint(dp.database, dp.id) + "/public";
            // Download pdb/mmcif and create a model in Mol*.
            const molData = await loadStructureIntoMolstar(plugin, `${baseUrl}/${dp.structureName}`, 1, "0x0000ff").then(result => result);
            updatePolymerView(PolymerViewType.Cartoon, plugin, false);
            setStructureTransparency(plugin, 0.5);
            // Load the docked ligand into Mol*.
            const ligandData = await loadLigandIntoMolstar(plugin, dp.ligandPDBQT, parsedModels);
            setLigandRepresentations(ligandData);

            // Add the pocket representations.
            // First, we have to download the prediction file.
            const prediction: PredictionData = await fetch(`${baseUrl}/prediction.json`).then(res => res.json()).catch(err => console.log(err));
            setPrediction(prediction);

            // Then, download information about the docking tasks.
            const secondUrl: string = getApiEndpoint(dp.database, dp.id, "docking");
            const dockingTasks = await fetch(`${secondUrl}/tasks`).then(res => res.json()).catch(err => console.log(err));

            const builder = plugin.state.data.build();
            const structure: StateObjectSelector = molData[1];

            // Find the pocket rank that we are interested in.
            let pocketRank: string | undefined = undefined;
            dockingTasks["tasks"].forEach((task: any) => {
                if (task["initialData"]["hash"] === dp.hash) {
                    pocketRank = task["initialData"]["pocket"];
                    return;
                }
            });
            setPocketRank(pocketRank!);

            const pocket = prediction.pockets.find((pocket: PocketData) => pocket.rank === pocketRank);
            if (!pocket) return;
            pocket.color = "c7c7c7";
            await createPocketsGroupFromJson(plugin, structure, "Pockets", prediction, 1, false);
            await builder.commit();
            await createBoundingBoxForPocket(plugin, pocket);

            prediction.pockets.forEach((pocket: PocketData, idx: number) => {
                showPocketInCurrentRepresentation(plugin, PocketsViewType.Ball_Stick_Residues_Color, idx, pocket.rank === pocketRank);
            });
        };
        // Parse the PDBQT content and store the models.
        if (dp.ligandPDBQT === "Error") {
            return;
        }
        const parsedModels = parsePdbqt(dp.ligandPDBQT);
        setPdbqtModels(parsedModels);

        loadPlugin(parsedModels);
    }, []);

    const changePocketsView = (pocketsView: PocketsViewType) => {
        if (plugin === undefined || prediction === undefined) {
            return;
        }

        prediction.pockets.forEach((pocket: PocketData, idx: number) => {
            showPocketInCurrentRepresentation(plugin, pocketsView, idx, pocket.rank === pocketRank);
        });
    };

    if (dp.ligandPDBQT === "Error") {
        return <div>
            <h1>Error</h1>
            <p>There was an error while fetching the ligand data. Try again later.</p>
        </div>;
    }

    return <div style={{ display: "flex" }}>
        <div style={{ width: "50%", margin: "5px" }}>
            <DockingTaskVisualizationBox plugin={plugin!} changePocketsView={changePocketsView} pocket={prediction?.pockets.find((p: PocketData) => p.rank === pocketRank)} />
        </div>
        <div id="content-wrapper" style={{ width: "50%", margin: "5px" }}>
            <DockingTaskRightPanel pdbqtModels={pdbqtModels} dp={dp} plugin={plugin!} ligandRepresentations={ligandRepresentations} />
        </div>
    </div>;
}

async function loadLigandIntoMolstar(plugin: PluginUIContext | undefined, dockedMolecule: any, pdbqtModels: Model[]) {
    if (dockedMolecule === undefined || plugin === undefined) {
        return [];
    }

    const representations: StateObjectSelector[] = [];
    const ligandData = await plugin.builders.data.rawData({ data: dockedMolecule });
    const trajectory = await plugin.builders.structure.parseTrajectory(ligandData, "pdbqt");
    // create a model for each model in the pdbqt file
    pdbqtModels.forEach(async (model: Model, idx: number) => {
        const mdl = await plugin.builders.structure.createModel(trajectory, { modelIndex: idx });
        const structure = await plugin.builders.structure.createStructure(mdl, { name: 'model', params: {} });
        const representation = await plugin.builders.structure.representation.addRepresentation(structure, {
            type: 'ball-and-stick',
            color: 'uniform',
            colorParams: { value: Color(0xff00ff) },
        });

        // hide the ligands, keep just the first model visible
        if (idx > 0) {
            setSubtreeVisibility(plugin!.state.data, representation.ref, true);
        }

        representations.push(representation);
    });

    return representations;
}

async function createMolstarViewer() {
    const wrapper = document.getElementById('molstar-wrapper')!;
    const MolstarPlugin = await createPluginUI(
        {
            target: wrapper,
            render: renderReact18,
            spec: {
                ...DefaultPluginUISpec(),
                layout: {
                    initial: {
                        isExpanded: false,
                        showControls: true,
                        controlsDisplay: "reactive",
                        regionState: {
                            top: "hidden",    //sequence
                            left: (window.innerWidth > 1200) ? "collapsed" : "hidden",
                            //tree with some components, hide for small and medium screens
                            bottom: "hidden", //shows log information
                            right: "hidden"   //structure tools
                        }
                    }
                },
                components: {
                    remoteState: 'none'
                }
            }
        });

    return MolstarPlugin;
}

export async function getDockingTaskContent(id: string, database: string, hash: string, structureName: string): Promise<DockingTaskProps> {
    const apiEndpoint = getApiEndpoint(database, id, "docking");
    const response = await fetch(`${apiEndpoint}/${hash}/public/out_vina.pdbqt`).then(res => res.text()).catch(err => console.log(err));

    if (response === undefined) {
        return { ligandPDBQT: "Error", hash: hash, id: id, database: database, structureName: structureName };
    }

    return { ligandPDBQT: response, hash: hash, id: id, database: database, structureName: structureName };
}
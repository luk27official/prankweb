import React, { useEffect } from "react";

import "./app.css";
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { createLigandRepresentations, loadStructureIntoMolstar } from "../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { getApiEndpoint } from "../prankweb-api";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { UpdateTrajectory } from "molstar/lib/mol-plugin-state/actions/structure";

export interface DockingTaskProps {
    content: string;
    database: string;
    id: string;
    hash: string;
    structureName: string;
}

let dockedMolecule: any; // to be able to access the docked molecule from here and avoid multiple fetches

export function DockingType(dp: DockingTaskProps) {
    const [plugin, setPlugin] = React.useState<PluginUIContext | undefined>(undefined);
    const [model, setModel] = React.useState<number>(1);

    // this is a hook that runs when the component is mounted
    useEffect(() => {
        const loadPlugin = async () => {
            const plugin: PluginUIContext = await createMolstarViewer();
            setPlugin(plugin);

            const baseUrl: string = getApiEndpoint(dp.database, dp.id) + "/public";
            // Download pdb/mmcif and create a model in Mol*.
            const molData = await loadStructureIntoMolstar(plugin, `${baseUrl}/${dp.structureName}`).then(result => result);
            // Load the docked ligand into Mol*.
            const ligandData = await loadLigandIntoMolstar(plugin, dockedMolecule);
        };
        loadPlugin();
    }, []);

    useEffect(() => {
        // TODO: fix the "model" counter - not needed now, but the number should correspond
        const updateModel = async () => {
            if (plugin === undefined) {
                return;
            }

            PluginCommands.State.ApplyAction(plugin, {
                state: plugin.state.data,
                action: UpdateTrajectory.create({ action: 'advance', by: 1 })
            });
        };

        updateModel();
    }, [model]);

    return <div style={{ display: "flex" }}>
        <div style={{ width: "50%", margin: "5px" }}>
            <h3>Docking Task</h3>
            <div id="molstar-wrapper" style={{ width: "100%", position: "relative", height: "50vh" }}></div>
        </div>
        <div id="content-wrapper" style={{ width: "50%", margin: "5px" }}>
            <div><button onClick={() => setModel(model + 1)}>Change model</button></div>
            <div><pre>{dp.content}</pre></div>
        </div>
    </div>;
}

async function loadLigandIntoMolstar(plugin: PluginUIContext | undefined, dockedMolecule: any) {
    if (dockedMolecule === undefined || plugin === undefined) {
        return;
    }

    const ligandData = await plugin.builders.data.rawData({ data: dockedMolecule });
    const trajectory = await plugin.builders.structure.parseTrajectory(ligandData, "pdbqt");
    const model = await plugin.builders.structure.createModel(trajectory);
    const structure = await plugin.builders.structure.createStructure(model, { name: 'model', params: {} });

    await createLigandRepresentations(plugin, structure);

    return [model, structure];
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

export async function getDockingTaskContent(type: string, id: string, database: string, hash: string, structureName: string): Promise<DockingTaskProps> {
    const response = await fetch(`./api/v2/docking/${database}/${id}/public/out_vina.pdbqt`, {
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "hash": hash
        })
    }).then(res => res.text()).catch(err => console.log(err));

    if (response === undefined) {
        return { content: "Error", hash: hash, id: id, database: database, structureName: structureName };
    }

    dockedMolecule = response;

    return { content: response, hash: hash, id: id, database: database, structureName: structureName };
}
import React, { useEffect } from "react";

import "./app.css";
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { loadStructureIntoMolstar } from "../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { getApiEndpoint } from "../prankweb-api";

export interface DockingTaskProps {
    content: string;
    database: string;
    id: string;
    hash: string;
    structureName: string;
}

export function DockingType(dp: DockingTaskProps) {
    // this is a hook that runs when the component is mounted
    useEffect(() => {
        const loadPlugin = async () => {
            const plugin: PluginUIContext = await createMolstarViewer();

            const baseUrl: string = getApiEndpoint(dp.database, dp.id) + "/public";
            // Download pdb/mmcif and create a model in Mol*.
            const molData = await loadStructureIntoMolstar(plugin, `${baseUrl}/${dp.structureName}`).then(result => result);
        };
        loadPlugin();
    }, []);

    return <div style={{ display: "flex" }}>
        <div style={{ width: "50%", margin: "5px" }}>
            <h3>Docking Task</h3>
            <div id="molstar-wrapper" style={{ width: "100%", position: "relative", height: "50vh" }}></div>
        </div>
        <div id="content-wrapper" style={{ width: "50%", margin: "5px" }}><pre>{dp.content}</pre></div>
    </div>;
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

    return { content: response, hash: hash, id: id, database: database, structureName: structureName };
}